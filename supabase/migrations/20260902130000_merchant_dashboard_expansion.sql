-- Merchant dashboard expansion: order line items, customers, low-stock
-- thresholds, and product photo storage. Additive only — nothing dropped
-- or renamed from the existing catalog/orders schema.

-- ── catalog_products: low-stock threshold + photo ──────────────────────────
alter table public.catalog_products
  add column if not exists low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  add column if not exists image_url text;

-- ── order_items: real line items instead of free-text items_summary ───────
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid references public.catalog_products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_order_items_tenant on public.order_items (tenant_id, created_at desc);

alter table public.order_items enable row level security;

drop policy if exists "order_items_select_member" on public.order_items;
create policy "order_items_select_member"
  on public.order_items for select
  to authenticated
  using (public.is_tenant_member(tenant_id));

drop policy if exists "order_items_insert_manager" on public.order_items;
create policy "order_items_insert_manager"
  on public.order_items for insert
  to authenticated
  with check (public.is_tenant_manager(tenant_id));

drop policy if exists "order_items_update_manager" on public.order_items;
create policy "order_items_update_manager"
  on public.order_items for update
  to authenticated
  using (public.is_tenant_manager(tenant_id))
  with check (public.is_tenant_manager(tenant_id));

drop policy if exists "order_items_delete_manager" on public.order_items;
create policy "order_items_delete_manager"
  on public.order_items for delete
  to authenticated
  using (public.is_tenant_manager(tenant_id));

drop trigger if exists trg_order_items_tenant_lock on public.order_items;
create trigger trg_order_items_tenant_lock
  before update on public.order_items
  for each row execute function public.prevent_tenant_id_change();

-- ── customers: lightweight CRM, phone-first (matches Nigerian retail habits) ─
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, phone)
);

create index if not exists idx_customers_tenant on public.customers (tenant_id, created_at desc);

alter table public.customers enable row level security;

drop policy if exists "customers_select_member" on public.customers;
create policy "customers_select_member"
  on public.customers for select
  to authenticated
  using (public.is_tenant_member(tenant_id));

drop policy if exists "customers_insert_manager" on public.customers;
create policy "customers_insert_manager"
  on public.customers for insert
  to authenticated
  with check (public.is_tenant_manager(tenant_id));

drop policy if exists "customers_update_manager" on public.customers;
create policy "customers_update_manager"
  on public.customers for update
  to authenticated
  using (public.is_tenant_manager(tenant_id))
  with check (public.is_tenant_manager(tenant_id));

drop policy if exists "customers_delete_manager" on public.customers;
create policy "customers_delete_manager"
  on public.customers for delete
  to authenticated
  using (public.is_tenant_manager(tenant_id));

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_tenant_lock on public.customers;
create trigger trg_customers_tenant_lock
  before update on public.customers
  for each row execute function public.prevent_tenant_id_change();

-- ── store_orders: optional link to a customer record ───────────────────────
alter table public.store_orders
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

-- ── storage: product photos, tenant-scoped write, public read ─────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

drop policy if exists "product_images_manager_insert" on storage.objects;
create policy "product_images_manager_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_tenant_manager((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "product_images_manager_update" on storage.objects;
create policy "product_images_manager_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_tenant_manager((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "product_images_manager_delete" on storage.objects;
create policy "product_images_manager_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_tenant_manager((storage.foldername(name))[1]::uuid)
  );

-- ── grants ──────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
