-- Migration: Till POS Cloud Sync, Storefront Public Orders, and Rider Dispatch RPCs
-- Date: 2026-10-25

-- 1. Enhance employees table with till_role
alter table public.employees
  add column if not exists till_role text not null default 'Sales Representative'
  check (till_role in ('Sales Representative', 'Supervisor', 'Manager', 'Store Admin'));

-- 2. Enhance store_orders table with channel, cashier and POS fields
alter table public.store_orders
  add column if not exists channel text not null default 'online'
  check (channel in ('online', 'counter')),
  add column if not exists payment_method text not null default 'Card',
  add column if not exists amount_tendered numeric(12,2),
  add column if not exists change_due numeric(12,2),
  add column if not exists cashier_name text;

-- 3. Update add_employee to support till_role
create or replace function public.add_employee(
  p_full_name text,
  p_employee_type public.employee_type,
  p_pin text,
  p_till_role text default 'Sales Representative'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_tenant_id uuid;
  v_employee public.employees%rowtype;
  v_name text := trim(coalesce(p_full_name, ''));
  v_role text := coalesce(nullif(trim(p_till_role), ''), 'Sales Representative');
begin
  select m.tenant_id into v_tenant_id
  from public.tenant_members m
  where m.user_id = auth.uid() and m.role in ('owner', 'admin')
  limit 1;

  if v_tenant_id is null then
    raise exception 'You are not allowed to manage staff for a store';
  end if;

  if v_name = '' then
    raise exception 'Enter the employee''s full name';
  end if;

  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  if v_role not in ('Sales Representative', 'Supervisor', 'Manager', 'Store Admin') then
    v_role := 'Sales Representative';
  end if;

  insert into public.employees (tenant_id, full_name, employee_type, pin_hash, till_role)
  values (v_tenant_id, v_name, p_employee_type, crypt(p_pin, gen_salt('bf')), v_role)
  returning * into v_employee;

  return jsonb_build_object(
    'id', v_employee.id,
    'tenant_id', v_employee.tenant_id,
    'full_name', v_employee.full_name,
    'employee_type', v_employee.employee_type,
    'till_role', v_employee.till_role,
    'is_active', v_employee.is_active,
    'created_at', v_employee.created_at
  );
end;
$$;

-- 4. Update verify_employee_pin to return till_role
create or replace function public.verify_employee_pin(
  p_slug text,
  p_full_name text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_tenant public.tenants%rowtype;
  v_employee public.employees%rowtype;
  v_token text;
begin
  select * into v_tenant from public.tenants where slug = lower(trim(coalesce(p_slug, '')));
  if not found then
    raise exception 'Store not found';
  end if;

  select e.* into v_employee
  from public.employees e
  where e.tenant_id = v_tenant.id
    and lower(trim(e.full_name)) = lower(trim(coalesce(p_full_name, '')))
  limit 1;

  if not found then
    raise exception 'Incorrect name or PIN';
  end if;

  if not v_employee.is_active then
    raise exception 'This staff account has been deactivated';
  end if;

  if v_employee.pin_locked_until is not null and v_employee.pin_locked_until > now() then
    raise exception 'Too many attempts. Try again in a few minutes.';
  end if;

  if crypt(coalesce(p_pin, ''), v_employee.pin_hash) <> v_employee.pin_hash then
    update public.employees
    set failed_pin_attempts = failed_pin_attempts + 1,
        pin_locked_until = case
          when failed_pin_attempts + 1 >= 5 then now() + interval '15 minutes'
          else pin_locked_until
        end
    where id = v_employee.id;
    raise exception 'Incorrect name or PIN';
  end if;

  update public.employees
  set failed_pin_attempts = 0, pin_locked_until = null
  where id = v_employee.id;

  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.employee_sessions (token, employee_id, tenant_id, expires_at)
  values (v_token, v_employee.id, v_tenant.id, now() + interval '12 hours');

  return jsonb_build_object(
    'token', v_token,
    'employee_id', v_employee.id,
    'full_name', v_employee.full_name,
    'employee_type', v_employee.employee_type,
    'till_role', coalesce(v_employee.till_role, 'Sales Representative'),
    'tenant_id', v_tenant.id,
    'tenant_slug', v_tenant.slug,
    'trading_name', v_tenant.trading_name
  );
end;
$$;

-- 5. RPC: staff_till_catalog(p_token)
create or replace function public.staff_till_catalog(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.employee_sessions%rowtype;
  v_products jsonb;
begin
  select * into v_session
  from public.employee_sessions
  where token = p_token and expires_at > now();

  if not found then
    raise exception 'Invalid or expired session. Please sign in again.';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'category', p.category,
      'price', p.price,
      'cost', p.cost,
      'stock', p.stock,
      'lowStockThreshold', p.low_stock_threshold,
      'imageUrl', p.image_url,
      'barcode', p.barcode,
      'isActive', p.is_active
    ) order by p.name asc
  ), '[]'::jsonb)
  into v_products
  from public.catalog_products p
  where p.tenant_id = v_session.tenant_id and p.is_active = true;

  return v_products;
