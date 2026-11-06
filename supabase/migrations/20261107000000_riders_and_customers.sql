-- Migration: complete rider onboarding data (area, guarantor, payout account), real rider
-- delivery flow (online status, pickup step, resume, history), and customer accounts
-- (orders tied to the shopper's account, saved addresses, order tracking).
-- Date: 2026-11-07

-- ============================================================================
-- 1. RIDER FIELDS
-- ============================================================================
alter table public.riders
  add column if not exists corridor text,
  add column if not exists guarantor_name text,
  add column if not exists guarantor_phone text,
  add column if not exists is_online boolean not null default false,
  add column if not exists online_changed_at timestamptz;

create table if not exists public.rider_payout_accounts (
  rider_id uuid primary key references public.riders(id) on delete cascade,
  bank_name text not null,
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  account_name text not null,
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.rider_payout_accounts enable row level security;
revoke all on public.rider_payout_accounts from anon, authenticated;
grant select on public.rider_payout_accounts to authenticated;

drop policy if exists "rider_payout_accounts_select_own" on public.rider_payout_accounts;
create policy "rider_payout_accounts_select_own" on public.rider_payout_accounts for select to authenticated
  using (rider_id in (select r.id from public.riders r where r.user_id = auth.uid())
         or public.is_platform_admin());

-- The payout account is only ever written through this function (resets verification).
create or replace function public.save_rider_payout_account(
  p_bank_name text,
  p_account_number text,
  p_account_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_bank text := nullif(trim(coalesce(p_bank_name, '')), '');
  v_number text := nullif(trim(coalesce(p_account_number, '')), '');
  v_name text := nullif(trim(coalesce(p_account_name, '')), '');
begin
  select * into v_rider from public.riders where user_id = auth.uid();
  if not found then
    raise exception 'Complete your rider details first';
  end if;
  if v_bank is null then raise exception 'Choose your bank'; end if;
  if v_number is null or v_number !~ '^[0-9]{10}$' then
    raise exception 'Enter your 10-digit account number';
  end if;
  if v_name is null or length(v_name) < 3 then
    raise exception 'Enter the account name exactly as your bank shows it';
  end if;

  insert into public.rider_payout_accounts (rider_id, bank_name, account_number, account_name, verified)
  values (v_rider.id, v_bank, v_number, v_name, false)
  on conflict (rider_id) do update
    set bank_name = excluded.bank_name, account_number = excluded.account_number,
        account_name = excluded.account_name, verified = false, updated_at = now();

  return jsonb_build_object('bankName', v_bank, 'accountNumber', v_number, 'accountName', v_name, 'verified', false);
end;
$$;

revoke all on function public.save_rider_payout_account(text, text, text) from public, anon;
grant execute on function public.save_rider_payout_account(text, text, text) to authenticated;

-- Onboarding now also collects service area, a guarantor and the payout account.
drop function if exists public.provision_rider(
  date, public.vehicle_type, text, text, text, date, text, text, text, text, text
);

create or replace function public.provision_rider(
  p_date_of_birth date,
  p_vehicle_type public.vehicle_type,
  p_vehicle_make_model text,
  p_vehicle_plate_number text,
  p_drivers_license_number text,
  p_drivers_license_expiry date,
  p_state text,
  p_city text,
  p_base_address text,
  p_next_of_kin_name text,
  p_next_of_kin_phone text,
  p_corridor text,
  p_guarantor_name text,
  p_guarantor_phone text,
  p_payout_bank text,
  p_payout_account text,
  p_payout_account_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rider public.riders%rowtype;
  v_license text := nullif(trim(coalesce(p_drivers_license_number, '')), '');
  v_min_dob date := (current_date - interval '18 years')::date;
  v_corridor text := nullif(trim(coalesce(p_corridor, '')), '');
  v_g_name text := nullif(trim(coalesce(p_guarantor_name, '')), '');
  v_g_phone text := nullif(trim(coalesce(p_guarantor_phone, '')), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Profile not found';
  end if;
  if exists (select 1 from public.riders r where r.user_id = v_user_id) then
    raise exception 'You already have a rider profile';
  end if;
  if p_date_of_birth is null or p_date_of_birth > v_min_dob then
    raise exception 'You must be at least 18 years old to ride with us';
  end if;
  if p_vehicle_type <> 'bicycle' and (v_license is null or length(v_license) < 5) then
    raise exception 'Enter a valid licence number for your vehicle';
  end if;
  if coalesce(trim(p_base_address), '') = '' then
    raise exception 'Enter your base address or pickup area';
  end if;
  if v_corridor is null then
    raise exception 'Choose the area you will deliver in';
  end if;
  if v_g_name is null or v_g_phone is null or v_g_phone !~ '^[+0-9 ()-]{7,20}$' then
    raise exception 'Enter your guarantor''s name and phone number';
  end if;

  insert into public.riders (
    user_id, date_of_birth, vehicle_type, vehicle_make_model, vehicle_plate_number,
    drivers_license_number, drivers_license_expiry, state, city, base_address,
    next_of_kin_name, next_of_kin_phone, corridor, guarantor_name, guarantor_phone,
    onboarding_status, onboarding_step
  )
  values (
    v_user_id, p_date_of_birth, p_vehicle_type,
    nullif(trim(coalesce(p_vehicle_make_model, '')), ''),
    nullif(trim(coalesce(p_vehicle_plate_number, '')), ''),
    case when p_vehicle_type = 'bicycle' then null else v_license end,
    case when p_vehicle_type = 'bicycle' then null else p_drivers_license_expiry end,
    nullif(trim(coalesce(p_state, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    trim(p_base_address),
    nullif(trim(coalesce(p_next_of_kin_name, '')), ''),
    nullif(trim(coalesce(p_next_of_kin_phone, '')), ''),
    v_corridor, v_g_name, v_g_phone,
    'complete', 5
  )
  returning * into v_rider;

  insert into public.rider_kyc_submissions (rider_id, status) values (v_rider.id, 'not_started');

  -- validates the account and stores it unverified
  perform public.save_rider_payout_account(p_payout_bank, p_payout_account, p_payout_account_name);

  return jsonb_build_object('id', v_rider.id, 'onboarding_status', v_rider.onboarding_status);
end;
$$;

revoke all on function public.provision_rider(
  date, public.vehicle_type, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.provision_rider(
  date, public.vehicle_type, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;

-- ============================================================================
-- 2. ORDERS TIED TO THE SHOPPER'S ACCOUNT + DELIVERY MILESTONES
-- ============================================================================
alter table public.store_orders
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null,
  add column if not exists dispatched_at timestamptz,
  add column if not exists picked_up_at timestamptz,
  add column if not exists delivered_at timestamptz;

create index if not exists idx_store_orders_customer on public.store_orders (customer_user_id, created_at desc);

create or replace function public.track_order_status_times()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'dispatched' and old.status is distinct from 'dispatched' then
    new.dispatched_at := coalesce(new.dispatched_at, now());
  end if;
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    new.delivered_at := coalesce(new.delivered_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_track_order_status_times on public.store_orders;
create trigger trg_track_order_status_times before update on public.store_orders
  for each row execute function public.track_order_status_times();

-- ============================================================================
-- 3. CUSTOMER ADDRESSES
-- ============================================================================
create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home' check (length(label) between 1 and 40),
  recipient_name text check (recipient_name is null or length(recipient_name) <= 120),
  phone text check (phone is null or phone ~ '^[+0-9 ()-]{7,20}$'),
  address text not null check (length(trim(address)) between 5 and 300),
  city text,
  state text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_addresses_user on public.customer_addresses (user_id);

alter table public.customer_addresses enable row level security;
revoke all on public.customer_addresses from anon, authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;

drop policy if exists "customer_addresses_own" on public.customer_addresses;
create policy "customer_addresses_own" on public.customer_addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- keep one default per person, and cap how many addresses can be saved
create or replace function public.customer_address_rules()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and (select count(*) from public.customer_addresses where user_id = new.user_id) >= 10 then
    raise exception 'You can save up to 10 addresses';
  end if;
  if new.is_default then
    update public.customer_addresses set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_customer_address_rules on public.customer_addresses;
create trigger trg_customer_address_rules before insert or update on public.customer_addresses
  for each row execute function public.customer_address_rules();

-- ============================================================================
-- 4. CUSTOMER ORDER HISTORY + TRACKING
-- ============================================================================
create or replace function public.my_orders(p_limit integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in to see your orders';
  end if;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select o.created_at, jsonb_build_object(
      'id', o.id,
      'storeName', t.trading_name,
      'storeSlug', t.slug,
      'status', o.status,
      'paymentStatus', o.payment_status,
      'paymentMethod', o.payment_method,
      'fulfillmentType', o.fulfillment_type,
      'total', o.total,
      'itemsSummary', o.items_summary,
      'riderAssigned', o.rider_id is not null,
      'createdAt', o.created_at
    ) as j
    from public.store_orders o
    join public.tenants t on t.id = o.tenant_id
    where o.customer_user_id = auth.uid()
    order by o.created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) x;

  return v_rows;
end;
$$;

create or replace function public.my_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o public.store_orders%rowtype;
  v_t public.tenants%rowtype;
  v_items jsonb;
  v_rider jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in to see your order';
  end if;

  select * into v_o from public.store_orders where id = p_order_id and customer_user_id = auth.uid();
  if not found then
    raise exception 'Order not found';
  end if;
  select * into v_t from public.tenants where id = v_o.tenant_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'name', i.product_name, 'quantity', i.quantity, 'unitPrice', i.unit_price, 'lineTotal', i.line_total
  ) order by i.created_at), '[]'::jsonb)
  into v_items
  from public.order_items i where i.order_id = v_o.id;

  select jsonb_build_object('name', split_part(p.full_name, ' ', 1), 'phone', p.phone,
                            'vehicleType', r.vehicle_type, 'plate', r.vehicle_plate_number)
  into v_rider
  from public.riders r join public.profiles p on p.id = r.user_id
  where r.id = v_o.rider_id;

  return jsonb_build_object(
    'id', v_o.id,
    'status', v_o.status,
    'fulfillmentType', v_o.fulfillment_type,
    'paymentMethod', v_o.payment_method,
    'paymentStatus', v_o.payment_status,
    'total', v_o.total,
    'deliveryFee', v_o.delivery_fee,
    'address', v_o.address,
    'customerName', v_o.customer_name,
    'customerPhone', v_o.customer_phone,
    -- the handover code is the customer's to give the rider, only while the order is open
    'deliveryOtp', case when v_o.status in ('pending', 'dispatched') and v_o.fulfillment_type = 'delivery'
                        then v_o.delivery_otp else null end,
    'etaMinutes', v_o.eta_minutes,
    'store', jsonb_build_object('name', v_t.trading_name, 'slug', v_t.slug, 'phone', v_t.contact_phone,
                                'address', v_t.address),
    'rider', v_rider,
    'items', v_items,
    'createdAt', v_o.created_at,
    'dispatchedAt', v_o.dispatched_at,
    'pickedUpAt', v_o.picked_up_at,
    'deliveredAt', v_o.delivered_at,
    'cancelledAt', v_o.voided_at,
    'cancelReason', v_o.void_reason
  );
end;
$$;

revoke all on function public.my_orders(integer) from public, anon;
revoke all on function public.my_order(uuid) from public, anon;
grant execute on function public.my_orders(integer) to authenticated;
grant execute on function public.my_order(uuid) to authenticated;

-- ============================================================================
-- 5. RIDER DELIVERY FLOW: online status, resume, pickup, history
-- ============================================================================
create or replace function public.rider_set_online(p_online boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
begin
  if p_online then
    v_rider := public.current_ready_rider();
  else
    select * into v_rider from public.riders where user_id = auth.uid();
    if not found then
      raise exception 'Rider profile not found';
    end if;
  end if;

  update public.riders set is_online = p_online, online_changed_at = now() where id = v_rider.id;
  return jsonb_build_object('online', p_online);
end;
$$;

-- The delivery the rider is currently on (so a refresh or a new session resumes it).
create or replace function public.rider_active_order()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_o public.store_orders%rowtype;
  v_t public.tenants%rowtype;
begin
  select * into v_rider from public.riders where user_id = auth.uid();
  if not found then
    return null;
  end if;

  select * into v_o from public.store_orders
  where rider_id = v_rider.id and status = 'dispatched'
  order by dispatched_at desc nulls last limit 1;
  if not found then
    return null;
  end if;
  select * into v_t from public.tenants where id = v_o.tenant_id;

  return jsonb_build_object(
    'orderId', v_o.id,
    'storeName', v_t.trading_name,
    'storeAddress', coalesce(v_t.address, 'Store pickup'),
    'storePhone', v_t.contact_phone,
    'customerName', v_o.customer_name,
    'customerAddress', coalesce(v_o.address, 'Doorstep delivery'),
    'customerPhone', v_o.customer_phone,
    'itemsSummary', coalesce(v_o.items_summary, 'Package'),
    'fare', coalesce(v_o.courier_fare, 0),
    'tip', coalesce(v_o.courier_tip, 0),
    'pickedUp', v_o.picked_up_at is not null,
    'acceptedAt', v_o.dispatched_at
  );
end;
$$;

create or replace function public.rider_pick_up_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_o public.store_orders%rowtype;
begin
  v_rider := public.current_ready_rider();

  select * into v_o from public.store_orders where id = p_order_id for update;
  if not found or v_o.rider_id is distinct from v_rider.id then
    raise exception 'This order is not assigned to you';
  end if;
  if v_o.status <> 'dispatched' then
    raise exception 'This order is not out for delivery';
  end if;

  update public.store_orders set picked_up_at = coalesce(picked_up_at, now()) where id = p_order_id;
  return jsonb_build_object('orderId', p_order_id, 'pickedUp', true);
end;
$$;

create or replace function public.rider_history(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_rows jsonb;
begin
  select * into v_rider from public.riders where user_id = auth.uid();
  if not found then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb)
  into v_rows
  from (
    select coalesce(o.delivered_at, o.updated_at) as at, jsonb_build_object(
      'id', o.id,
      'storeName', t.trading_name,
      'customerName', split_part(o.customer_name, ' ', 1),
      'address', o.address,
      'fare', coalesce(o.courier_fare, 0),
      'tip', coalesce(o.courier_tip, 0),
      'deliveredAt', coalesce(o.delivered_at, o.updated_at)
    ) as j
    from public.store_orders o join public.tenants t on t.id = o.tenant_id
    where o.rider_id = v_rider.id and o.status = 'delivered'
    order by coalesce(o.delivered_at, o.updated_at) desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) x;

  return v_rows;
end;
$$;

revoke all on function public.rider_set_online(boolean) from public, anon;
revoke all on function public.rider_active_order() from public, anon;
revoke all on function public.rider_pick_up_order(uuid) from public, anon;
revoke all on function public.rider_history(integer) from public, anon;
grant execute on function public.rider_set_online(boolean) to authenticated;
grant execute on function public.rider_active_order() to authenticated;
grant execute on function public.rider_pick_up_order(uuid) to authenticated;
grant execute on function public.rider_history(integer) to authenticated;

-- ============================================================================
-- 6. EXISTING FUNCTIONS UPDATED FOR THE NEW FIELDS
-- ============================================================================


create or replace function public.submit_storefront_order(p_slug text, p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_tenant public.tenants%rowtype;
  v_order_id uuid;
  v_otp text;
  v_item jsonb;
  v_prod_id uuid;
  v_qty integer;
  v_prod_name text;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_fee numeric := 0;
  v_fulfillment text;
  v_phone text;
  v_method text;
  v_reference text;
  v_summary text[] := '{}';
begin
  select * into v_tenant
  from public.tenants
  where slug = lower(trim(coalesce(p_slug, ''))) and status in ('active', 'trialing');

  if not found then
    raise exception 'Store not found or currently inactive.';
  end if;

  if jsonb_typeof(p_order->'items') is distinct from 'array'
     or jsonb_array_length(p_order->'items') = 0 then
    raise exception 'Your cart is empty.';
  end if;

  v_phone := nullif(trim(p_order->>'customerPhone'), '');
  if v_phone is null or v_phone !~ '^[+0-9 ()-]{7,20}$' then
    raise exception 'A valid phone number is required.';
  end if;

  v_fulfillment := case when p_order->>'fulfillmentType' = 'pickup' then 'pickup' else 'delivery' end;
  if v_fulfillment = 'delivery' and nullif(trim(p_order->>'address'), '') is null then
    raise exception 'A delivery address is required.';
  end if;

  v_method := case when p_order->>'paymentMethod' ilike 'transfer%' then 'Transfer' else 'Card' end;
  v_reference := nullif(trim(p_order->>'paymentReference'), '');
  v_otp := lpad((floor(random() * 9000) + 1000)::text, 4, '0');

  insert into public.store_orders (
    tenant_id, channel, status, customer_name, customer_phone, address,
    total, payment_method, payment_status, payment_reference,
    fulfillment_type, eta_minutes, delivery_otp, customer_user_id
  ) values (
    v_tenant.id, 'online', 'pending',
    coalesce(nullif(trim(p_order->>'customerName'), ''), 'Shopper'),
    v_phone,
    case when v_fulfillment = 'pickup' then 'Store Counter Pickup' else trim(p_order->>'address') end,
    0, v_method, 'unpaid', v_reference,
    v_fulfillment, 25, v_otp, auth.uid()
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_order->'items')
  loop
    begin
      v_prod_id := (v_item->>'id')::uuid;
      v_qty := coalesce((v_item->>'quantity')::integer, (v_item->>'qty')::integer, 1);
    exception when others then
      raise exception 'Invalid item in cart.';
    end;

    if v_qty < 1 or v_qty > 99 then
      raise exception 'Invalid quantity.';
    end if;

    -- Price and stock come from the database, never from the client.
    update public.catalog_products
    set stock = stock - v_qty
    where id = v_prod_id
      and tenant_id = v_tenant.id
      and is_active = true
      and stock >= v_qty
    returning name, price into v_prod_name, v_unit_price;

    if not found then
      raise exception 'An item in your cart is out of stock or no longer available.';
    end if;

    insert into public.order_items (
      order_id, tenant_id, product_id, product_name, quantity, unit_price, line_total
    ) values (
      v_order_id, v_tenant.id, v_prod_id, v_prod_name, v_qty, v_unit_price, v_qty * v_unit_price
    );

    v_subtotal := v_subtotal + v_qty * v_unit_price;
    v_summary := v_summary || (v_qty || 'x ' || v_prod_name);
  end loop;

  if v_fulfillment = 'delivery' and v_subtotal <= 15000 then
    v_fee := 850;
  end if;

  update public.store_orders
  set total = v_subtotal + v_fee,
      delivery_fee = v_fee,
      items_summary = array_to_string(v_summary, ', ')
  where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'store_name', v_tenant.trading_name,
    'subtotal', v_subtotal,
    'delivery_fee', v_fee,
    'total', v_subtotal + v_fee,
    'status', 'pending',
    'payment_status', 'unpaid',
    'eta_minutes', 25,
    'delivery_otp', v_otp
  );
end;
$$;

create or replace function public.get_available_dispatches()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_dispatches jsonb;
begin
  v_rider := public.current_ready_rider();

  -- offline riders see no requests
  if not v_rider.is_online then
    return '[]'::jsonb;
  end if;

  -- Customer phone is withheld until the rider accepts.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'orderId', o.id,
      'storeName', t.trading_name,
      'storeAddress', coalesce(t.address, 'Store location'),
      'storePhone', t.contact_phone,
      'customerName', o.customer_name,
      'customerAddress', coalesce(o.address, 'Customer Doorstep'),
      'estimatedMinutes', coalesce(o.eta_minutes, 20),
      'fare', coalesce(o.courier_fare, 1850),
      'tip', coalesce(o.courier_tip, 0),
      'itemsSummary', coalesce(o.items_summary, 'Retail Package'),
      'createdAt', o.created_at
    ) order by o.created_at desc
  ), '[]'::jsonb)
  into v_dispatches
  from public.store_orders o
  join public.tenants t on t.id = o.tenant_id
  where o.channel = 'online'
    and o.fulfillment_type = 'delivery'
    and o.payment_status = 'paid'
    and o.status = 'pending'
    and o.rider_id is null;

  return v_dispatches;
end;
$$;

create or replace function public.verify_order_delivery(p_order_id uuid, p_otp text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_order public.store_orders%rowtype;
begin
  v_rider := public.current_ready_rider();

  select * into v_order from public.store_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.rider_id is distinct from v_rider.id then
    raise exception 'This order is not assigned to you';
  end if;

  if v_order.status = 'delivered' then
    raise exception 'This order was already delivered';
  end if;

  if v_order.status <> 'dispatched' then
    raise exception 'This order is not out for delivery';
  end if;

  if v_order.picked_up_at is null then
    raise exception 'Confirm you have picked up the order first';
  end if;

  if v_order.delivery_otp is null
     or trim(v_order.delivery_otp) <> trim(coalesce(p_otp, '')) then
    raise exception 'Invalid 4-digit handover OTP. Please verify with customer.';
  end if;

  update public.store_orders set status = 'delivered' where id = p_order_id
  returning * into v_order;

  return jsonb_build_object(
    'orderId', v_order.id,
    'status', 'delivered',
    'fare', coalesce(v_order.courier_fare, 1850),
    'tip', coalesce(v_order.courier_tip, 0)
  );
end;
$$;

create or replace function public.get_rider_wallet()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_earned numeric(12,2) := 0;
  v_reserved numeric(12,2) := 0;
  v_trips jsonb;
  v_today integer := 0;
  v_bank text;
  v_account text;
  v_account_name text;
  v_verified boolean;
  v_payouts jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rider from public.riders where user_id = auth.uid() limit 1;
  if not found then
    return jsonb_build_object('balance', 0, 'trips', '[]'::jsonb, 'todayTrips', 0);
  end if;

  select coalesce(sum(coalesce(courier_fare, 0) + coalesce(courier_tip, 0)), 0)
  into v_earned
  from public.store_orders
  where rider_id = v_rider.id and status = 'delivered';

  -- Pending/processing payouts already reserve their amount.
  select coalesce(sum(amount), 0)
  into v_reserved
  from public.rider_payouts
  where rider_id = v_rider.id and status in ('pending', 'processing', 'completed');

  select count(*) into v_today
  from public.store_orders
  where rider_id = v_rider.id and status = 'delivered' and updated_at::date = current_date;

  select coalesce(jsonb_agg(x.j order by x.updated_at desc), '[]'::jsonb)
  into v_trips
  from (
    select o.updated_at, jsonb_build_object(
      'id', 'TRIP-' || upper(substr(o.id::text, 1, 6)),
      'orderId', o.id,
      'store', t.trading_name,
      'customer', o.customer_name || ' (' || coalesce(substr(o.address, 1, 20), 'Lagos') || ')',
      'fare', coalesce(o.courier_fare, 1850),
      'tip', coalesce(o.courier_tip, 0),
      'time', to_char(o.updated_at, 'HH12:MI AM')
    ) as j
    from public.store_orders o
    join public.tenants t on t.id = o.tenant_id
    where o.rider_id = v_rider.id and o.status = 'delivered'
    order by o.updated_at desc
    limit 20
  ) x;

  select a.bank_name, a.account_number, a.account_name, a.verified
  into v_bank, v_account, v_account_name, v_verified
  from public.rider_payout_accounts a where a.rider_id = v_rider.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', po.id, 'amount', po.amount, 'status', po.status, 'bankName', po.bank_name,
    'reference', po.reference, 'createdAt', po.created_at) order by po.created_at desc), '[]'::jsonb)
  into v_payouts
  from (select * from public.rider_payouts where rider_id = v_rider.id order by created_at desc limit 10) po;

  return jsonb_build_object(
    'payouts', v_payouts,
    'balance', greatest(0, v_earned - v_reserved),
    'totalEarned', v_earned,
    'trips', v_trips,
    'todayTrips', v_today,
    'bankName', v_bank,
    'accountNumber', v_account,
    'accountName', v_account_name,
    'accountVerified', coalesce(v_verified, false)
  );
end;
$$;

create or replace function public.request_rider_cashout(
  p_bank_name text default null,
  p_account_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_acct public.rider_payout_accounts%rowtype;
  v_earned numeric(12,2) := 0;
  v_reserved numeric(12,2) := 0;
  v_balance numeric(12,2) := 0;
  v_payout_id uuid;
begin
  v_rider := public.current_ready_rider();

  select * into v_acct from public.rider_payout_accounts where rider_id = v_rider.id;
  if not found then
    raise exception 'Add your payout account before withdrawing';
  end if;

  -- Serialise concurrent cashouts for this rider.
  perform 1 from public.riders where id = v_rider.id for update;

  select coalesce(sum(coalesce(courier_fare, 0) + coalesce(courier_tip, 0)), 0)
  into v_earned
  from public.store_orders
  where rider_id = v_rider.id and status = 'delivered';

  select coalesce(sum(amount), 0)
  into v_reserved
  from public.rider_payouts
  where rider_id = v_rider.id and status in ('pending', 'processing', 'completed');

  v_balance := greatest(0, v_earned - v_reserved);
  if v_balance <= 0 then
    raise exception 'No available balance to withdraw';
  end if;

  -- Money is not moved here: the payout stays pending until an admin settles it.
  insert into public.rider_payouts (rider_id, amount, bank_name, account_number, account_name, status)
  values (v_rider.id, v_balance, v_acct.bank_name, v_acct.account_number, v_acct.account_name, 'pending')
  returning id into v_payout_id;

  return jsonb_build_object('payoutId', v_payout_id, 'amount', v_balance, 'status', 'pending');
end;
$$;

create or replace function public.admin_get_rider(p_rider_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.riders%rowtype;
  v_p public.profiles%rowtype;
  v_k public.rider_kyc_submissions%rowtype;
  v_docs jsonb;
  v_trips jsonb;
  v_payouts jsonb;
  v_earned numeric := 0;
  v_reserved numeric := 0;
  v_paid numeric := 0;
  v_deliveries integer := 0;
  v_pay jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_r from public.riders where id = p_rider_id;
  if not found then
    raise exception 'Rider not found';
  end if;
  select * into v_p from public.profiles where id = v_r.user_id;
  select * into v_k from public.rider_kyc_submissions where rider_id = v_r.id order by created_at desc limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'docType', d.doc_type, 'path', d.storage_path, 'fileName', d.file_name,
    'mimeType', d.mime_type, 'sizeBytes', d.size_bytes, 'status', d.status,
    'notes', d.reviewer_notes, 'reviewedAt', d.reviewed_at, 'uploadedAt', d.updated_at
  ) order by d.doc_type), '[]'::jsonb)
  into v_docs
  from public.rider_documents d where d.rider_id = v_r.id;

  select coalesce(sum(coalesce(courier_fare, 0) + coalesce(courier_tip, 0)), 0), count(*)
  into v_earned, v_deliveries
  from public.store_orders where rider_id = v_r.id and status = 'delivered';

  select coalesce(sum(amount) filter (where status in ('pending', 'processing', 'completed')), 0),
         coalesce(sum(amount) filter (where status = 'completed'), 0)
  into v_reserved, v_paid
  from public.rider_payouts where rider_id = v_r.id;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) into v_trips
  from (
    select o.created_at, jsonb_build_object(
      'id', o.id, 'storeName', t.trading_name, 'customerName', o.customer_name,
      'address', o.address, 'status', o.status, 'fare', coalesce(o.courier_fare, 0),
      'tip', coalesce(o.courier_tip, 0), 'createdAt', o.created_at
    ) as j
    from public.store_orders o join public.tenants t on t.id = o.tenant_id
    where o.rider_id = v_r.id order by o.created_at desc limit 20
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', po.id, 'amount', po.amount, 'bankName', po.bank_name,
    'accountNumber', po.account_number, 'status', po.status, 'createdAt', po.created_at
  ) order by po.created_at desc), '[]'::jsonb)
  into v_payouts
  from (select * from public.rider_payouts where rider_id = v_r.id order by created_at desc limit 20) po;

  select jsonb_build_object('bankName', a.bank_name, 'accountNumber', a.account_number,
                            'accountName', a.account_name, 'verified', a.verified)
  into v_pay
  from public.rider_payout_accounts a where a.rider_id = v_r.id;

  return jsonb_build_object(
    'id', v_r.id,
    'name', v_p.full_name,
    'phone', v_p.phone,
    'email', (select u.email from auth.users u where u.id = v_r.user_id),
    'dateOfBirth', v_r.date_of_birth,
    'vehicleType', v_r.vehicle_type,
    'vehicleMakeModel', v_r.vehicle_make_model,
    'plate', v_r.vehicle_plate_number,
    'licenseNumber', v_r.drivers_license_number,
    'licenseExpiry', v_r.drivers_license_expiry,
    'state', v_r.state,
    'city', v_r.city,
    'baseAddress', v_r.base_address,
    'nextOfKinName', v_r.next_of_kin_name,
    'nextOfKinPhone', v_r.next_of_kin_phone,
    'corridor', v_r.corridor,
    'guarantorName', v_r.guarantor_name,
    'guarantorPhone', v_r.guarantor_phone,
    'isOnline', v_r.is_online,
    'payoutAccount', v_pay,
    'onboardingStatus', v_r.onboarding_status,
    'kycStatus', v_r.kyc_status,
    'submissionId', v_k.id,
    'reviewerNotes', v_k.reviewer_notes,
    'submittedAt', v_k.submitted_at,
    'reviewedAt', v_k.reviewed_at,
    'suspended', v_r.suspended_at is not null,
    'suspendedAt', v_r.suspended_at,
    'suspensionReason', v_r.suspension_reason,
    'createdAt', v_r.created_at,
    'requiredDocuments', to_jsonb(public.rider_required_documents(v_r.vehicle_type)),
    'documents', v_docs,
    'deliveries', v_deliveries,
    'earned', v_earned,
    'paidOut', v_paid,
    'availableBalance', greatest(0, v_earned - v_reserved),
    'recentTrips', v_trips,
    'payouts', v_payouts
  );
