-- Migration: merchant console (store owner dashboard + PIN-staff order screens).
-- Date: 2026-11-10
--
-- Everything the redesigned merchant dashboard reads or writes now goes through
-- tenant-scoped SECURITY DEFINER functions, so the browser never aggregates the
-- whole orders table itself and cannot edit money fields directly.
--
-- Review notes (what this changes beyond adding functions):
--   * store_orders / order_items: direct client UPDATE/INSERT/DELETE is removed.
--     The merchant dashboard was the only client that wrote them directly; every
--     write is now an RPC with business rules (payment before fulfilment, restock
--     on cancel, rider-owned deliveries stay with the rider).
--   * merchant_payout_accounts.is_verified and tenants.kyc_status can no longer be
--     changed by the store itself, and changing bank details clears verification.
--   * tenants.lga is read by get_storefront_store but no earlier migration created
--     it; added here (idempotent).
--   * staff_online_orders / staff_update_order_status no longer expose the
--     customer's delivery_otp and follow the same status rules as the dashboard.
--
-- Nothing here pushes money anywhere: Subtech does not pay merchants out yet.

-- ============================================================================
-- 1. COLUMNS + INDEXES
-- ============================================================================
alter table public.tenants
  add column if not exists lga text,
  add column if not exists accepting_orders boolean not null default true;

-- The merchant marks an order "packed and ready" so the team (and the rider at the
-- door) know it can be collected. It is a flag, not a status: riders claim paid
-- delivery orders while they are still `pending`.
alter table public.store_orders
  add column if not exists ready_at timestamptz;

create index if not exists idx_store_orders_tenant_status
  on public.store_orders (tenant_id, status, created_at desc);

-- ============================================================================
-- 2. GUARDS
-- ============================================================================
-- Clients cannot verify themselves. SECURITY DEFINER functions run as the owner, so
-- `current_user` tells a raw PostgREST write apart from an audited RPC.
-- Deliberately NOT security definer: current_user must stay the caller's role.
create or replace function public.guard_merchant_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'tenants' then
    if new.kyc_status is distinct from old.kyc_status
       and current_user in ('authenticated', 'anon')
       and not public.is_platform_admin() then
      raise exception 'KYC status can only be changed by Subtech';
    end if;
  elsif tg_table_name = 'merchant_payout_accounts' then
    if new.is_verified is distinct from old.is_verified
       and current_user in ('authenticated', 'anon')
       and not public.is_platform_admin() then
      raise exception 'A settlement account can only be verified by Subtech';
    end if;
    -- New bank details are unverified until someone at Subtech checks them.
    if new.is_verified is not distinct from old.is_verified
       and (new.bank_name, new.account_number, new.account_name)
           is distinct from (old.bank_name, old.account_number, old.account_name) then
      new.is_verified := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_merchant_tenants on public.tenants;
create trigger trg_guard_merchant_tenants before update on public.tenants
  for each row execute function public.guard_merchant_privileged_columns();

drop trigger if exists trg_guard_merchant_payout on public.merchant_payout_accounts;
create trigger trg_guard_merchant_payout before update on public.merchant_payout_accounts
  for each row execute function public.guard_merchant_privileged_columns();

-- A store that switched online orders off must not receive them. submit_storefront_order
-- is not redefined here; this trigger makes the same rule hold for any online insert.
create or replace function public.enforce_store_accepting_orders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.channel = 'online'
     and exists (
       select 1 from public.tenants t
       where t.id = new.tenant_id and t.accepting_orders = false
     ) then
    raise exception 'This store is not taking online orders right now.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_store_orders_accepting on public.store_orders;
create trigger trg_store_orders_accepting before insert on public.store_orders
  for each row execute function public.enforce_store_accepting_orders();

-- All order and line-item writes are RPC-only from now on.
drop policy if exists "orders_update_manager" on public.store_orders;
revoke update on public.store_orders from authenticated;

drop policy if exists "order_items_insert_manager" on public.order_items;
drop policy if exists "order_items_update_manager" on public.order_items;
drop policy if exists "order_items_delete_manager" on public.order_items;
revoke insert, update, delete on public.order_items from authenticated;

-- ============================================================================
-- 3. INTERNAL HELPERS (not callable by clients)
-- ============================================================================
create or replace function public.merchant_require_tenant(p_manager boolean default false)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select m.tenant_id, m.role::text into v_tenant, v_role
  from public.tenant_members m
  where m.user_id = auth.uid()
  order by case m.role when 'owner' then 0 when 'admin' then 1 else 2 end
  limit 1;

  if v_tenant is null then
    raise exception 'You do not have a store';
  end if;
  if p_manager and v_role not in ('owner', 'admin') then
    raise exception 'Only the store owner or an admin can do this';
  end if;
  return v_tenant;
end;
$$;

-- One customer = one phone number (last 10 digits, so +234 and 0 prefixes match),
-- falling back to the shopper's account. Walk-ins with neither return null.
create or replace function public.merchant_customer_key(p_phone text, p_user uuid)
returns text
language sql
immutable
as $$
  select coalesce(
    (select case when length(x.d) >= 10 then right(x.d, 10) else nullif(x.d, '') end
     from (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as d) x),
    p_user::text
  );
$$;

