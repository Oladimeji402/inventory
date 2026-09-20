-- Rider account + courier onboarding.
-- Reuses public.profiles (created by the merchant migration) for identity —
-- riders and merchants share one login/profile system.
-- Collects only what is needed to let a courier legally operate a vehicle in
-- Nigeria and to reach them in an emergency (NDPA data minimisation):
--   - date of birth, to enforce the 18+ minimum working age
--     (Child Rights Act 2003 / Labour Act — motorcycle/dispatch work is not
--     permitted for minors)
--   - driver's/rider's licence NUMBER only (National Road Traffic
--     Regulations 2012 requires a valid licence to operate a vehicle
--     commercially) — never an uploaded scan
--   - vehicle particulars (type, plate number) — never the vehicle licence
--     certificate image
--   - a next-of-kin contact, standard safety practice for high-risk road work
-- Does NOT store NIN, BVN, ID scans, or licence photos. Those belong to a
-- later payout-KYC step with a licensed payment partner, exactly like the
-- merchant flow.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.vehicle_type as enum (
    'bicycle',
    'motorcycle',
    'tricycle',
    'car',
    'van'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Riders (one courier profile per user)
-- ---------------------------------------------------------------------------

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  date_of_birth date not null,
  vehicle_type public.vehicle_type not null,
  vehicle_make_model text,
  vehicle_plate_number text,
  drivers_license_number text not null,
  drivers_license_expiry date,
  state text,
  city text,
  base_address text,
  next_of_kin_name text,
  next_of_kin_phone text,
  onboarding_status public.onboarding_status not null default 'in_progress',
  onboarding_step integer not null default 1,
  kyc_status public.kyc_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_riders_user on public.riders (user_id);
create index if not exists idx_riders_status on public.riders (onboarding_status);

comment on table public.riders is
  'Courier identity + vehicle/licence numbers. No NIN/BVN, no ID scans.';
comment on column public.riders.drivers_license_number is
  'Licence number only. Do not upload a photo of the licence here.';
comment on column public.riders.date_of_birth is
  'Used only to confirm the rider is 18+. Age is checked in provision_rider().';

-- ---------------------------------------------------------------------------
-- KYC tracker (mirrors kyc_submissions; no sensitive identifiers)
-- ---------------------------------------------------------------------------

create table if not exists public.rider_kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  status public.kyc_status not null default 'not_started',
  reviewer_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rider_kyc_rider on public.rider_kyc_submissions (rider_id);

comment on table public.rider_kyc_submissions is
  'Workflow status for later payout KYC. Do not put NIN/BVN in this table.';

-- ---------------------------------------------------------------------------
-- updated_at triggers (set_updated_at() already exists from the merchant migration)
-- ---------------------------------------------------------------------------

drop trigger if exists trg_riders_updated_at on public.riders;
create trigger trg_riders_updated_at
  before update on public.riders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_rider_kyc_updated_at on public.rider_kyc_submissions;
create trigger trg_rider_kyc_updated_at
  before update on public.rider_kyc_submissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Provision rider (self-serve, one courier profile per account)
-- ---------------------------------------------------------------------------

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
  p_next_of_kin_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_rider public.riders%rowtype;
  v_license text := nullif(trim(coalesce(p_drivers_license_number, '')), '');
  v_min_dob date := (current_date - interval '18 years')::date;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found then
    raise exception 'Profile not found';
  end if;

  if exists (select 1 from public.riders r where r.user_id = v_user_id) then
    raise exception 'You already have a rider profile';
  end if;

  if p_date_of_birth is null or p_date_of_birth > v_min_dob then
    raise exception 'You must be at least 18 years old to ride with us';
  end if;

  if v_license is null or length(v_license) < 5 then
    raise exception 'Enter a valid driver''s/rider''s licence number';
  end if;

  if coalesce(trim(p_base_address), '') = '' then
    raise exception 'Enter your base address or pickup area';
  end if;

  insert into public.riders (
    user_id,
    date_of_birth,
    vehicle_type,
    vehicle_make_model,
    vehicle_plate_number,
    drivers_license_number,
    drivers_license_expiry,
    state,
    city,
    base_address,
    next_of_kin_name,
    next_of_kin_phone,
    onboarding_status,
    onboarding_step
  )
  values (
    v_user_id,
    p_date_of_birth,
    p_vehicle_type,
    nullif(trim(coalesce(p_vehicle_make_model, '')), ''),
    nullif(trim(coalesce(p_vehicle_plate_number, '')), ''),
    v_license,
    p_drivers_license_expiry,
    nullif(trim(coalesce(p_state, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    trim(p_base_address),
    nullif(trim(coalesce(p_next_of_kin_name, '')), ''),
    nullif(trim(coalesce(p_next_of_kin_phone, '')), ''),
    'complete',
    4
  )
  returning * into v_rider;

  insert into public.rider_kyc_submissions (rider_id, status)
  values (v_rider.id, 'not_started');

  return jsonb_build_object(
    'id', v_rider.id,
    'onboarding_status', v_rider.onboarding_status
  );
end;
$$;

grant execute on function public.provision_rider(
  date, public.vehicle_type, text, text, text, date, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.riders enable row level security;
alter table public.rider_kyc_submissions enable row level security;

drop policy if exists "riders_select_own" on public.riders;
create policy "riders_select_own"
  on public.riders for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "riders_update_own" on public.riders;
create policy "riders_update_own"
  on public.riders for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "rider_kyc_select_own" on public.rider_kyc_submissions;
create policy "rider_kyc_select_own"
  on public.rider_kyc_submissions for select
  to authenticated
  using (
    rider_id in (select r.id from public.riders r where r.user_id = auth.uid())
  );

grant usage on type public.vehicle_type to authenticated;
grant select, update on public.riders to authenticated;
grant select on public.rider_kyc_submissions to authenticated;