end;
$$;

-- 6. RPC: staff_till_checkout(p_token, p_order)
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
  v_item jsonb;
  v_prod_id uuid;
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_prod_name text;
begin
  select * into v_session
  from public.employee_sessions
  where token = p_token and expires_at > now();

  if not found then
    raise exception 'Invalid or expired session. Please sign in again.';
  end if;

  select * into v_employee from public.employees where id = v_session.employee_id;

  v_total := coalesce((p_order->>'total')::numeric, 0);

  insert into public.store_orders (
    tenant_id,
    channel,
    status,
    customer_name,
    items_summary,
    total,
    payment_method,
    amount_tendered,
    change_due,
    cashier_name
  ) values (
    v_session.tenant_id,
    'counter',
    'delivered',
    coalesce(nullif(trim(p_order->>'customerName'), ''), 'Walk-in Customer'),
    p_order->>'itemsSummary',
    v_total,
    coalesce(nullif(trim(p_order->>'paymentMethod'), ''), 'Cash'),
    (p_order->>'amountTendered')::numeric,
    (p_order->>'changeDue')::numeric,
    coalesce(v_employee.full_name, 'Cashier')
  )
  returning id into v_order_id;

  -- Process line items and decrement stock
  if jsonb_typeof(p_order->'items') = 'array' then
    for v_item in select * from jsonb_array_elements(p_order->'items')
    loop
      v_prod_name := coalesce(v_item->>'name', 'Item');
      v_qty := greatest(1, coalesce((v_item->>'qty')::integer, (v_item->>'quantity')::integer, 1));
      v_unit_price := coalesce((v_item->>'price')::numeric, 0);
      v_line_total := v_qty * v_unit_price;

      begin
        v_prod_id := (v_item->>'id')::uuid;
      exception when others then
        v_prod_id := null;
      end;

      insert into public.order_items (
        order_id,
        tenant_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        line_total
      ) values (
        v_order_id,
        v_session.tenant_id,
        v_prod_id,
        v_prod_name,
        v_qty,
        v_unit_price,
        v_line_total
      );

      if v_prod_id is not null then
        update public.catalog_products
        set stock = greatest(0, stock - v_qty)
        where id = v_prod_id and tenant_id = v_session.tenant_id;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'total', v_total,
    'status', 'delivered',
    'channel', 'counter'
  );
end;
$$;

-- 7. RPC: get_storefront_store(p_slug)
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
    'corridor', coalesce(t.corridor, 'Ikeja GRA & Maryland'),
    'rating', '4.9',
    'deliveryTime', '18–25 mins'
  )
  into v_store
  from public.tenants t
  where t.slug = lower(trim(coalesce(p_slug, ''))) and t.status = 'active';

  return v_store;
end;
$$;