-- The single place that decides which fulfilment moves a store may make.
--   delivery order : riders claim paid orders while they are `pending`; the rider's
--                    OTP check completes them. A store may only deliver one itself
--                    (pending -> dispatched -> delivered) when no rider is involved.
--   pickup order   : pending -> delivered once the customer has collected it.
create or replace function public.merchant_transition_order(
  p_order_id uuid,
  p_tenant_id uuid,
  p_status public.order_status
)
returns public.store_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o public.store_orders%rowtype;
begin
  select * into v_o
  from public.store_orders
  where id = p_order_id and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_o.status = p_status then
    return v_o;
  end if;

  if p_status = 'cancelled' then
    raise exception 'Use Cancel order so a reason is recorded and stock is returned';
  end if;

  if v_o.payment_status <> 'paid' then
    raise exception 'Confirm payment before fulfilling this order';
  end if;

  if v_o.status = 'pending' and p_status = 'dispatched' then
    if v_o.channel <> 'online' or v_o.fulfillment_type <> 'delivery' then
      raise exception 'Only delivery orders can be sent out';
    end if;
    if v_o.rider_id is not null then
      raise exception 'A Subtech rider already has this order';
    end if;
  elsif v_o.status = 'pending' and p_status = 'delivered' then
    if v_o.fulfillment_type <> 'pickup' then
      raise exception 'Delivery orders are completed when the customer gives the rider their code';
    end if;
  elsif v_o.status = 'dispatched' and p_status = 'delivered' then
    if v_o.rider_id is not null then
      raise exception 'A Subtech rider is delivering this order; it completes when they confirm the customer''s code';
    end if;
  else
    raise exception 'An order that is % cannot be moved to %', v_o.status, p_status;
  end if;

  update public.store_orders set status = p_status where id = v_o.id returning * into v_o;
  return v_o;
end;
$$;

revoke all on function public.merchant_require_tenant(boolean) from public, anon, authenticated;
revoke all on function public.merchant_customer_key(text, uuid) from public, anon, authenticated;
revoke all on function public.merchant_transition_order(uuid, uuid, public.order_status) from public, anon, authenticated;

-- ============================================================================
-- 4. OVERVIEW + ANALYTICS
-- "Sales" everywhere = paid, not cancelled, excluding the delivery fee (which is the
-- courier's, not the store's), bucketed by Lagos calendar day.
-- ============================================================================
create or replace function public.merchant_overview(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(false);
  v_days integer := least(greatest(coalesce(p_days, 30), 7), 90);
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_from date;
  v_prev_from date;
  v_today_sales numeric;
  v_today_orders integer;
  v_cur_sales numeric;
  v_cur_orders integer;
  v_prev_sales numeric;
  v_prev_orders integer;
  v_series jsonb;
  v_attention jsonb;
  v_products jsonb;
  v_low_items jsonb;
  v_checklist jsonb;
  v_t public.tenants%rowtype;
begin
  v_from := v_today - (v_days - 1);
  v_prev_from := v_from - v_days;

  select
    coalesce(sum(s.net) filter (where s.d = v_today), 0),
    count(*) filter (where s.d = v_today),
    coalesce(sum(s.net) filter (where s.d >= v_from), 0),
    count(*) filter (where s.d >= v_from),
    coalesce(sum(s.net) filter (where s.d < v_from), 0),
    count(*) filter (where s.d < v_from)
  into v_today_sales, v_today_orders, v_cur_sales, v_cur_orders, v_prev_sales, v_prev_orders
  from (
    select (o.created_at at time zone 'Africa/Lagos')::date as d, (o.total - o.delivery_fee) as net
    from public.store_orders o
    where o.tenant_id = v_tenant
      and o.status <> 'cancelled'
      and o.payment_status = 'paid'
      and o.created_at >= (v_prev_from::timestamp at time zone 'Africa/Lagos')
  ) s;

  select coalesce(jsonb_agg(jsonb_build_object(
           'date', d.day, 'sales', coalesce(s.sales, 0), 'orders', coalesce(s.orders, 0)
         ) order by d.day), '[]'::jsonb)
  into v_series
  from (select generate_series(v_from::timestamp, v_today::timestamp, interval '1 day')::date as day) d
  left join (
    select (o.created_at at time zone 'Africa/Lagos')::date as day,
           sum(o.total - o.delivery_fee) as sales,
           count(*) as orders
    from public.store_orders o
    where o.tenant_id = v_tenant
      and o.status <> 'cancelled'
      and o.payment_status = 'paid'
      and (o.created_at at time zone 'Africa/Lagos')::date between v_from and v_today
    group by 1
  ) s on s.day = d.day;

  select jsonb_build_object(
    'newOrders', count(*) filter (where o.status = 'pending' and o.payment_status = 'paid'),
    'awaitingTransferCount', count(*) filter (
      where o.status = 'pending' and o.payment_status = 'unpaid' and o.payment_method = 'Transfer'),
    'awaitingTransferAmount', coalesce(sum(o.total) filter (
      where o.status = 'pending' and o.payment_status = 'unpaid' and o.payment_method = 'Transfer'), 0),
    'awaitingCardCount', count(*) filter (
      where o.status = 'pending' and o.payment_status = 'unpaid' and o.payment_method = 'Card'),
    'inTransit', count(*) filter (where o.status = 'dispatched')
  )
  into v_attention
  from public.store_orders o
  where o.tenant_id = v_tenant and o.status in ('pending', 'dispatched');

  select jsonb_build_object(
    'total', count(*),
    'active', count(*) filter (where p.is_active),
    'outOfStock', count(*) filter (where p.is_active and p.stock = 0),
    'lowStock', count(*) filter (where p.is_active and p.stock > 0 and p.stock <= p.low_stock_threshold)
  )
  into v_products
  from public.catalog_products p
  where p.tenant_id = v_tenant;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'name', x.name, 'stock', x.stock, 'threshold', x.low_stock_threshold
         ) order by x.stock, x.name), '[]'::jsonb)
  into v_low_items
  from (
    select p.id, p.name, p.stock, p.low_stock_threshold
    from public.catalog_products p
    where p.tenant_id = v_tenant and p.is_active and p.stock <= p.low_stock_threshold
    order by p.stock, p.name
    limit 6
  ) x;

  select * into v_t from public.tenants where id = v_tenant;

  select jsonb_build_object(
    'tenantStatus', v_t.status,
    'kycStatus', v_t.kyc_status,
    'acceptingOrders', v_t.accepting_orders,
    'hasAddress', nullif(trim(coalesce(v_t.address, '')), '') is not null,
    'hasPhone', nullif(trim(coalesce(v_t.contact_phone, '')), '') is not null,
    'hasCorridor', nullif(trim(coalesce(v_t.corridor, '')), '') is not null,
    'productCount', (select count(*) from public.catalog_products where tenant_id = v_tenant),
    'hasSettlementAccount', exists (
      select 1 from public.merchant_payout_accounts a
      where a.tenant_id = v_tenant and a.account_number is not null),
    'settlementVerified', exists (
      select 1 from public.merchant_payout_accounts a
      where a.tenant_id = v_tenant and a.is_verified),
    'staffCount', (select count(*) from public.employees where tenant_id = v_tenant),
    'orderCount', (select count(*) from public.store_orders where tenant_id = v_tenant)
  )
  into v_checklist;

  return jsonb_build_object(
    'days', v_days,
    'today', jsonb_build_object('sales', v_today_sales, 'orders', v_today_orders),
    'period', jsonb_build_object(
      'sales', v_cur_sales, 'orders', v_cur_orders,
      'previousSales', v_prev_sales, 'previousOrders', v_prev_orders
    ),
    'series', v_series,
    'attention', v_attention || jsonb_build_object(
      'lowStock', v_products->'lowStock',
      'outOfStock', v_products->'outOfStock',
      'lowStockItems', v_low_items
    ),
    'products', v_products,
    'checklist', v_checklist
  );
