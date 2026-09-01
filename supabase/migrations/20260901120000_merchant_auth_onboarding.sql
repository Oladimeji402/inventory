-- Merchant account + store onboarding.
-- Collects only what a retail SaaS needs to create a tenant (NDPA data minimisation).
-- Does NOT store BVN, NIN, ID scans, or CAC certificates. Those belong to a later
-- payout-KYC step with a licensed payment partner.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.entity_type as enum (
    'informal_trader',
    'sole_proprietor',
    'business_name',
    'limited_company'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.onboarding_status as enum (
    'not_started',
    'in_progress',
    'complete'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.kyc_status as enum (
    'not_required',
    'not_started',
    'pending_review',
    'verified',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tenant_status as enum (
    'trialing',
    'active',
    'past_due',
    'suspended',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.membership_role as enum (
    'owner',
    'admin',
    'staff'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  country_code text not null default 'NG',
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Account holder identity for login. No government ID numbers.';

-- ---------------------------------------------------------------------------
-- Tenants (one store / business)
-- ---------------------------------------------------------------------------

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  trading_name text not null,
  legal_name text,
  entity_type public.entity_type not null default 'informal_trader',
  cac_number text,
  tin text,
  category text not null default 'General Retail',
  contact_email text not null,
  contact_phone text,
  country_code text not null default 'NG',
  state text,
  city text,
  address text,
  has_physical_store boolean not null default true,
  business_description text,
  website_or_social text,
  currency text not null default 'NGN',
  status public.tenant_status not null default 'trialing',
  onboarding_status public.onboarding_status not null default 'in_progress',
  onboarding_step integer not null default 1,
  kyc_status public.kyc_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  constraint tenants_cac_when_registered check (
    entity_type in ('informal_trader', 'sole_proprietor')
    or (cac_number is not null and length(trim(cac_number)) >= 5)
  )
);

create index if not exists idx_tenants_slug on public.tenants (slug);
create index if not exists idx_tenants_status on public.tenants (status);

comment on column public.tenants.cac_number is
  'RC or BN number only. Do not store certificate files here.';
comment on column public.tenants.tin is
  'Optional until payouts. FIRS TIN, not BVN/NIN.';

-- ---------------------------------------------------------------------------
-- Membership
-- ---------------------------------------------------------------------------

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists idx_tenant_members_user on public.tenant_members (user_id);

-- ---------------------------------------------------------------------------
-- Payout account (NUBAN). Collected at onboarding; payouts stay blocked until KYC.
-- ---------------------------------------------------------------------------

create table if not exists public.merchant_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  bank_name text,
  account_number text,
  account_name text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_nuban_len check (
    account_number is null or account_number ~ '^[0-9]{10}$'
  )
);

comment on table public.merchant_payout_accounts is
  'Settlement NUBAN only. Never store BVN here.';

-- ---------------------------------------------------------------------------
-- KYC tracker (no sensitive identifiers)
-- ---------------------------------------------------------------------------

create table if not exists public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  status public.kyc_status not null default 'not_started',
  reviewer_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_kyc_submissions_tenant on public.kyc_submissions (tenant_id);

comment on table public.kyc_submissions is
  'Workflow status for later payout KYC. Do not put BVN/NIN in this table.';

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_payout_updated_at on public.merchant_payout_accounts;
create trigger trg_payout_updated_at
  before update on public.merchant_payout_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_kyc_updated_at on public.kyc_submissions;
create trigger trg_kyc_updated_at
  before update on public.kyc_submissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Create profile on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    terms_accepted_at,
    privacy_accepted_at,
    marketing_opt_in
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    case when new.raw_user_meta_data->>'terms_accepted' = 'true' then now() else null end,
    case when new.raw_user_meta_data->>'privacy_accepted' = 'true' then now() else null end,
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Slug helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
as $$
  select lower(p_slug) in (
    'admin','api','www','app','auth','status','docs','billing',
    'shop','rider','marketplace','merchant','pos','mail','cdn',
    'support','help','blog','store','stores'
  );
$$;

create or replace function public.is_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    length(p_slug) between 2 and 63
    and p_slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
    and not public.is_reserved_slug(p_slug)
    and not exists (select 1 from public.tenants t where t.slug = lower(p_slug));
$$;

grant execute on function public.is_slug_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Provision tenant (owner only, one store per owner for now)
-- ---------------------------------------------------------------------------

create or replace function public.provision_merchant_tenant(
  p_trading_name text,
  p_legal_name text,
  p_entity_type public.entity_type,
  p_cac_number text,
  p_tin text,
  p_category text,
  p_slug text,
  p_state text,
  p_city text,
  p_address text,
  p_has_physical_store boolean,
  p_business_description text,
  p_website_or_social text,
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
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_tenant public.tenants%rowtype;
  v_slug text := lower(trim(p_slug));
  v_cac text := nullif(trim(coalesce(p_cac_number, '')), '');
  v_account text := nullif(trim(coalesce(p_account_number, '')), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found then
    raise exception 'Profile not found';
  end if;

  if exists (
    select 1 from public.tenant_members m
    where m.user_id = v_user_id and m.role = 'owner'
  ) then
    raise exception 'You already have a store';
  end if;

  if not public.is_slug_available(v_slug) then
    raise exception 'That store URL is not available';
  end if;

  if p_entity_type in ('business_name', 'limited_company') and v_cac is null then
    raise exception 'CAC registration number is required for registered businesses';
  end if;

  if v_account is not null and v_account !~ '^[0-9]{10}$' then
    raise exception 'Account number must be a 10-digit NUBAN';
  end if;

  insert into public.tenants (
    slug,
    trading_name,
    legal_name,
    entity_type,
    cac_number,
    tin,
    category,
    contact_email,
    contact_phone,
    state,
    city,
    address,
    has_physical_store,
    business_description,
    website_or_social,
    onboarding_status,
    onboarding_step
  )
  values (
    v_slug,
    trim(p_trading_name),
    nullif(trim(coalesce(p_legal_name, '')), ''),
    p_entity_type,
    v_cac,
    nullif(trim(coalesce(p_tin, '')), ''),
    coalesce(nullif(trim(p_category), ''), 'General Retail'),
    coalesce(auth.jwt()->>'email', ''),
    v_profile.phone,
    nullif(trim(coalesce(p_state, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    coalesce(p_has_physical_store, true),
    nullif(trim(coalesce(p_business_description, '')), ''),
    nullif(trim(coalesce(p_website_or_social, '')), ''),
    'complete',
    4
  )
  returning * into v_tenant;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant.id, v_user_id, 'owner');

  if coalesce(p_bank_name, '') <> '' or v_account is not null or coalesce(p_account_name, '') <> '' then
    insert into public.merchant_payout_accounts (
      tenant_id, bank_name, account_number, account_name
    )
    values (
      v_tenant.id,
      nullif(trim(coalesce(p_bank_name, '')), ''),
      v_account,
      nullif(trim(coalesce(p_account_name, '')), '')
    );
  end if;

  insert into public.kyc_submissions (tenant_id, status)
  values (v_tenant.id, 'not_started');

  return jsonb_build_object(
    'id', v_tenant.id,
    'slug', v_tenant.slug,
    'trading_name', v_tenant.trading_name,
    'onboarding_status', v_tenant.onboarding_status
  );
end;
$$;

grant execute on function public.provision_merchant_tenant(
  text, text, public.entity_type, text, text, text, text, text, text, text,
  boolean, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.merchant_payout_accounts enable row level security;
alter table public.kyc_submissions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "members_select_own" on public.tenant_members;
create policy "members_select_own"
  on public.tenant_members for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "tenants_select_member" on public.tenants;
create policy "tenants_select_member"
  on public.tenants for select
  to authenticated
  using (
    id in (select m.tenant_id from public.tenant_members m where m.user_id = auth.uid())
  );

drop policy if exists "tenants_update_owner" on public.tenants;
create policy "tenants_update_owner"
  on public.tenants for update
  to authenticated
  using (
    id in (
      select m.tenant_id from public.tenant_members m
      where m.user_id = auth.uid() and m.role in ('owner', 'admin')
    )
  )
  with check (
    id in (
      select m.tenant_id from public.tenant_members m
      where m.user_id = auth.uid() and m.role in ('owner', 'admin')
    )
  );

drop policy if exists "payout_select_member" on public.merchant_payout_accounts;
create policy "payout_select_member"
  on public.merchant_payout_accounts for select
  to authenticated
  using (
    tenant_id in (select m.tenant_id from public.tenant_members m where m.user_id = auth.uid())
  );

drop policy if exists "payout_update_owner" on public.merchant_payout_accounts;
create policy "payout_update_owner"
  on public.merchant_payout_accounts for update
  to authenticated
  using (
    tenant_id in (
      select m.tenant_id from public.tenant_members m
      where m.user_id = auth.uid() and m.role in ('owner', 'admin')
    )
  );

drop policy if exists "kyc_select_member" on public.kyc_submissions;
create policy "kyc_select_member"
  on public.kyc_submissions for select
  to authenticated
  using (
    tenant_id in (select m.tenant_id from public.tenant_members m where m.user_id = auth.uid())
  );

grant usage on schema public to anon, authenticated;
grant usage on type public.entity_type to authenticated;
grant usage on type public.onboarding_status to authenticated;
grant usage on type public.kyc_status to authenticated;
grant usage on type public.tenant_status to authenticated;
grant usage on type public.membership_role to authenticated;

grant select, update on public.profiles to authenticated;
grant select, update on public.tenants to authenticated;
grant select on public.tenant_members to authenticated;
grant select, update on public.merchant_payout_accounts to authenticated;
grant select on public.kyc_submissions to authenticated;