end;
$$;


revoke all on function public.request_rider_cashout(text, text) from public, anon;
grant execute on function public.request_rider_cashout(text, text) to authenticated;
revoke all on function public.admin_get_rider(uuid) from public, anon;
grant execute on function public.admin_get_rider(uuid) to authenticated;
revoke all on function public.get_available_dispatches() from public, anon;
grant execute on function public.get_available_dispatches() to authenticated;
revoke all on function public.verify_order_delivery(uuid, text) from public, anon;
grant execute on function public.verify_order_delivery(uuid, text) to authenticated;
revoke all on function public.get_rider_wallet() from public, anon;
grant execute on function public.get_rider_wallet() to authenticated;
revoke all on function public.submit_storefront_order(text, jsonb) from public;
grant execute on function public.submit_storefront_order(text, jsonb) to anon, authenticated;

-- ============================================================================
-- 7. STORE LISTINGS: NO INVENTED RATINGS / DELIVERY TIMES / CORRIDORS
-- ============================================================================

create or replace function public.get_storefront_store(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store jsonb;
begin
  select jsonb_build_object(
    'id', t.id,
    'slug', t.slug,
    'name', t.trading_name,
    'category', t.category,
    'address', t.address,
    'whatsapp', t.contact_phone,
    'hasPhysicalStore', t.has_physical_store,
    'state', t.state,
    'lga', t.lga,
    'corridor', t.corridor,
    'city', t.city
  )
  into v_store
  from public.tenants t
  where t.slug = lower(trim(coalesce(p_slug, ''))) and t.status = 'active';

  return v_store;
end;
$$;
create or replace function public.get_active_marketplace_stores(p_corridor text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stores jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'name', t.trading_name,
      'slug', t.slug,
      'category', t.category,
      'address', t.address,
      'corridor', t.corridor,
      'city', t.city,
      'state', t.state,
      'productCount', (select count(*) from public.catalog_products p
                       where p.tenant_id = t.id and p.is_active and p.stock > 0)
    ) order by t.created_at desc
  ), '[]'::jsonb)
  into v_stores
  from public.tenants t
  where t.status = 'active'
    and (p_corridor is null or t.corridor = p_corridor or p_corridor = 'All');

  return v_stores;
end;
$$;

revoke all on function public.get_storefront_store(text) from public;
revoke all on function public.get_active_marketplace_stores(text) from public;
grant execute on function public.get_storefront_store(text) to anon, authenticated;
grant execute on function public.get_active_marketplace_stores(text) to anon, authenticated;