end;
$$;

create or replace function public.merchant_analytics(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(false);
  v_days integer := least(greatest(coalesce(p_days, 30), 7), 365);
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_from date;
  v_result jsonb;
begin
  v_from := v_today - (v_days - 1);

  with a as materialized (
    select o.id,
           (o.created_at at time zone 'Africa/Lagos')::date as d,
           extract(hour from (o.created_at at time zone 'Africa/Lagos'))::integer as hr,
           (o.total - o.delivery_fee) as net,
           o.channel,
           o.payment_method as method,
           o.fulfillment_type as fulfillment,
           public.merchant_customer_key(o.customer_phone, o.customer_user_id) as ckey
    from public.store_orders o
    where o.tenant_id = v_tenant
      and o.status <> 'cancelled'
      and o.payment_status = 'paid'
      and (o.created_at at time zone 'Africa/Lagos')::date between v_from and v_today
  ),
  per_customer as (
    select a.ckey, count(*) as n from a where a.ckey is not null group by a.ckey
  )
  select jsonb_build_object(
    'days', v_days,
    'kpis', (
      select jsonb_build_object(
        'sales', coalesce(sum(a.net), 0),
        'orders', count(*),
        'averageOrderValue', case when count(*) = 0 then 0 else round(sum(a.net) / count(*)) end)
      from a),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'date', d.day, 'sales', coalesce(s.sales, 0), 'orders', coalesce(s.orders, 0)
             ) order by d.day), '[]'::jsonb)
      from (select generate_series(v_from::timestamp, v_today::timestamp, interval '1 day')::date as day) d
      left join (select a.d as day, sum(a.net) as sales, count(*) as orders from a group by a.d) s
        on s.day = d.day),
    'topProducts', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'name', t.name, 'units', t.units, 'sales', t.sales
             ) order by t.sales desc, t.name), '[]'::jsonb)
      from (
        select max(i.product_name) as name, sum(i.quantity) as units, sum(i.line_total) as sales
        from public.order_items i
        join a on a.id = i.order_id
        group by coalesce(i.product_id::text, i.product_name)
        order by sum(i.line_total) desc, max(i.product_name)
        limit 8
      ) t),
    'channels', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'channel', c.channel, 'orders', c.orders, 'sales', c.sales
             ) order by c.sales desc), '[]'::jsonb)
      from (select a.channel, count(*) as orders, sum(a.net) as sales from a group by a.channel) c),
    'paymentMethods', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'method', m.method, 'orders', m.orders, 'sales', m.sales
             ) order by m.sales desc), '[]'::jsonb)
      from (select a.method, count(*) as orders, sum(a.net) as sales from a group by a.method) m),
    'byHour', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'hour', h.hr, 'orders', coalesce(c.n, 0)
             ) order by h.hr), '[]'::jsonb)
      from generate_series(0, 23) as h(hr)
      left join (select a.hr, count(*) as n from a group by a.hr) c on c.hr = h.hr),
    'statusCounts', (
      select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
      from (
        select o.status::text as status, count(*) as n
        from public.store_orders o
        where o.tenant_id = v_tenant
          and (o.created_at at time zone 'Africa/Lagos')::date between v_from and v_today
        group by o.status
      ) s),
    'customers', jsonb_build_object(
      'identified', (select count(*) from per_customer),
      'repeat', (select count(*) from per_customer where n >= 2),
      'walkInOrders', (select count(*) from a where a.ckey is null)),
    'fulfilment', (
      select jsonb_build_object(
        'delivery', count(*) filter (where a.fulfillment = 'delivery'),
        'pickup', count(*) filter (where a.fulfillment = 'pickup'))
      from a where a.channel = 'online')
  )
  into v_result;

  return v_result;
end;
$$;

