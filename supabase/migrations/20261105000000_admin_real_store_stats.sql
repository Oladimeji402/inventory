-- Migration: real per-store statistics, payout details, subscriptions and corridor
-- metrics for the platform admin (replaces figures the admin UI used to invent).
-- Date: 2026-11-05

-- get_storefront_store / get_active_marketplace_stores already read tenants.corridor,
-- but no earlier migration defines it. Idempotent, so safe if it was added by hand.
alter table public.tenants add column if not exists corridor text;

create or replace function public.admin_get_platform_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_gmv numeric := 0;
  v_total_orders integer := 0;
  v_gmv_30d numeric := 0;
  v_active_tenants integer := 0;
  v_active_riders integer := 0;
  v_verified_riders integer := 0;
  v_corridors integer := 0;
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

  select coalesce(sum(total), 0) into v_gmv_30d
  from public.store_orders
  where status <> 'cancelled' and payment_status = 'paid'
    and created_at >= now() - interval '30 days';

  select count(*) into v_active_tenants from public.tenants where status = 'active';
  select count(*) into v_active_riders from public.riders where onboarding_status = 'complete';
  select count(*) into v_verified_riders from public.riders where kyc_status = 'verified';
  select count(distinct corridor) into v_corridors
  from public.tenants where status = 'active' and corridor is not null;

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
      'corridor', t.corridor,
      'address', t.address,
      'contactPhone', t.contact_phone,
      'contactEmail', t.contact_email,
      'createdAt', t.created_at,
      'gmv', coalesce(o.gmv, 0),
      'orderCount', coalesce(o.cnt, 0),
      'branchesCount', coalesce(b.cnt, 0),
      'branches', coalesce(b.items, '[]'::jsonb),
      'activeStaff', coalesce(e.cnt, 0),
      'planTier', sub.plan_tier,
      'subscriptionStatus', sub.status,
      'subscriptionAmount', sub.amount,
      'subscriptionRenewsAt', sub.current_period_end,
      'bankName', pa.bank_name,
      -- admins see the last four digits only
      'accountNumber', case when pa.account_number is null then null
                            else '••••••' || right(pa.account_number, 4) end,
      'accountName', pa.account_name,
      'payoutVerified', coalesce(pa.is_verified, false)
    ) as j
    from public.tenants t
    left join lateral (
      select sum(so.total) as gmv, count(*) as cnt
      from public.store_orders so
      where so.tenant_id = t.id and so.status <> 'cancelled' and so.payment_status = 'paid'
    ) o on true
    left join lateral (
      select count(*) as cnt,
             jsonb_agg(jsonb_build_object(
               'id', sb.id, 'name', sb.name, 'address', sb.address,
               'phone', sb.phone, 'isMain', sb.is_main
             ) order by sb.is_main desc, sb.created_at) as items
      from public.store_branches sb
      where sb.tenant_id = t.id and sb.is_active
    ) b on true
    left join lateral (
      select count(*) as cnt from public.employees em
      where em.tenant_id = t.id and em.is_active
    ) e on true
    left join lateral (
      select s.plan_tier, s.status, s.amount, s.current_period_end
      from public.subscriptions s
      where s.tenant_id = t.id
      order by s.created_at desc
      limit 1
    ) sub on true
    left join public.merchant_payout_accounts pa on pa.tenant_id = t.id
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
    'gmv30d', v_gmv_30d,
    'totalOrders', v_total_orders,
    'activeTenants', v_active_tenants,
    'activeRiders', v_active_riders,
    'verifiedRiders', v_verified_riders,
    'corridorCount', v_corridors,
    'recentTenants', v_recent_tenants,
    'pendingKyc', v_pending_kyc
  );
end;
$$;

-- Corridor breakdown and subscription counts, all computed from live data.
create or replace function public.admin_get_corridors()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_corridors jsonb;
  v_plans jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(c.j order by c.stores desc, c.name), '[]'::jsonb)
  into v_corridors
  from (
    select coalesce(t.corridor, 'Unassigned') as name,
           count(distinct t.id) filter (where t.status = 'active') as stores,
           jsonb_build_object(
             'name', coalesce(t.corridor, 'Unassigned'),
             'stores', count(distinct t.id) filter (where t.status = 'active'),
             'orders30d', count(o.id) filter (where o.created_at >= now() - interval '30 days'),
             -- order created -> marked delivered (updated_at is when status last changed)
             'avgDeliveryMinutes', round(avg(extract(epoch from (o.updated_at - o.created_at)) / 60)
               filter (where o.status = 'delivered' and o.channel = 'online'
                       and o.created_at >= now() - interval '30 days')::numeric, 0)
           ) as j
    from public.tenants t
    left join public.store_orders o
      on o.tenant_id = t.id and o.payment_status = 'paid' and o.status <> 'cancelled'
    group by coalesce(t.corridor, 'Unassigned')
  ) c;

  select coalesce(jsonb_agg(jsonb_build_object('plan', p.plan_tier, 'stores', p.cnt)
                            order by p.plan_tier), '[]'::jsonb)
  into v_plans
  from (
    select plan_tier, count(*) as cnt
    from (
      select distinct on (tenant_id) tenant_id, plan_tier, status
      from public.subscriptions
      order by tenant_id, created_at desc
    ) latest
    where status in ('active', 'trialing')
    group by plan_tier
  ) p;

  return jsonb_build_object('corridors', v_corridors, 'plans', v_plans);
end;
$$;

revoke all on function public.admin_get_platform_metrics() from public, anon;
revoke all on function public.admin_get_corridors() from public, anon;
grant execute on function public.admin_get_platform_metrics() to authenticated;
grant execute on function public.admin_get_corridors() to authenticated;
