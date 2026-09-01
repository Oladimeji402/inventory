-- Catalog, orders, reserved slugs, and owner write policies.

create or replace function public.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
as $$
  select lower(p_slug) in (
    'admin','api','www','app','auth','status','docs','billing',
    'shop','rider','marketplace','merchant','pos','mail','cdn',
    'support','help','blog','store','stores',
    'login','signup','forgot','start','dashboard','onboarding',
    'settings','orders','products','analytics'
  );
$$;

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_manager(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.is_tenant_manager(uuid) to authenticated;

do $$ begin
  create type public.order_status as enum (
    'pending',
    'dispatched',
    'delivered',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  category text not null default 'General Retail',
  price numeric(12,2) not null default 0 check (price >= 0),
  cost numeric(12,2) not null default 0 check (cost >= 0),
  stock integer not null default 0 check (stock >= 0),
  barcode text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalog_products_tenant on public.catalog_products (tenant_id, created_at desc);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_name text not null default '',
  address text,
  items_summary text,
  total numeric(12,2) not null default 0 check (total >= 0),
  status public.order_status not null default 'pending',
  courier_name text,
  courier_phone text,
  eta_minutes integer,
  delivery_otp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_orders_tenant on public.store_orders (tenant_id, created_at desc);

drop trigger if exists trg_catalog_products_updated_at on public.catalog_products;
create trigger trg_catalog_products_updated_at
  before update on public.catalog_products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_store_orders_updated_at on public.store_orders;
create trigger trg_store_orders_updated_at
  before update on public.store_orders
  for each row execute function public.set_updated_at();

alter table public.catalog_products enable row level security;
alter table public.store_orders enable row level security;

drop policy if exists "catalog_select_member" on public.catalog_products;
create policy "catalog_select_member"
  on public.catalog_products for select
  to authenticated
  using (public.is_tenant_member(tenant_id));

drop policy if exists "catalog_insert_manager" on public.catalog_products;
create policy "catalog_insert_manager"
  on public.catalog_products for insert
  to authenticated
  with check (public.is_tenant_manager(tenant_id));

drop policy if exists "catalog_update_manager" on public.catalog_products;
create policy "catalog_update_manager"
  on public.catalog_products for update
  to authenticated
  using (public.is_tenant_manager(tenant_id))
  with check (public.is_tenant_manager(tenant_id));

drop policy if exists "catalog_delete_manager" on public.catalog_products;
create policy "catalog_delete_manager"
  on public.catalog_products for delete
  to authenticated
  using (public.is_tenant_manager(tenant_id));

drop policy if exists "orders_select_member" on public.store_orders;
create policy "orders_select_member"
  on public.store_orders for select
  to authenticated
  using (public.is_tenant_member(tenant_id));

drop policy if exists "orders_update_manager" on public.store_orders;
create policy "orders_update_manager"
  on public.store_orders for update
  to authenticated
  using (public.is_tenant_manager(tenant_id))
  with check (public.is_tenant_manager(tenant_id));

drop policy if exists "payout_insert_owner" on public.merchant_payout_accounts;
create policy "payout_insert_owner"
  on public.merchant_payout_accounts for insert
  to authenticated
  with check (public.is_tenant_manager(tenant_id));

drop policy if exists "payout_update_owner" on public.merchant_payout_accounts;
create policy "payout_update_owner"
  on public.merchant_payout_accounts for update
  to authenticated
  using (public.is_tenant_manager(tenant_id))
  with check (public.is_tenant_manager(tenant_id));

create or replace function public.prevent_tenant_id_change()
returns trigger
language plpgsql
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'Cannot move records between stores';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_catalog_products_tenant_lock on public.catalog_products;
create trigger trg_catalog_products_tenant_lock
  before update on public.catalog_products
  for each row execute function public.prevent_tenant_id_change();

drop trigger if exists trg_store_orders_tenant_lock on public.store_orders;
create trigger trg_store_orders_tenant_lock
  before update on public.store_orders
  for each row execute function public.prevent_tenant_id_change();

create or replace function public.update_merchant_store(
  p_trading_name text,
  p_category text,
  p_slug text,
  p_address text,
  p_contact_phone text,
  p_has_physical_store boolean,
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
  v_tenant public.tenants%rowtype;
  v_slug text := lower(trim(p_slug));
  v_account text := nullif(trim(coalesce(p_account_number, '')), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select t.* into v_tenant
  from public.tenants t
  join public.tenant_members m on m.tenant_id = t.id
  where m.user_id = v_user_id
    and m.role in ('owner', 'admin')
  limit 1;

  if not found then
    raise exception 'You cannot update this store';
  end if;

  if v_slug is distinct from v_tenant.slug then
    if not public.is_slug_available(v_slug) then
      raise exception 'That store URL is not available';
    end if;
  end if;

  if v_account is not null and v_account !~ '^[0-9]{10}$' then
    raise exception 'Account number must be a 10-digit NUBAN';
  end if;

  update public.tenants
  set
    trading_name = trim(p_trading_name),
    category = coalesce(nullif(trim(p_category), ''), category),
    slug = v_slug,
    address = nullif(trim(coalesce(p_address, '')), ''),
    contact_phone = nullif(trim(coalesce(p_contact_phone, '')), ''),
    has_physical_store = coalesce(p_has_physical_store, has_physical_store)
  where id = v_tenant.id
  returning * into v_tenant;

  insert into public.merchant_payout_accounts (
    tenant_id, bank_name, account_number, account_name
  )
  values (
    v_tenant.id,
    nullif(trim(coalesce(p_bank_name, '')), ''),
    v_account,
    nullif(trim(coalesce(p_account_name, '')), '')
  )
  on conflict (tenant_id) do update set
    bank_name = excluded.bank_name,
    account_number = excluded.account_number,
    account_name = excluded.account_name;

  return jsonb_build_object(
    'id', v_tenant.id,
    'slug', v_tenant.slug,
    'trading_name', v_tenant.trading_name
  );
end;
$$;

revoke all on function public.is_tenant_member(uuid) from public;
revoke all on function public.is_tenant_manager(uuid) from public;
revoke all on function public.update_merchant_store(text, text, text, text, text, boolean, text, text, text) from public;

grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.is_tenant_manager(uuid) to authenticated;
grant execute on function public.update_merchant_store(text, text, text, text, text, boolean, text, text, text) to authenticated;

grant usage on type public.order_status to authenticated;
grant select, insert, update, delete on public.catalog_products to authenticated;
grant select, update on public.store_orders to authenticated;
grant insert on public.merchant_payout_accounts to authenticated;