-- ============================================================================
-- 5. ORDERS
-- ============================================================================
create or replace function public.merchant_list_orders(
  p_view text default 'all',
  p_search text default null,
  p_channel text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(false);
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_view text := coalesce(nullif(p_view, ''), 'all');
  v_q text := lower(nullif(trim(coalesce(p_search, '')), ''));
  v_code text;
  v_counts jsonb;
  v_total integer;
  v_rows jsonb;
begin
  v_code := replace(regexp_replace(coalesce(v_q, ''), '^ord-', ''), '-', '');

  with base as (
    select o.*
    from public.store_orders o
    where o.tenant_id = v_tenant
      and (nullif(p_channel, '') is null or o.channel = p_channel)
      and (
        v_q is null
        or strpos(lower(o.customer_name), v_q) > 0
        or strpos(coalesce(o.customer_phone, ''), v_q) > 0
        or (v_code <> '' and replace(o.id::text, '-', '') like v_code || '%')
      )
  ),
  counts as (
    select jsonb_build_object(
      'all', count(*),
      'new', count(*) filter (where b.status = 'pending' and b.payment_status = 'paid'),
      'awaiting_payment', count(*) filter (where b.status = 'pending' and b.payment_status = 'unpaid'),
      'in_transit', count(*) filter (where b.status = 'dispatched'),
      'delivered', count(*) filter (where b.status = 'delivered'),
      'cancelled', count(*) filter (where b.status = 'cancelled')
    ) as j
    from base b
  ),
  scoped as (
    select b.*
    from base b
    where case v_view
      when 'new' then b.status = 'pending' and b.payment_status = 'paid'
      when 'awaiting_payment' then b.status = 'pending' and b.payment_status = 'unpaid'
      when 'in_transit' then b.status = 'dispatched'
      when 'delivered' then b.status = 'delivered'
      when 'cancelled' then b.status = 'cancelled'
      else true
    end
  ),
  page as (
    select s.* from scoped s order by s.created_at desc limit v_limit offset v_offset
  )
  select
    (select j from counts),
    (select count(*) from scoped),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'createdAt', p.created_at,
        'channel', p.channel,
        'status', p.status,
        'paymentStatus', p.payment_status,
        'paymentMethod', p.payment_method,
        'fulfillmentType', p.fulfillment_type,
        'customerName', p.customer_name,
        'customerPhone', p.customer_phone,
        'address', p.address,
        'total', p.total,
        'deliveryFee', p.delivery_fee,
        'itemsSummary', p.items_summary,
        'itemCount', coalesce((select sum(i.quantity) from public.order_items i where i.order_id = p.id), 0),
        'hasRider', p.rider_id is not null,
        'readyAt', p.ready_at,
        'cashier', p.cashier_name
      ) order by p.created_at desc)
      from page p
    ), '[]'::jsonb)
  into v_counts, v_total, v_rows;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'counts', v_counts);
end;
$$;

create or replace function public.merchant_get_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(false);
  v_o public.store_orders%rowtype;
  v_items jsonb;
  v_rider jsonb;
begin
  select * into v_o from public.store_orders where id = p_order_id and tenant_id = v_tenant;
  if not found then
    raise exception 'Order not found';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', i.id, 'productId', i.product_id, 'name', i.product_name,
           'quantity', i.quantity, 'unitPrice', i.unit_price, 'lineTotal', i.line_total
         ) order by i.created_at), '[]'::jsonb)
  into v_items
  from public.order_items i
  where i.order_id = v_o.id;

  select jsonb_build_object(
           'name', p.full_name, 'phone', p.phone,
           'vehicleType', r.vehicle_type, 'plate', r.vehicle_plate_number)
  into v_rider
  from public.riders r
  join public.profiles p on p.id = r.user_id
  where r.id = v_o.rider_id;

  -- The delivery code belongs to the customer and rider, so it is deliberately absent.
  return jsonb_build_object(
    'id', v_o.id,
    'createdAt', v_o.created_at,
    'channel', v_o.channel,
    'status', v_o.status,
    'paymentStatus', v_o.payment_status,
    'paymentMethod', v_o.payment_method,
    'paymentReference', v_o.payment_reference,
    'fulfillmentType', v_o.fulfillment_type,
    'customerName', v_o.customer_name,
    'customerPhone', v_o.customer_phone,
    'address', v_o.address,
    'total', v_o.total,
    'deliveryFee', v_o.delivery_fee,
    'amountTendered', v_o.amount_tendered,
    'changeDue', v_o.change_due,
    'cashier', v_o.cashier_name,
    'items', v_items,
    'itemsSummary', v_o.items_summary,
    'rider', v_rider,
    'courierName', v_o.courier_name,
    'courierPhone', v_o.courier_phone,
    'readyAt', v_o.ready_at,
    'dispatchedAt', v_o.dispatched_at,
    'pickedUpAt', v_o.picked_up_at,
    'deliveredAt', v_o.delivered_at,
    'voidedAt', v_o.voided_at,
    'voidReason', v_o.void_reason,
    'voidedBy', v_o.voided_by
  );
end;
$$;

create or replace function public.merchant_update_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(false);
  v_o public.store_orders;
begin
  v_o := public.merchant_transition_order(p_order_id, v_tenant, p_status);
  return jsonb_build_object('id', v_o.id, 'status', v_o.status);
end;
$$;

