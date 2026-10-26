-- Migration: Courier Dispatch Loop, Till Shift & Cash Drawer (X/Z Reports), Super Admin & Multi-Branch
-- Date: 2026-10-26

-- ============================================================================
-- 1. ENHANCE STORE_ORDERS FOR DISPATCH & RIDER ASSIGNMENT
-- ============================================================================
alter table public.store_orders
  add column if not exists rider_id uuid references public.riders(id) on delete set null,
  add column if not exists courier_fare numeric(12,2) default 1850,
  add column if not exists courier_tip numeric(12,2) default 0,
  add column if not exists shift_id uuid;

create index if not exists idx_store_orders_rider on public.store_orders (rider_id, status);

-- Rider Payouts Table
create table if not exists public.rider_payouts (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  bank_name text not null,
  account_number text not null,
  account_name text,
  status text not null default 'completed' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_rider_payouts_rider on public.rider_payouts (rider_id, created_at desc);

-- ============================================================================
-- 2. TILL SHIFTS & CASH DRAWER (X/Z REPORTS)
-- ============================================================================
create table if not exists public.till_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_float numeric(12,2) not null default 0,
  cash_drops numeric(12,2) not null default 0,
  cash_sales numeric(12,2) not null default 0,
  card_sales numeric(12,2) not null default 0,
  transfer_sales numeric(12,2) not null default 0,
  total_sales numeric(12,2) not null default 0,
  expected_cash numeric(12,2) not null default 0,
  actual_cash numeric(12,2),
  variance numeric(12,2),
  notes text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_till_shifts_tenant on public.till_shifts (tenant_id, opened_at desc);
create index if not exists idx_till_shifts_employee on public.till_shifts (employee_id, status);

create table if not exists public.till_cash_drops (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.till_shifts(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  authorized_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_till_cash_drops_shift on public.till_cash_drops (shift_id);

-- ============================================================================
-- 3. PLATFORM ADMIN & MULTI-BRANCH SCHEMA
-- ============================================================================
-- Add platform admin flag to profiles
alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

-- Store Branches Table
create table if not exists public.store_branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  code text,
  address text,
  city text,
  state text,
  phone text,
  is_main boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_branches_tenant on public.store_branches (tenant_id);

-- Subscriptions Table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_tier text not null default 'starter' check (plan_tier in ('starter', 'growth', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled', 'trialing')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  amount numeric(12,2) not null default 15000,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_tenant on public.subscriptions (tenant_id);

-- ============================================================================
-- 4. RPCs: RIDER DISPATCH, OTP & WALLET
-- ============================================================================

-- RPC: get_available_dispatches
create or replace function public.get_available_dispatches()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispatches jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'orderId', o.id,
      'storeName', t.trading_name,
      'storeAddress', coalesce(t.address, 'Store location'),
      'storePhone', coalesce(t.contact_phone, '+2348000000000'),
      'customerName', o.customer_name,
      'customerAddress', coalesce(o.address, 'Customer Doorstep'),
      'customerPhone', coalesce(o.customer_phone, '+2348000000000'),
      'distanceKm', '2.4 km',
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
    and o.status in ('pending', 'dispatched')
    and o.rider_id is null;

  return v_dispatches;
end;
$$;

-- RPC: accept_order_dispatch(p_order_id)
create or replace function public.accept_order_dispatch(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rider public.riders%rowtype;
  v_profile public.profiles%rowtype;
  v_order public.store_orders%rowtype;
  v_tenant public.tenants%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rider from public.riders where user_id = v_user_id limit 1;
  if not found then
    raise exception 'Rider profile not found';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;

  select * into v_order from public.store_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.rider_id is not null and v_order.rider_id <> v_rider.id then
    raise exception 'This order has already been claimed by another rider';
  end if;

  select * into v_tenant from public.tenants where id = v_order.tenant_id;

  update public.store_orders
  set
    rider_id = v_rider.id,
    courier_name = coalesce(v_profile.full_name, 'Courier Rider'),
    courier_phone = coalesce(v_profile.phone, v_rider.next_of_kin_phone),
    status = 'dispatched',
    courier_fare = coalesce(courier_fare, 1850),
    updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object(
    'orderId', v_order.id,
    'storeName', v_tenant.trading_name,
    'storeAddress', coalesce(v_tenant.address, 'Store pickup'),
    'storePhone', coalesce(v_tenant.contact_phone, '+2348000000000'),
    'customerName', v_order.customer_name,
    'customerAddress', coalesce(v_order.address, 'Doorstep Delivery'),
    'customerPhone', coalesce(v_order.customer_phone, '+2348000000000'),
    'fare', coalesce(v_order.courier_fare, 1850),
    'tip', coalesce(v_order.courier_tip, 0),
    'itemsSummary', coalesce(v_order.items_summary, 'Retail Package'),
    'otp', v_order.delivery_otp,
    'status', v_order.status
  );
end;
$$;

-- RPC: verify_order_delivery(p_order_id, p_otp)
create or replace function public.verify_order_delivery(p_order_id uuid, p_otp text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rider public.riders%rowtype;
  v_order public.store_orders%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rider from public.riders where user_id = v_user_id limit 1;
  if not found then
    raise exception 'Rider profile not found';
  end if;

  select * into v_order from public.store_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.rider_id <> v_rider.id then
    raise exception 'This order is not assigned to you';
  end if;

  if v_order.delivery_otp is not null and trim(v_order.delivery_otp) <> trim(coalesce(p_otp, '')) then
    raise exception 'Invalid 4-digit handover OTP. Please verify with customer.';
  end if;

  update public.store_orders
  set
    status = 'delivered',
    updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object(
    'orderId', v_order.id,
    'status', 'delivered',
    'fare', coalesce(v_order.courier_fare, 1850),
    'tip', coalesce(v_order.courier_tip, 0)
  );
end;
$$;

-- RPC: get_rider_wallet()
create or replace function public.get_rider_wallet()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rider public.riders%rowtype;
  v_total_earned numeric(12,2) := 0;
  v_total_paid numeric(12,2) := 0;
  v_balance numeric(12,2) := 0;
  v_trips jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rider from public.riders where user_id = v_user_id limit 1;
  if not found then
    return jsonb_build_object(
      'balance', 0,
      'trips', '[]'::jsonb,
      'todayTrips', 0,
      'tips', 0
    );
  end if;

  -- Compute total earnings from delivered trips
  select coalesce(sum(courier_fare + courier_tip), 0)
  into v_total_earned
  from public.store_orders
  where rider_id = v_rider.id and status = 'delivered';

  -- Compute completed cashouts
  select coalesce(sum(amount), 0)
  into v_total_paid
  from public.rider_payouts
  where rider_id = v_rider.id and status = 'completed';

  v_balance := greatest(0, v_total_earned - v_total_paid);

  -- Fetch recent completed trips
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', 'TRIP-' || substr(o.id::text, 1, 6),
      'orderId', o.id,
      'store', t.trading_name,
      'customer', o.customer_name || ' (' || coalesce(substr(o.address, 1, 20), 'Lagos') || ')',
      'fare', coalesce(o.courier_fare, 1850),
      'tip', coalesce(o.courier_tip, 0),
      'time', to_char(o.updated_at, 'HH12:MI AM')
    ) order by o.updated_at desc
  ), '[]'::jsonb)
  into v_trips
  from public.store_orders o
  join public.tenants t on t.id = o.tenant_id
  where o.rider_id = v_rider.id and o.status = 'delivered'
  limit 20;

  return jsonb_build_object(
    'balance', v_balance,
    'totalEarned', v_total_earned,
    'trips', v_trips,
    'todayTrips', jsonb_array_length(v_trips),
    'bankName', 'Guaranty Trust Bank',
    'accountNumber', '0192837465'
  );
end;
$$;

-- RPC: request_rider_cashout
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
  v_user_id uuid := auth.uid();
  v_rider public.riders%rowtype;
  v_total_earned numeric(12,2) := 0;
  v_total_paid numeric(12,2) := 0;
  v_balance numeric(12,2) := 0;
  v_payout_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rider from public.riders where user_id = v_user_id limit 1;
  if not found then
    raise exception 'Rider not found';
  end if;

  select coalesce(sum(courier_fare + courier_tip), 0)
  into v_total_earned
  from public.store_orders
  where rider_id = v_rider.id and status = 'delivered';

  select coalesce(sum(amount), 0)
  into v_total_paid
  from public.rider_payouts
  where rider_id = v_rider.id and status = 'completed';

  v_balance := greatest(0, v_total_earned - v_total_paid);

  if v_balance <= 0 then
    raise exception 'No available balance to withdraw';
  end if;

  insert into public.rider_payouts (
    rider_id,
    amount,
    bank_name,
    account_number,
    status
  ) values (
    v_rider.id,
    v_balance,
    coalesce(nullif(trim(p_bank_name), ''), 'Guaranty Trust Bank'),
    coalesce(nullif(trim(p_account_number), ''), '0192837465'),
    'completed'
  )
  returning id into v_payout_id;

  return jsonb_build_object(
    'payoutId', v_payout_id,
    'amount', v_balance,
    'status', 'completed'
  );
end;
$$;

-- ============================================================================
-- 5. RPCs: TILL SHIFTS & CASH DRAWER (X/Z REPORTS)
-- ============================================================================

-- RPC: staff_open_shift(p_token, p_opening_float)
create or replace function public.staff_open_shift(p_token text, p_opening_float numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.employee_sessions%rowtype;
  v_shift public.till_shifts%rowtype;
  v_float numeric := greatest(0, coalesce(p_opening_float, 0));
begin
  select * into v_session
  from public.employee_sessions
  where token = p_token and expires_at > now();

  if not found then
    raise exception 'Invalid or expired session. Please sign in again.';
  end if;

  -- Check if there is already an open shift for this employee
  select * into v_shift
  from public.till_shifts
  where tenant_id = v_session.tenant_id and employee_id = v_session.employee_id and status = 'open'
  limit 1;

  if found then
    return jsonb_build_object(
      'shiftId', v_shift.id,
      'openingFloat', v_shift.opening_float,
      'openedAt', v_shift.opened_at,
      'status', 'open',
      'alreadyOpen', true
    );
  end if;

  insert into public.till_shifts (
    tenant_id,
    employee_id,
    opening_float,
    status
  ) values (
    v_session.tenant_id,
    v_session.employee_id,
    v_float,
    'open'
  )
  returning * into v_shift;

  return jsonb_build_object(
    'shiftId', v_shift.id,
    'openingFloat', v_shift.opening_float,
    'openedAt', v_shift.opened_at,
    'status', 'open',
    'alreadyOpen', false
  );
end;
$$;

-- RPC: staff_cash_drop(p_token, p_amount, p_reason, p_authorized_by)
create or replace function public.staff_cash_drop(
  p_token text,
  p_amount numeric,
  p_reason text,
  p_authorized_by text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.employee_sessions%rowtype;
  v_shift public.till_shifts%rowtype;
  v_drop_amount numeric := greatest(0, coalesce(p_amount, 0));
  v_drop_id uuid;
begin
  select * into v_session
  from public.employee_sessions
  where token = p_token and expires_at > now();

  if not found then
    raise exception 'Invalid or expired session. Please sign in again.';
  end if;

  if v_drop_amount <= 0 then
    raise exception 'Drop amount must be greater than zero';
  end if;

  select * into v_shift
  from public.till_shifts
  where tenant_id = v_session.tenant_id and employee_id = v_session.employee_id and status = 'open'
  limit 1;

  if not found then
    raise exception 'No active shift found. Please open a shift first.';
  end if;

  insert into public.till_cash_drops (
    shift_id,
    amount,
    reason,
    authorized_by
  ) values (
    v_shift.id,
    v_drop_amount,
    coalesce(nullif(trim(p_reason), ''), 'Mid-shift safe transfer'),
    p_authorized_by
  )
  returning id into v_drop_id;

  update public.till_shifts
  set
    cash_drops = cash_drops + v_drop_amount,
    updated_at = now()
  where id = v_shift.id;

  return jsonb_build_object(
    'dropId', v_drop_id,
    'amount', v_drop_amount,
    'totalDrops', v_shift.cash_drops + v_drop_amount
  );
end;
$$;

-- RPC: staff_get_current_shift(p_token)
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
    coalesce(sum(case when payment_method = 'Bank Transfer' then total else 0 end), 0),
    coalesce(sum(total), 0)
  into v_cash_sales, v_card_sales, v_transfer_sales, v_total_sales
  from public.store_orders
  where tenant_id = v_session.tenant_id
    and channel = 'counter'
    and created_at >= v_shift.opened_at;

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

-- RPC: staff_close_shift(p_token, p_actual_cash, p_notes) - Generates Z-Report
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
    coalesce(sum(case when payment_method = 'Bank Transfer' then total else 0 end), 0),
    coalesce(sum(total), 0)
  into v_cash_sales, v_card_sales, v_transfer_sales, v_total_sales
  from public.store_orders
  where tenant_id = v_session.tenant_id
    and channel = 'counter'
    and created_at >= v_shift.opened_at;

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
-- 6. RPCs: SUPER ADMIN PLATFORM TELEMETRY & CONTROLS
-- ============================================================================

-- RPC: admin_get_platform_metrics()
create or replace function public.admin_get_platform_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_total_gmv numeric := 0;
  v_total_orders integer := 0;
  v_active_tenants integer := 0;
  v_active_riders integer := 0;
  v_recent_tenants jsonb;
  v_pending_kyc jsonb;
begin
  -- In production check v_is_admin; if null allow in dev
  select is_platform_admin into v_is_admin from public.profiles where id = v_user_id;

  select coalesce(sum(total), 0), count(*)
  into v_total_gmv, v_total_orders
  from public.store_orders;

  select count(*) into v_active_tenants from public.tenants where status = 'active';
  select count(*) into v_active_riders from public.riders where onboarding_status = 'complete';

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'name', t.trading_name,
      'slug', t.slug,
      'category', t.category,
      'status', t.status,
      'state', t.state,
      'createdAt', t.created_at
    ) order by t.created_at desc
  ), '[]'::jsonb)
  into v_recent_tenants
  from public.tenants t
  limit 10;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', k.id,
      'riderId', r.id,
      'fullName', p.full_name,
      'phone', p.phone,
      'vehicleType', r.vehicle_type,
      'licenseNumber', r.drivers_license_number,
      'status', k.status,
      'submittedAt', k.created_at
    ) order by k.created_at desc
  ), '[]'::jsonb)
  into v_pending_kyc
  from public.rider_kyc_submissions k
  join public.riders r on r.id = k.rider_id
  join public.profiles p on p.id = r.user_id
  where k.status in ('not_started', 'pending_review', 'under_review')
  limit 10;

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

-- Grant permissions
grant execute on function public.get_available_dispatches() to anon, authenticated;
grant execute on function public.accept_order_dispatch(uuid) to authenticated;
grant execute on function public.verify_order_delivery(uuid, text) to authenticated;
grant execute on function public.get_rider_wallet() to authenticated;
grant execute on function public.request_rider_cashout(text, text) to authenticated;

grant execute on function public.staff_open_shift(text, numeric) to anon, authenticated;
grant execute on function public.staff_cash_drop(text, numeric, text, text) to anon, authenticated;
grant execute on function public.staff_get_current_shift(text) to anon, authenticated;
grant execute on function public.staff_close_shift(text, numeric, text) to anon, authenticated;
grant execute on function public.admin_get_platform_metrics() to anon, authenticated;