-- 8. RPC: get_storefront_catalog(p_slug)
create or replace function public.get_storefront_catalog(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_products jsonb;
begin
  select id into v_tenant_id
  from public.tenants
  where slug = lower(trim(coalesce(p_slug, ''))) and status = 'active';

  if v_tenant_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'category', p.category,
      'price', p.price,
      'stock', p.stock,
      'imageUrl', p.image_url,
      'barcode', p.barcode
    ) order by p.created_at desc
  ), '[]'::jsonb)
  into v_products
  from public.catalog_products p
  where p.tenant_id = v_tenant_id and p.is_active = true and p.stock > 0;

  return v_products;
end;
$$;

-- 9. RPC: submit_storefront_order(p_slug, p_order)
create or replace function public.submit_storefront_order(p_slug text, p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_tenant public.tenants%rowtype;
  v_order_id uuid;
  v_total numeric;
  v_otp text;
  v_item jsonb;
  v_prod_id uuid;
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_prod_name text;
begin
  select * into v_tenant
  from public.tenants
  where slug = lower(trim(coalesce(p_slug, ''))) and status = 'active';

  if not found then
    raise exception 'Store not found or currently inactive.';
  end if;

  v_total := coalesce((p_order->>'total')::numeric, 0);
  v_otp := lpad((floor(random() * 9000) + 1000)::text, 4, '0');

  insert into public.store_orders (
    tenant_id,
    channel,
    status,
    customer_name,
    customer_phone,
    address,
    items_summary,
    total,
    payment_method,
    eta_minutes,
    delivery_otp
  ) values (
    v_tenant.id,
    'online',
    'pending',
    coalesce(nullif(trim(p_order->>'customerName'), ''), 'Shopper'),
    p_order->>'customerPhone',
    p_order->>'address',
    p_order->>'itemsSummary',
    v_total,
    coalesce(nullif(trim(p_order->>'paymentMethod'), ''), 'Card'),
    25,
    v_otp
  )
  returning id into v_order_id;

  if jsonb_typeof(p_order->'items') = 'array' then
    for v_item in select * from jsonb_array_elements(p_order->'items')
    loop
      v_prod_name := coalesce(v_item->>'name', 'Item');
      v_qty := greatest(1, coalesce((v_item->>'quantity')::integer, (v_item->>'qty')::integer, 1));
      v_unit_price := coalesce((v_item->>'price')::numeric, 0);
      v_line_total := v_qty * v_unit_price;

      begin
        v_prod_id := (v_item->>'id')::uuid;
      exception when others then
        v_prod_id := null;
      end;

      insert into public.order_items (
        order_id,
        tenant_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        line_total
      ) values (
        v_order_id,
        v_tenant.id,
        v_prod_id,
        v_prod_name,
        v_qty,
        v_unit_price,
        v_line_total
      );

      if v_prod_id is not null then
        update public.catalog_products
        set stock = greatest(0, stock - v_qty)
        where id = v_prod_id and tenant_id = v_tenant.id;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'store_name', v_tenant.trading_name,
    'total', v_total,
    'status', 'pending',
    'eta_minutes', 25,
    'delivery_otp', v_otp
  );
end;
$$;

-- 10. RPC: get_active_marketplace_stores(p_corridor)
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
      'corridor', coalesce(t.corridor, 'Ikeja GRA & Maryland'),
      'rating', '4.9',
      'deliveryTime', '18–25 mins'
    ) order by t.created_at desc
  ), '[]'::jsonb)
  into v_stores
  from public.tenants t
  where t.status = 'active'
    and (p_corridor is null or t.corridor = p_corridor or p_corridor = 'All');

  return v_stores;
end;
$$;

-- Grant execution permissions to anon and authenticated
grant execute on function public.staff_till_catalog(text) to anon, authenticated;
grant execute on function public.staff_till_checkout(text, jsonb) to anon, authenticated;
grant execute on function public.get_storefront_store(text) to anon, authenticated;
grant execute on function public.get_storefront_catalog(text) to anon, authenticated;
grant execute on function public.submit_storefront_order(text, jsonb) to anon, authenticated;
grant execute on function public.get_active_marketplace_stores(text) to anon, authenticated;
