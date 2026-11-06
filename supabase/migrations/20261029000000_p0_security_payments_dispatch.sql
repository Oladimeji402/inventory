-- Migration: P0 hardening — platform-admin enforcement, RLS gaps, server-side order
-- pricing + payment state, rider dispatch/wallet fixes, till sale idempotency + void.
-- Date: 2026-10-29
--
-- After applying, grant yourself platform-admin once, from the SQL editor:
--   update public.profiles set is_platform_admin = true where id = '<your auth.users id>';

-- ============================================================================
-- 1. COLUMNS
-- ============================================================================
-- submit_storefront_order has always inserted customer_phone, but no migration
-- ever created the column, so every real storefront order failed at the DB.
alter table public.store_orders
  add column if not exists customer_phone text,
  add column if not exists fulfillment_type text not null default 'delivery'
    check (fulfillment_type in ('delivery', 'pickup')),
  add column if not exists delivery_fee numeric(12,2) not null default 0,
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'failed', 'refunded')),
  add column if not exists payment_reference text,
  add column if not exists client_sale_id text,
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text,
  add column if not exists voided_by text;

-- Till sales are taken at the counter; they are paid by definition.
update public.store_orders set payment_status = 'paid' where channel = 'counter';

create unique index if not exists uq_store_orders_payment_reference
  on public.store_orders (payment_reference) where payment_reference is not null;
create unique index if not exists uq_store_orders_client_sale
  on public.store_orders (tenant_id, client_sale_id) where client_sale_id is not null;

alter table public.rider_payouts
  alter column status set default 'pending';

-- ============================================================================
-- 2. PLATFORM ADMIN HELPER + PROTECTED COLUMNS
-- ============================================================================
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- Direct client writes (PostgREST as `authenticated`) must not be able to change
-- privileged columns. SECURITY DEFINER RPCs run as the function owner, so
-- current_user distinguishes them from a raw client UPDATE.
create or replace function public.guard_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_platform_admin() then
    return new;
  end if;

  if tg_table_name = 'profiles' then
    if new.is_platform_admin is distinct from old.is_platform_admin then
      raise exception 'is_platform_admin cannot be changed by clients';
    end if;
  elsif tg_table_name = 'tenants' then
    if new.status is distinct from old.status then
      raise exception 'Tenant status can only be changed by a platform admin';
    end if;
  elsif tg_table_name = 'riders' then
    if new.kyc_status is distinct from old.kyc_status then
      raise exception 'Rider KYC status can only be changed by a platform admin';
    end if;
  elsif tg_table_name = 'store_orders' then
    if new.payment_status is distinct from old.payment_status
       or new.payment_reference is distinct from old.payment_reference
       or new.rider_id is distinct from old.rider_id
       or new.courier_fare is distinct from old.courier_fare
       or new.courier_tip is distinct from old.courier_tip
       or new.total is distinct from old.total
       or new.tenant_id is distinct from old.tenant_id then
      raise exception 'Payment, courier and total fields cannot be edited directly';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profiles on public.profiles;
create trigger trg_guard_profiles before update on public.profiles
  for each row execute function public.guard_privileged_columns();

drop trigger if exists trg_guard_tenants on public.tenants;
create trigger trg_guard_tenants before update on public.tenants
  for each row execute function public.guard_privileged_columns();

drop trigger if exists trg_guard_riders on public.riders;
create trigger trg_guard_riders before update on public.riders
  for each row execute function public.guard_privileged_columns();

drop trigger if exists trg_guard_store_orders on public.store_orders;
create trigger trg_guard_store_orders before update on public.store_orders
  for each row execute function public.guard_privileged_columns();

-- ============================================================================
-- 3. RLS ON TABLES CREATED WITHOUT IT (readable/writable with the anon key)
-- ============================================================================
alter table public.rider_payouts enable row level security;
alter table public.till_shifts enable row level security;
alter table public.till_cash_drops enable row level security;
alter table public.store_branches enable row level security;
alter table public.subscriptions enable row level security;

revoke all on public.rider_payouts, public.till_shifts, public.till_cash_drops,
  public.store_branches, public.subscriptions from anon, authenticated;

grant select on public.rider_payouts, public.store_branches, public.subscriptions to authenticated;

drop policy if exists "rider_payouts_select_own" on public.rider_payouts;
create policy "rider_payouts_select_own" on public.rider_payouts for select to authenticated
  using (rider_id in (select r.id from public.riders r where r.user_id = auth.uid())
         or public.is_platform_admin());