create or replace function public.merchant_mark_order_ready(p_order_id uuid, p_ready boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(false);
  v_o public.store_orders%rowtype;
begin
  select * into v_o from public.store_orders where id = p_order_id and tenant_id = v_tenant for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_o.status <> 'pending' then
    raise exception 'Only orders waiting to be packed can be marked ready';
  end if;
  if v_o.payment_status <> 'paid' then
    raise exception 'Confirm payment before packing this order';
  end if;

  update public.store_orders
  set ready_at = case when coalesce(p_ready, true) then coalesce(ready_at, now()) else null end
  where id = v_o.id
  returning * into v_o;

  return jsonb_build_object('id', v_o.id, 'readyAt', v_o.ready_at);
end;
$$;

-- Hardened: managers only, transfer orders only, never on a cancelled order.
create or replace function public.merchant_mark_order_paid(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(true);
  v_order public.store_orders%rowtype;
begin
  select * into v_order from public.store_orders where id = p_order_id and tenant_id = v_tenant for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.payment_method <> 'Transfer' then
    raise exception 'Only bank-transfer orders can be marked paid manually';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'This order was cancelled; its stock has already been returned';
  end if;
  if v_order.payment_status = 'paid' then
    return jsonb_build_object('order_id', p_order_id, 'payment_status', 'paid');
  end if;
  if v_order.payment_status <> 'unpaid' then
    raise exception 'This order is % and cannot be marked paid', v_order.payment_status;
  end if;

  update public.store_orders set payment_status = 'paid' where id = p_order_id;
  return jsonb_build_object('order_id', p_order_id, 'payment_status', 'paid');
end;
$$;

-- Cancel an order that has not been picked up: stock returns to the shelf, a reason is
-- kept. Money is NOT moved; the dashboard tells the owner to refund by hand and lets
-- them record that they did.
create or replace function public.merchant_cancel_order(
  p_order_id uuid,
  p_reason text,
  p_refunded boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(true);
  v_o public.store_orders%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_by text;
begin
  if v_reason is null then
    raise exception 'Add a reason for cancelling this order';
  end if;
  if length(v_reason) > 300 then
    raise exception 'Keep the reason under 300 characters';
  end if;

  select * into v_o from public.store_orders where id = p_order_id and tenant_id = v_tenant for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_o.status not in ('pending', 'dispatched') then
    raise exception 'Only open orders can be cancelled (this one is %)', v_o.status;
  end if;
  if v_o.rider_id is not null then
    raise exception 'A Subtech rider has already taken this order. Contact Subtech support to cancel it.';
  end if;

  update public.catalog_products p
  set stock = p.stock + i.quantity
  from public.order_items i
  where i.order_id = v_o.id and i.product_id = p.id and p.tenant_id = v_o.tenant_id;

  select coalesce(nullif(trim(pr.full_name), ''), 'Store owner') into v_by
  from public.profiles pr where pr.id = auth.uid();

  update public.store_orders
  set status = 'cancelled',
      voided_at = now(),
      void_reason = v_reason,
      voided_by = coalesce(v_by, 'Store owner'),
      payment_status = case
        when payment_status = 'paid' and coalesce(p_refunded, false) then 'refunded'
        when payment_status = 'unpaid' then 'failed'
        else payment_status
      end
  where id = v_o.id;

  return jsonb_build_object('id', v_o.id, 'status', 'cancelled');
end;
$$;

-- PIN staff (online sales reps) -------------------------------------------------
create or replace function public.staff_online_orders(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
begin
  v_employee := public.staff_session_employee(p_token);

  if v_employee.employee_type <> 'online_rep' then
    raise exception 'This account cannot view online orders';
  end if;

  return coalesce((
    select jsonb_agg(x.j order by x.created_at desc)
    from (
      select o.created_at,
             -- delivery_otp is the customer's code for the rider; staff never see it
             (to_jsonb(o) - 'delivery_otp') || jsonb_build_object(
               'order_items', coalesce((
                 select jsonb_agg(to_jsonb(oi) order by oi.created_at)
                 from public.order_items oi
                 where oi.order_id = o.id
               ), '[]'::jsonb)
             ) as j
      from public.store_orders o
      where o.tenant_id = v_employee.tenant_id
      order by o.created_at desc
      limit 200
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.staff_update_order_status(
  p_token text,
  p_order_id uuid,
  p_status public.order_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
  v_order public.store_orders;
begin
  v_employee := public.staff_session_employee(p_token);

  if v_employee.employee_type <> 'online_rep' then
    raise exception 'This account cannot manage online orders';
  end if;

  v_order := public.merchant_transition_order(p_order_id, v_employee.tenant_id, p_status);

  return (to_jsonb(v_order) - 'delivery_otp') || jsonb_build_object(
    'order_items', coalesce((
      select jsonb_agg(to_jsonb(oi) order by oi.created_at)
      from public.order_items oi
      where oi.order_id = v_order.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.staff_mark_order_ready(
  p_token text,
  p_order_id uuid,
  p_ready boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
  v_o public.store_orders%rowtype;
begin
  v_employee := public.staff_session_employee(p_token);

  if v_employee.employee_type <> 'online_rep' then
    raise exception 'This account cannot manage online orders';
  end if;

  select * into v_o
  from public.store_orders
  where id = p_order_id and tenant_id = v_employee.tenant_id
  for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_o.status <> 'pending' then
    raise exception 'Only orders waiting to be packed can be marked ready';
  end if;
  if v_o.payment_status <> 'paid' then
    raise exception 'The owner must confirm payment before this order is packed';
  end if;

  update public.store_orders
  set ready_at = case when coalesce(p_ready, true) then coalesce(ready_at, now()) else null end
  where id = v_o.id
  returning * into v_o;

  return jsonb_build_object('id', v_o.id, 'readyAt', v_o.ready_at);
end;
$$;

-- ============================================================================
-- 6. PRODUCTS
-- ============================================================================
create or replace function public.merchant_list_products(
  p_view text default 'all',
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(false);
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_view text := coalesce(nullif(p_view, ''), 'all');
  v_q text := lower(nullif(trim(coalesce(p_search, '')), ''));
  v_counts jsonb;
  v_total integer;
  v_rows jsonb;
begin
  with base as (
    select p.*
    from public.catalog_products p
    where p.tenant_id = v_tenant
      and (
        v_q is null
        or strpos(lower(p.name), v_q) > 0
        or strpos(lower(coalesce(p.barcode, '')), v_q) > 0
        or strpos(lower(coalesce(p.category, '')), v_q) > 0
      )
  ),
  counts as (
    select jsonb_build_object(
      'all', count(*),
      'active', count(*) filter (where b.is_active),
      'inactive', count(*) filter (where not b.is_active),
      'low', count(*) filter (where b.is_active and b.stock > 0 and b.stock <= b.low_stock_threshold),
      'out', count(*) filter (where b.is_active and b.stock = 0)
    ) as j
    from base b
  ),
  scoped as (
    select b.*
    from base b
    where case v_view
      when 'active' then b.is_active
      when 'inactive' then not b.is_active
      when 'low' then b.is_active and b.stock > 0 and b.stock <= b.low_stock_threshold
      when 'out' then b.is_active and b.stock = 0
      else true
    end
  ),
  page as (
    select s.* from scoped s order by s.created_at desc, s.name limit v_limit offset v_offset
  )
  select
    (select j from counts),
    (select count(*) from scoped),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'category', p.category,
        'price', p.price,
        'cost', p.cost,
        'stock', p.stock,
        'lowStockThreshold', p.low_stock_threshold,
        'imageUrl', p.image_url,
        'barcode', p.barcode,
        'isActive', p.is_active,
        'createdAt', p.created_at
      ) order by p.created_at desc, p.name)
      from page p
    ), '[]'::jsonb)
  into v_counts, v_total, v_rows;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'counts', v_counts);
end;
$$;

-- Bulk CSV import. Rows with a barcode/SKU update the product that already has it
-- (price, cost, stock, category, name); rows without one always create a new product.
-- Each row succeeds or fails alone, and failures come back with their row number.
create or replace function public.merchant_import_products(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(true);
  v_row jsonb;
  v_idx integer := 0;
  v_created integer := 0;
  v_updated integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_name text;
  v_price numeric;
  v_cost numeric;
  v_stock integer;
  v_category text;
  v_barcode text;
  v_id uuid;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Nothing to import';
  end if;
  if jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 500 then
    raise exception 'Import between 1 and 500 products at a time';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_idx := v_idx + 1;
    begin
      v_name := nullif(trim(v_row->>'name'), '');
      v_barcode := nullif(trim(coalesce(v_row->>'barcode', v_row->>'sku', '')), '');
      v_category := coalesce(nullif(trim(v_row->>'category'), ''), 'General Retail');
      v_price := (v_row->>'price')::numeric;
      v_cost := coalesce(nullif(v_row->>'cost', '')::numeric, 0);
      v_stock := (v_row->>'stock')::integer;

      if v_name is null then raise exception 'Missing product name'; end if;
      if v_price is null or v_price < 0 then raise exception 'Invalid price'; end if;
      if v_cost < 0 then raise exception 'Invalid cost'; end if;
      if v_stock is null or v_stock < 0 then raise exception 'Invalid stock'; end if;

      v_id := null;
      if v_barcode is not null then
        select p.id into v_id
        from public.catalog_products p
        where p.tenant_id = v_tenant and p.barcode = v_barcode
        order by p.created_at
        limit 1;
      end if;

      if v_id is not null then
        update public.catalog_products
        set name = v_name, category = v_category, price = v_price, cost = v_cost, stock = v_stock
        where id = v_id;
        v_updated := v_updated + 1;
      else
        insert into public.catalog_products (tenant_id, name, category, price, cost, stock, barcode)
        values (v_tenant, v_name, v_category, v_price, v_cost, v_stock, v_barcode);
        v_created := v_created + 1;
      end if;
    exception when others then
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object('row', v_idx, 'message', sqlerrm));
    end;
  end loop;

  return jsonb_build_object('created', v_created, 'updated', v_updated, 'errors', v_errors);
end;
$$;

-- Atomic restock / write-off. A plain "set stock to N" from the browser can overwrite
-- units that were sold a moment earlier; adding a delta cannot.
create or replace function public.merchant_adjust_stock(p_product_id uuid, p_delta integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(true);
  v_stock integer;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    raise exception 'Enter a number of units to add or remove';
  end if;

  update public.catalog_products
  set stock = stock + p_delta
  where id = p_product_id and tenant_id = v_tenant and stock + p_delta >= 0
  returning stock into v_stock;

  if not found then
    if exists (select 1 from public.catalog_products where id = p_product_id and tenant_id = v_tenant) then
      raise exception 'You cannot remove more units than you have in stock';
    end if;
    raise exception 'Product not found';
  end if;

  return jsonb_build_object('id', p_product_id, 'stock', v_stock);
end;
$$;

-- ============================================================================
-- 7. CUSTOMERS (derived from orders, never typed in by hand)
-- ============================================================================
create or replace function public.merchant_list_customers(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(false);
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_q text := lower(nullif(trim(coalesce(p_search, '')), ''));
  v_total integer;
  v_rows jsonb;
  v_walk_in integer;
begin
  with keyed as (
    select o.*, public.merchant_customer_key(o.customer_phone, o.customer_user_id) as ckey
    from public.store_orders o
    where o.tenant_id = v_tenant and o.status <> 'cancelled'
  ),
  grouped as (
    select
      k.ckey,
      (array_agg(k.customer_name order by k.created_at desc))[1] as name,
      (array_agg(k.customer_phone order by k.created_at desc) filter (where k.customer_phone is not null))[1] as phone,
      (array_agg(k.address order by k.created_at desc) filter (where k.fulfillment_type = 'delivery' and k.address is not null))[1] as address,
      count(*) as orders,
      coalesce(sum(k.total - k.delivery_fee) filter (where k.payment_status = 'paid'), 0) as spend,
      min(k.created_at) as first_order_at,
      max(k.created_at) as last_order_at,
      count(*) filter (where k.channel = 'online') as online_orders,
      count(*) filter (where k.channel = 'counter') as counter_orders
    from keyed k
    where k.ckey is not null
    group by k.ckey
  ),
  filtered as (
    select g.* from grouped g
    where v_q is null
       or strpos(lower(coalesce(g.name, '')), v_q) > 0
       or strpos(coalesce(g.phone, ''), v_q) > 0
  ),
  page as (
    select f.* from filtered f order by f.last_order_at desc limit v_limit offset v_offset
  )
  select
    (select count(*) from filtered),
    (select count(*) from keyed where ckey is null),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', p.ckey, 'name', p.name, 'phone', p.phone, 'address', p.address,
        'orders', p.orders, 'spend', p.spend,
        'firstOrderAt', p.first_order_at, 'lastOrderAt', p.last_order_at,
        'onlineOrders', p.online_orders, 'counterOrders', p.counter_orders
      ) order by p.last_order_at desc)
      from page p
    ), '[]'::jsonb)
  into v_total, v_walk_in, v_rows;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'walkInOrders', v_walk_in);
end;
$$;

-- ============================================================================
-- 8. STAFF
-- ============================================================================
create or replace function public.merchant_list_employees()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(true);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id,
      'fullName', e.full_name,
      'employeeType', e.employee_type,
      'tillRole', e.till_role,
      'isActive', e.is_active,
      'lockedUntil', e.pin_locked_until,
      'createdAt', e.created_at,
      'lastSignInAt', (
        select max(s.created_at) from public.employee_sessions s where s.employee_id = e.id)
    ) order by e.created_at desc)
    from public.employees e
    where e.tenant_id = v_tenant
  ), '[]'::jsonb);
end;
$$;

-- ============================================================================
-- 9. STORE PROFILE + SETTLEMENT ACCOUNT
-- ============================================================================
create or replace function public.merchant_get_store()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(false);
  v_t public.tenants%rowtype;
begin
  select * into v_t from public.tenants where id = v_tenant;
  return jsonb_build_object(
    'id', v_t.id,
    'slug', v_t.slug,
    'tradingName', v_t.trading_name,
    'category', v_t.category,
    'contactEmail', v_t.contact_email,
    'contactPhone', v_t.contact_phone,
    'address', v_t.address,
    'state', v_t.state,
    'city', v_t.city,
    'lga', v_t.lga,
    'corridor', v_t.corridor,
    'hasPhysicalStore', v_t.has_physical_store,
    'acceptingOrders', v_t.accepting_orders,
    'businessDescription', v_t.business_description,
    'websiteOrSocial', v_t.website_or_social,
    'status', v_t.status,
    'kycStatus', v_t.kyc_status,
    'createdAt', v_t.created_at
  );
end;
$$;

-- Replaces the store half of update_merchant_store without touching the settlement
-- account (which now has its own function and its own verification rules).
create or replace function public.merchant_update_store_profile(
  p_trading_name text,
  p_category text,
  p_slug text,
  p_address text,
  p_contact_phone text,
  p_has_physical_store boolean,
  p_state text,
  p_city text,
  p_lga text,
  p_corridor text,
  p_business_description text,
  p_website_or_social text,
  p_accepting_orders boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.merchant_require_tenant(true);
  v_t public.tenants%rowtype;
  v_name text := trim(coalesce(p_trading_name, ''));
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_phone text := nullif(trim(coalesce(p_contact_phone, '')), '');
begin
  select * into v_t from public.tenants where id = v_tenant_id;

  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'Store name must be 2 to 80 characters';
  end if;
  if v_phone is not null and v_phone !~ '^[+0-9 ()-]{7,20}$' then
    raise exception 'Enter a valid phone number';
  end if;

  if v_slug is distinct from v_t.slug then
    if not public.is_slug_available(v_slug) then
      raise exception 'That store URL is not available';
    end if;
  end if;

  update public.tenants
  set trading_name = v_name,
      category = coalesce(nullif(trim(coalesce(p_category, '')), ''), category),
      slug = v_slug,
      address = nullif(trim(coalesce(p_address, '')), ''),
      contact_phone = v_phone,
      has_physical_store = coalesce(p_has_physical_store, has_physical_store),
      state = nullif(trim(coalesce(p_state, '')), ''),
      city = nullif(trim(coalesce(p_city, '')), ''),
      lga = nullif(trim(coalesce(p_lga, '')), ''),
      corridor = nullif(trim(coalesce(p_corridor, '')), ''),
      business_description = nullif(trim(coalesce(p_business_description, '')), ''),
      website_or_social = nullif(trim(coalesce(p_website_or_social, '')), ''),
      accepting_orders = coalesce(p_accepting_orders, accepting_orders)
  where id = v_tenant_id
  returning * into v_t;

  return jsonb_build_object('id', v_t.id, 'slug', v_t.slug, 'trading_name', v_t.trading_name);
end;
$$;

create or replace function public.merchant_get_payouts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.merchant_require_tenant(false);
  v_is_manager boolean := public.is_tenant_manager(v_tenant);
  v_t public.tenants%rowtype;
  v_account jsonb;
  v_sub jsonb;
  v_collected jsonb;
begin
  select * into v_t from public.tenants where id = v_tenant;

  select jsonb_build_object(
           'bankName', a.bank_name,
           'accountNumber', case when v_is_manager then a.account_number
                                 else '******' || right(coalesce(a.account_number, ''), 4) end,
           'accountName', a.account_name,
           'isVerified', a.is_verified,
           'updatedAt', a.updated_at)
  into v_account
  from public.merchant_payout_accounts a
  where a.tenant_id = v_tenant;

  select jsonb_build_object(
           'planTier', s.plan_tier, 'status', s.status, 'billingCycle', s.billing_cycle,
           'amount', s.amount, 'currentPeriodEnd', s.current_period_end)
  into v_sub
  from public.subscriptions s
  where s.tenant_id = v_tenant
  order by s.created_at desc
  limit 1;

  -- What customers have paid for the store's goods (delivery fees belong to the courier).
  select jsonb_build_object(
    'onlineCard', coalesce(sum(o.total - o.delivery_fee) filter (
      where o.channel = 'online' and o.payment_method = 'Card'), 0),
    'onlineTransfer', coalesce(sum(o.total - o.delivery_fee) filter (
      where o.channel = 'online' and o.payment_method = 'Transfer'), 0),
    'counter', coalesce(sum(o.total - o.delivery_fee) filter (where o.channel = 'counter'), 0),
    'awaitingTransfer', (
      select coalesce(sum(w.total), 0) from public.store_orders w
      where w.tenant_id = v_tenant and w.status = 'pending'
        and w.payment_status = 'unpaid' and w.payment_method = 'Transfer')
  )
  into v_collected
  from public.store_orders o
  where o.tenant_id = v_tenant and o.status <> 'cancelled' and o.payment_status = 'paid';

  return jsonb_build_object(
    'account', v_account,
    'tenantStatus', v_t.status,
    'kycStatus', v_t.kyc_status,
    'subscription', v_sub,
    'collected', v_collected
  );
end;
$$;

create or replace function public.merchant_save_payout_account(
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
  v_tenant uuid := public.merchant_require_tenant(true);
  v_bank text := nullif(trim(coalesce(p_bank_name, '')), '');
  v_number text := nullif(trim(coalesce(p_account_number, '')), '');
  v_name text := nullif(trim(coalesce(p_account_name, '')), '');
  v_a public.merchant_payout_accounts%rowtype;
begin
  if v_bank is null then
    raise exception 'Choose your bank';
  end if;
  if v_number is null or v_number !~ '^[0-9]{10}$' then
    raise exception 'Account number must be a 10-digit NUBAN';
  end if;
  if v_name is null or length(v_name) < 3 then
    raise exception 'Enter the account name exactly as your bank shows it';
  end if;

  insert into public.merchant_payout_accounts (tenant_id, bank_name, account_number, account_name)
  values (v_tenant, v_bank, v_number, v_name)
  on conflict (tenant_id) do update set
    bank_name = excluded.bank_name,
    account_number = excluded.account_number,
    account_name = excluded.account_name
  returning * into v_a;

  return jsonb_build_object(
    'bankName', v_a.bank_name,
    'accountNumber', v_a.account_number,
    'accountName', v_a.account_name,
    'isVerified', v_a.is_verified
  );
end;
$$;

-- ============================================================================
-- 10. GRANTS
-- ============================================================================
revoke all on function public.merchant_overview(integer) from public, anon;
revoke all on function public.merchant_analytics(integer) from public, anon;
revoke all on function public.merchant_list_orders(text, text, text, integer, integer) from public, anon;
revoke all on function public.merchant_get_order(uuid) from public, anon;
revoke all on function public.merchant_update_order_status(uuid, public.order_status) from public, anon;
revoke all on function public.merchant_mark_order_ready(uuid, boolean) from public, anon;
revoke all on function public.merchant_mark_order_paid(uuid) from public, anon;
revoke all on function public.merchant_cancel_order(uuid, text, boolean) from public, anon;
revoke all on function public.merchant_list_products(text, text, integer, integer) from public, anon;
revoke all on function public.merchant_import_products(jsonb) from public, anon;
revoke all on function public.merchant_adjust_stock(uuid, integer) from public, anon;
revoke all on function public.merchant_list_customers(text, integer, integer) from public, anon;
revoke all on function public.merchant_list_employees() from public, anon;
revoke all on function public.merchant_get_store() from public, anon;
revoke all on function public.merchant_update_store_profile(
  text, text, text, text, text, boolean, text, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.merchant_get_payouts() from public, anon;
revoke all on function public.merchant_save_payout_account(text, text, text) from public, anon;
revoke all on function public.staff_online_orders(text) from public;
revoke all on function public.staff_update_order_status(text, uuid, public.order_status) from public;
revoke all on function public.staff_mark_order_ready(text, uuid, boolean) from public;

grant execute on function public.merchant_overview(integer) to authenticated;
grant execute on function public.merchant_analytics(integer) to authenticated;
grant execute on function public.merchant_list_orders(text, text, text, integer, integer) to authenticated;
grant execute on function public.merchant_get_order(uuid) to authenticated;
grant execute on function public.merchant_update_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.merchant_mark_order_ready(uuid, boolean) to authenticated;
grant execute on function public.merchant_mark_order_paid(uuid) to authenticated;
grant execute on function public.merchant_cancel_order(uuid, text, boolean) to authenticated;
grant execute on function public.merchant_list_products(text, text, integer, integer) to authenticated;
grant execute on function public.merchant_import_products(jsonb) to authenticated;
grant execute on function public.merchant_adjust_stock(uuid, integer) to authenticated;
grant execute on function public.merchant_list_customers(text, integer, integer) to authenticated;
grant execute on function public.merchant_list_employees() to authenticated;
grant execute on function public.merchant_get_store() to authenticated;
grant execute on function public.merchant_update_store_profile(
  text, text, text, text, text, boolean, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.merchant_get_payouts() to authenticated;
grant execute on function public.merchant_save_payout_account(text, text, text) to authenticated;
-- Staff sign in without a Supabase Auth session, so these stay callable as anon.
grant execute on function public.staff_online_orders(text) to anon, authenticated;
grant execute on function public.staff_update_order_status(text, uuid, public.order_status) to anon, authenticated;
grant execute on function public.staff_mark_order_ready(text, uuid, boolean) to anon, authenticated;