drop policy if exists "store_branches_select_member" on public.store_branches;
create policy "store_branches_select_member" on public.store_branches for select to authenticated
  using (tenant_id in (select m.tenant_id from public.tenant_members m where m.user_id = auth.uid())
         or public.is_platform_admin());

drop policy if exists "subscriptions_select_member" on public.subscriptions;
create policy "subscriptions_select_member" on public.subscriptions for select to authenticated
  using (tenant_id in (select m.tenant_id from public.tenant_members m where m.user_id = auth.uid())
         or public.is_platform_admin());

-- till_shifts / till_cash_drops: reachable only through the staff_* RPCs.

drop policy if exists "tenants_select_platform_admin" on public.tenants;
create policy "tenants_select_platform_admin" on public.tenants for select to authenticated
  using (public.is_platform_admin());

-- ============================================================================
-- 4. ADMIN RPCs (every one enforces is_platform_admin)
-- ============================================================================
create or replace function public.admin_get_platform_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_gmv numeric := 0;
  v_total_orders integer := 0;
  v_active_tenants integer := 0;
  v_active_riders integer := 0;
  v_recent_tenants jsonb;
  v_pending_kyc jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(sum(total), 0), count(*)
  into v_total_gmv, v_total_orders
  from public.store_orders
  where status <> 'cancelled' and payment_status = 'paid';

  select count(*) into v_active_tenants from public.tenants where status = 'active';
  select count(*) into v_active_riders from public.riders where onboarding_status = 'complete';

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_recent_tenants
  from (
    select t.created_at, jsonb_build_object(
      'id', t.id,
      'name', t.trading_name,
      'slug', t.slug,
      'category', t.category,
      'status', t.status,
      'state', t.state,
      'address', t.address,
      'contactPhone', t.contact_phone,
      'contactEmail', t.contact_email,
      'createdAt', t.created_at
    ) as j
    from public.tenants t
    order by t.created_at desc
    limit 50
  ) x;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_pending_kyc
  from (
    select k.created_at, jsonb_build_object(
      'id', k.id,
      'riderId', r.id,
      'fullName', p.full_name,
      'phone', p.phone,
      'vehicleType', r.vehicle_type,
      'licenseNumber', r.drivers_license_number,
      'status', k.status,
      'submittedAt', k.created_at
    ) as j
    from public.rider_kyc_submissions k
    join public.riders r on r.id = k.rider_id
    join public.profiles p on p.id = r.user_id
    where k.status in ('not_started', 'pending_review')
    order by k.created_at desc
    limit 50
  ) x;

  return jsonb_build_object(
    'totalGmv', v_total_gmv,
    'totalOrders', v_total_orders,
    'activeTenants', v_active_tenants,
    'activeRiders', v_active_riders,
    'recentTenants', v_recent_tenants,
    'pendingKyc', v_pending_kyc
  );
end;
$$;

create or replace function public.admin_set_tenant_status(
  p_tenant_id uuid,
  p_status public.tenant_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant public.tenants%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  update public.tenants set status = p_status where id = p_tenant_id
  returning * into v_tenant;

  if not found then
    raise exception 'Store not found';
  end if;

  return jsonb_build_object('id', v_tenant.id, 'status', v_tenant.status);
end;
$$;

create or replace function public.admin_review_rider_kyc(
  p_submission_id uuid,
  p_status public.kyc_status,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.rider_kyc_submissions%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  if p_status not in ('verified', 'rejected', 'pending_review') then
    raise exception 'Invalid review status';
  end if;

  update public.rider_kyc_submissions
  set status = p_status,
      reviewer_notes = p_notes,
      reviewed_at = now(),
      updated_at = now()
  where id = p_submission_id
  returning * into v_sub;

  if not found then
    raise exception 'KYC submission not found';
  end if;

  update public.riders set kyc_status = p_status where id = v_sub.rider_id;

  return jsonb_build_object('id', v_sub.id, 'status', v_sub.status);
end;
$$;

create or replace function public.admin_list_orders(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orders jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_orders
  from (
    select o.created_at, jsonb_build_object(
      'id', o.id,
      'tenantId', o.tenant_id,
      'storeName', t.trading_name,
      'slug', t.slug,
      'customerName', o.customer_name,
      'channel', o.channel,
      'total', o.total,
      'paymentMethod', o.payment_method,
      'paymentStatus', o.payment_status,
      'status', o.status,
      'courierName', o.courier_name,
      'createdAt', o.created_at
    ) as j
    from public.store_orders o
    join public.tenants t on t.id = o.tenant_id
    order by o.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) x;

  return v_orders;
end;
$$;

revoke all on function public.admin_get_platform_metrics() from public, anon;
revoke all on function public.admin_set_tenant_status(uuid, public.tenant_status) from public, anon;
revoke all on function public.admin_review_rider_kyc(uuid, public.kyc_status, text) from public, anon;
revoke all on function public.admin_list_orders(integer) from public, anon;
grant execute on function public.admin_get_platform_metrics() to authenticated;
grant execute on function public.admin_set_tenant_status(uuid, public.tenant_status) to authenticated;
grant execute on function public.admin_review_rider_kyc(uuid, public.kyc_status, text) to authenticated;
grant execute on function public.admin_list_orders(integer) to authenticated;

-- ============================================================================
-- 5. STOREFRONT ORDERS: SERVER-SIDE PRICING, STOCK CHECKS, PAYMENT STATE
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
    fulfillment_type, eta_minutes, delivery_otp
  ) values (
    v_tenant.id, 'online', 'pending',
    coalesce(nullif(trim(p_order->>'customerName'), ''), 'Shopper'),
    v_phone,
    case when v_fulfillment = 'pickup' then 'Store Counter Pickup' else trim(p_order->>'address') end,
    0, v_method, 'unpaid', v_reference,
    v_fulfillment, 25, v_otp
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

-- Called only by the verify-paystack-payment edge function (service role) after
-- it has confirmed the transaction with Paystack's API.
create or replace function public.confirm_order_payment(
  p_order_id uuid,
  p_reference text,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
begin
  select * into v_order from public.store_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.payment_status = 'paid' then
    return jsonb_build_object('order_id', v_order.id, 'payment_status', 'paid');
  end if;

  if v_order.payment_reference is not null and v_order.payment_reference <> p_reference then
    raise exception 'Payment reference does not match this order';
  end if;

  if abs(v_order.total - p_amount) > 0.01 then
    raise exception 'Paid amount does not match order total';
  end if;

  update public.store_orders
  set payment_status = 'paid', payment_reference = p_reference
  where id = p_order_id;

  return jsonb_build_object('order_id', p_order_id, 'payment_status', 'paid');
end;
$$;

revoke all on function public.confirm_order_payment(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text, numeric) to service_role;

-- Merchants confirm bank transfers by hand.
create or replace function public.merchant_mark_order_paid(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
begin
  select * into v_order from public.store_orders where id = p_order_id for update;
  if not found or not public.is_tenant_member(v_order.tenant_id) then
    raise exception 'Order not found';
  end if;

  if v_order.payment_method <> 'Transfer' then
    raise exception 'Only bank-transfer orders can be marked paid manually';
  end if;

  update public.store_orders set payment_status = 'paid' where id = p_order_id;
  return jsonb_build_object('order_id', p_order_id, 'payment_status', 'paid');
end;
$$;

revoke all on function public.merchant_mark_order_paid(uuid) from public, anon;
grant execute on function public.merchant_mark_order_paid(uuid) to authenticated;

-- ============================================================================
-- 6. RIDER DISPATCH + WALLET
-- ============================================================================
create or replace function public.current_ready_rider()
returns public.riders
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rider from public.riders where user_id = auth.uid() limit 1;
  if not found then
    raise exception 'Rider profile not found';
  end if;

  if v_rider.onboarding_status <> 'complete' then
    raise exception 'Finish rider onboarding before taking deliveries';
  end if;

  if v_rider.kyc_status = 'rejected' then
    raise exception 'Your rider verification was rejected. Contact support.';
  end if;

  return v_rider;
end;
$$;

revoke all on function public.current_ready_rider() from public, anon;
grant execute on function public.current_ready_rider() to authenticated;

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

create or replace function public.accept_order_dispatch(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_profile public.profiles%rowtype;
  v_order public.store_orders%rowtype;
  v_tenant public.tenants%rowtype;
begin
  v_rider := public.current_ready_rider();

  select * into v_profile from public.profiles where id = auth.uid();

  select * into v_order from public.store_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.channel <> 'online' or v_order.fulfillment_type <> 'delivery'
     or v_order.payment_status <> 'paid' then
    raise exception 'This order is not available for delivery';
  end if;

  if v_order.rider_id is not null and v_order.rider_id <> v_rider.id then
    raise exception 'This order has already been claimed by another rider';
  end if;

  if v_order.status not in ('pending', 'dispatched') then
    raise exception 'This order is no longer open';
  end if;

  select * into v_tenant from public.tenants where id = v_order.tenant_id;

  update public.store_orders
  set rider_id = v_rider.id,
      courier_name = coalesce(v_profile.full_name, 'Courier Rider'),
      courier_phone = coalesce(v_profile.phone, v_rider.next_of_kin_phone),
      status = 'dispatched',
      courier_fare = coalesce(courier_fare, 1850)
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object(
    'orderId', v_order.id,
    'storeName', v_tenant.trading_name,
    'storeAddress', coalesce(v_tenant.address, 'Store pickup'),
    'storePhone', v_tenant.contact_phone,
    'customerName', v_order.customer_name,
    'customerAddress', coalesce(v_order.address, 'Doorstep Delivery'),
    'customerPhone', v_order.customer_phone,
    'fare', coalesce(v_order.courier_fare, 1850),
    'tip', coalesce(v_order.courier_tip, 0),
    'itemsSummary', coalesce(v_order.items_summary, 'Retail Package'),
    'status', v_order.status
  );
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

  select p.bank_name, p.account_number into v_bank, v_account
  from public.rider_payouts p
  where p.rider_id = v_rider.id
  order by p.created_at desc
  limit 1;

  return jsonb_build_object(
    'balance', greatest(0, v_earned - v_reserved),
    'totalEarned', v_earned,
    'trips', v_trips,
    'todayTrips', v_today,
    'bankName', v_bank,
    'accountNumber', v_account
  );
end;
$$;

create or replace function public.request_rider_cashout(
  p_bank_name text,
  p_account_number text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_earned numeric(12,2) := 0;
  v_reserved numeric(12,2) := 0;
  v_balance numeric(12,2) := 0;
  v_payout_id uuid;
  v_bank text := nullif(trim(p_bank_name), '');
  v_account text := nullif(trim(p_account_number), '');
begin
  v_rider := public.current_ready_rider();

  if v_bank is null then
    raise exception 'Bank name is required';
  end if;
  if v_account is null or v_account !~ '^[0-9]{10}$' then
    raise exception 'Enter a valid 10-digit account number';
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

  -- Money is not moved here: the payout stays pending until it is settled.
  insert into public.rider_payouts (rider_id, amount, bank_name, account_number, status)
  values (v_rider.id, v_balance, v_bank, v_account, 'pending')
  returning id into v_payout_id;

  return jsonb_build_object('payoutId', v_payout_id, 'amount', v_balance, 'status', 'pending');
end;
$$;

revoke all on function public.get_available_dispatches() from public, anon;
revoke all on function public.accept_order_dispatch(uuid) from public, anon;
revoke all on function public.verify_order_delivery(uuid, text) from public, anon;
revoke all on function public.get_rider_wallet() from public, anon;
revoke all on function public.request_rider_cashout(text, text) from public, anon;
grant execute on function public.get_available_dispatches() to authenticated;
grant execute on function public.accept_order_dispatch(uuid) to authenticated;
grant execute on function public.verify_order_delivery(uuid, text) to authenticated;
grant execute on function public.get_rider_wallet() to authenticated;
grant execute on function public.request_rider_cashout(text, text) to authenticated;

-- ============================================================================
-- 7. TILL: IDEMPOTENT SALES + REAL VOIDS
-- ============================================================================
create or replace function public.staff_till_checkout(p_token text, p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.employee_sessions%rowtype;
  v_employee public.employees%rowtype;
  v_order_id uuid;
  v_total numeric;
  v_client_id text := nullif(trim(p_order->>'id'), '');
  v_item jsonb;
  v_prod_id uuid;
  v_qty integer;
  v_unit_price numeric;
  v_prod_name text;
begin
  select * into v_session
  from public.employee_sessions
  where token = p_token and expires_at > now();

  if not found then
    raise exception 'Invalid or expired session. Please sign in again.';
  end if;

  select * into v_employee from public.employees where id = v_session.employee_id;

  -- A retried upload of the same sale must not create a second order.
  if v_client_id is not null then
    select id, total into v_order_id, v_total
    from public.store_orders
    where tenant_id = v_session.tenant_id and client_sale_id = v_client_id;

    if found then
      return jsonb_build_object(
        'order_id', v_order_id, 'total', v_total,
        'status', 'delivered', 'channel', 'counter', 'duplicate', true
      );
    end if;
  end if;

  v_total := coalesce((p_order->>'total')::numeric, 0);

  insert into public.store_orders (
    tenant_id, channel, status, customer_name, items_summary, total,
    payment_method, payment_status, amount_tendered, change_due,
    cashier_name, client_sale_id
  ) values (
    v_session.tenant_id, 'counter', 'delivered',
    coalesce(nullif(trim(p_order->>'customerName'), ''), 'Walk-in Customer'),
    p_order->>'itemsSummary',
    v_total,
    coalesce(nullif(trim(p_order->>'paymentMethod'), ''), 'Cash'),
    'paid',
    (p_order->>'amountTendered')::numeric,
    (p_order->>'changeDue')::numeric,
    coalesce(v_employee.full_name, 'Cashier'),
    v_client_id
  )
  returning id into v_order_id;

  if jsonb_typeof(p_order->'items') = 'array' then
    for v_item in select * from jsonb_array_elements(p_order->'items')
    loop
      v_prod_name := coalesce(v_item->>'name', 'Item');
      v_qty := greatest(1, coalesce((v_item->>'qty')::integer, (v_item->>'quantity')::integer, 1));
      v_unit_price := coalesce((v_item->>'price')::numeric, 0);

      begin
        v_prod_id := (v_item->>'id')::uuid;
      exception when others then
        v_prod_id := null;
      end;

      insert into public.order_items (
        order_id, tenant_id, product_id, product_name, quantity, unit_price, line_total
      ) values (
        v_order_id, v_session.tenant_id, v_prod_id, v_prod_name, v_qty, v_unit_price, v_qty * v_unit_price
      );

      if v_prod_id is not null then
        update public.catalog_products
        set stock = greatest(0, stock - v_qty)
        where id = v_prod_id and tenant_id = v_session.tenant_id;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id, 'total', v_total, 'status', 'delivered', 'channel', 'counter'
  );
end;
$$;

-- Managers/admins void a till sale: it is kept (status = cancelled) and restocked.
create or replace function public.staff_void_sale(
  p_token text,
  p_client_sale_id text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.employee_sessions%rowtype;
  v_employee public.employees%rowtype;
  v_order public.store_orders%rowtype;
begin
  select * into v_session
  from public.employee_sessions
  where token = p_token and expires_at > now();

  if not found then
    raise exception 'Invalid or expired session. Please sign in again.';
  end if;

  select * into v_employee from public.employees where id = v_session.employee_id;

  if v_employee.till_role not in ('Manager', 'Store Admin') then
    raise exception 'Only managers and store admins can void a sale';
  end if;

  select * into v_order
  from public.store_orders
  where tenant_id = v_session.tenant_id and client_sale_id = p_client_sale_id
    and channel = 'counter'
  for update;

  if not found then
    raise exception 'Sale not found';
  end if;

  if v_order.status = 'cancelled' then
    return jsonb_build_object('order_id', v_order.id, 'status', 'cancelled', 'duplicate', true);
  end if;

  update public.catalog_products p
  set stock = p.stock + i.quantity
  from public.order_items i
  where i.order_id = v_order.id
    and i.product_id = p.id
    and p.tenant_id = v_session.tenant_id;

  update public.store_orders
  set status = 'cancelled',
      voided_at = now(),
      void_reason = nullif(trim(p_reason), ''),
      voided_by = v_employee.full_name
  where id = v_order.id;

  return jsonb_build_object('order_id', v_order.id, 'status', 'cancelled');
end;
$$;

revoke all on function public.staff_void_sale(text, text, text) from public;
grant execute on function public.staff_void_sale(text, text, text) to anon, authenticated;

-- Shift reports must ignore voided sales (and match the till's "Transfer" label).

create or replace function public.staff_get_current_shift(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.employee_sessions%rowtype;
  v_employee public.employees%rowtype;
  v_shift public.till_shifts%rowtype;
  v_cash_sales numeric := 0;
  v_card_sales numeric := 0;
  v_transfer_sales numeric := 0;
  v_total_sales numeric := 0;
  v_expected_cash numeric := 0;
  v_drops jsonb;
begin
  select * into v_session
  from public.employee_sessions
  where token = p_token and expires_at > now();

  if not found then
    raise exception 'Invalid or expired session. Please sign in again.';
  end if;

  select * into v_employee from public.employees where id = v_session.employee_id;

  select * into v_shift
  from public.till_shifts
  where tenant_id = v_session.tenant_id and employee_id = v_session.employee_id and status = 'open'
  limit 1;

  if not found then
    return jsonb_build_object(
      'hasActiveShift', false
    );
  end if;

  -- Aggregate sales completed in this shift window
  select
    coalesce(sum(case when payment_method = 'Cash' then total else 0 end), 0),
    coalesce(sum(case when payment_method = 'Card' then total else 0 end), 0),
    coalesce(sum(case when payment_method in ('Transfer', 'Bank Transfer') then total else 0 end), 0),
    coalesce(sum(total), 0)
  into v_cash_sales, v_card_sales, v_transfer_sales, v_total_sales
  from public.store_orders
  where tenant_id = v_session.tenant_id
    and channel = 'counter'
    and created_at >= v_shift.opened_at
    and status <> 'cancelled';

  v_expected_cash := v_shift.opening_float + v_cash_sales - v_shift.cash_drops;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'amount', d.amount,
      'reason', d.reason,
      'time', to_char(d.created_at, 'HH12:MI AM')
    ) order by d.created_at desc
  ), '[]'::jsonb)
  into v_drops
  from public.till_cash_drops d
  where d.shift_id = v_shift.id;

  return jsonb_build_object(
    'hasActiveShift', true,
    'shiftId', v_shift.id,
    'cashierName', v_employee.full_name,
    'openedAt', v_shift.opened_at,
    'openingFloat', v_shift.opening_float,
    'cashDrops', v_shift.cash_drops,
    'cashSales', v_cash_sales,
    'cardSales', v_card_sales,
    'transferSales', v_transfer_sales,
    'totalSales', v_total_sales,
    'expectedCash', v_expected_cash,
    'drops', v_drops
  );
end;
$$;

create or replace function public.staff_close_shift(
  p_token text,
  p_actual_cash numeric,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.employee_sessions%rowtype;
  v_employee public.employees%rowtype;
  v_shift public.till_shifts%rowtype;
  v_cash_sales numeric := 0;
  v_card_sales numeric := 0;
  v_transfer_sales numeric := 0;
  v_total_sales numeric := 0;
  v_expected_cash numeric := 0;
  v_variance numeric := 0;
  v_actual numeric := greatest(0, coalesce(p_actual_cash, 0));
begin
  select * into v_session
  from public.employee_sessions
  where token = p_token and expires_at > now();

  if not found then
    raise exception 'Invalid or expired session. Please sign in again.';
  end if;

  select * into v_employee from public.employees where id = v_session.employee_id;

  select * into v_shift
  from public.till_shifts
  where tenant_id = v_session.tenant_id and employee_id = v_session.employee_id and status = 'open'
  limit 1;

  if not found then
    raise exception 'No active shift found to close';
  end if;

  select
    coalesce(sum(case when payment_method = 'Cash' then total else 0 end), 0),
    coalesce(sum(case when payment_method = 'Card' then total else 0 end), 0),
    coalesce(sum(case when payment_method in ('Transfer', 'Bank Transfer') then total else 0 end), 0),
    coalesce(sum(total), 0)
  into v_cash_sales, v_card_sales, v_transfer_sales, v_total_sales
  from public.store_orders
  where tenant_id = v_session.tenant_id
    and channel = 'counter'
    and created_at >= v_shift.opened_at
    and status <> 'cancelled';

  v_expected_cash := v_shift.opening_float + v_cash_sales - v_shift.cash_drops;
  v_variance := v_actual - v_expected_cash;

  update public.till_shifts
  set
    closed_at = now(),
    cash_sales = v_cash_sales,
    card_sales = v_card_sales,
    transfer_sales = v_transfer_sales,
    total_sales = v_total_sales,
    expected_cash = v_expected_cash,
    actual_cash = v_actual,
    variance = v_variance,
    notes = p_notes,
    status = 'closed',
    updated_at = now()
  where id = v_shift.id
  returning * into v_shift;

  return jsonb_build_object(
    'shiftId', v_shift.id,
    'status', 'closed',
    'cashierName', v_employee.full_name,
    'openedAt', v_shift.opened_at,
    'closedAt', v_shift.closed_at,
    'openingFloat', v_shift.opening_float,
    'cashDrops', v_shift.cash_drops,
    'cashSales', v_cash_sales,
    'cardSales', v_card_sales,
    'transferSales', v_transfer_sales,
    'totalSales', v_total_sales,
    'expectedCash', v_expected_cash,
    'actualCash', v_actual,
    'variance', v_variance,
    'notes', v_shift.notes
  );
end;
$$;

-- ============================================================================
-- 8. RELEASE STOCK HELD BY UNPAID ONLINE ORDERS
-- ============================================================================
-- Stock is reserved when a storefront order is created. If the shopper closes the
-- Paystack popup (or never pays) the reservation must be released.
create or replace function public.release_unpaid_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
begin
  select * into v_order from public.store_orders where id = p_order_id for update;

  if not found or v_order.channel <> 'online' or v_order.payment_status <> 'unpaid'
     or v_order.status <> 'pending' then
    return false;
  end if;

  update public.catalog_products p
  set stock = p.stock + i.quantity
  from public.order_items i
  where i.order_id = v_order.id and i.product_id = p.id and p.tenant_id = v_order.tenant_id;

  update public.store_orders
  set status = 'cancelled', payment_status = 'failed', voided_at = now(),
      void_reason = 'Payment not completed'
  where id = v_order.id;

  return true;
end;
$$;

-- Shopper-facing: only works on an unpaid order, and order ids are unguessable uuids.
revoke all on function public.release_unpaid_order(uuid) from public;
grant execute on function public.release_unpaid_order(uuid) to anon, authenticated;

-- Sweep for abandoned card orders. Schedule with pg_cron, e.g.
--   select cron.schedule('release-unpaid-orders', '*/10 * * * *',
--     $$select public.release_stale_unpaid_orders(30)$$);
create or replace function public.release_stale_unpaid_orders(p_minutes integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from public.store_orders
    where channel = 'online' and payment_status = 'unpaid' and status = 'pending'
      and payment_method = 'Card'
      and created_at < now() - make_interval(mins => greatest(p_minutes, 5))
  loop
    if public.release_unpaid_order(v_id) then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.release_stale_unpaid_orders(integer) from public, anon, authenticated;
grant execute on function public.release_stale_unpaid_orders(integer) to service_role;

-- ============================================================================
-- 9. ADMIN STAFF CONTROLS (platform admin, across all tenants)
-- ============================================================================
create or replace function public.admin_list_employees(p_tenant_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(x.j order by x.created_at asc), '[]'::jsonb)
  into v_staff
  from (
    select e.created_at, jsonb_build_object(
      'id', e.id,
      'name', e.full_name,
      'type', e.employee_type,
      'role', coalesce(e.till_role, 'Sales Representative'),
      'isActive', e.is_active,
      'locked', (e.pin_locked_until is not null and e.pin_locked_until > now()),
      'storeId', t.id,
      'storeName', t.trading_name,
      'storeSlug', t.slug,
      'createdAt', e.created_at
    ) as j
    from public.employees e
    join public.tenants t on t.id = e.tenant_id
    where p_tenant_id is null or e.tenant_id = p_tenant_id
    order by e.created_at asc
    limit 500
  ) x;

  return v_staff;
end;
$$;

create or replace function public.admin_reset_employee_pin(p_employee_id uuid, p_new_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if p_new_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  update public.employees
  set pin_hash = crypt(p_new_pin, gen_salt('bf')),
      failed_pin_attempts = 0,
      pin_locked_until = null
  where id = p_employee_id;

  if not found then
    raise exception 'Employee not found';
  end if;
end;
$$;

create or replace function public.admin_set_employee_active(p_employee_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  update public.employees
  set is_active = coalesce(p_is_active, true),
      failed_pin_attempts = 0,
      pin_locked_until = null
  where id = p_employee_id;

  if not found then
    raise exception 'Employee not found';
  end if;
end;
$$;

revoke all on function public.admin_list_employees(uuid) from public, anon;
revoke all on function public.admin_reset_employee_pin(uuid, text) from public, anon;
revoke all on function public.admin_set_employee_active(uuid, boolean) from public, anon;
grant execute on function public.admin_list_employees(uuid) to authenticated;
grant execute on function public.admin_reset_employee_pin(uuid, text) to authenticated;
grant execute on function public.admin_set_employee_active(uuid, boolean) to authenticated;
