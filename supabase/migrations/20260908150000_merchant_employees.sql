-- Merchant staff: PIN-authenticated employees (till cashiers + online order
-- reps). These are NOT Supabase Auth users — a merchant adds a name + PIN
-- from the dashboard, and the employee signs in later with store URL + name
-- + PIN. Because that sign-in call is necessarily anon (no auth.users
-- account to attach a session to), PINs are hashed with pgcrypto and we
-- issue our own short-lived opaque session tokens instead of relying on
-- Supabase Auth — see verify_employee_pin() / staff_* functions below.

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
    'settings','orders','products','analytics','staff','employees'
  );
$$;

do $$ begin
  create type public.employee_type as enum (
    'counter',
    'online_rep'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  employee_type public.employee_type not null,
  pin_hash text not null,
  is_active boolean not null default true,
  failed_pin_attempts integer not null default 0,
  pin_locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employees_tenant on public.employees (tenant_id, created_at desc);

comment on table public.employees is
  'PIN-authenticated staff (till cashiers + online order reps). No Supabase Auth account.';
comment on column public.employees.pin_hash is
  'bcrypt hash via pgcrypto. Not selectable by clients — see the column grant below.';

-- Opaque bearer tokens issued on successful PIN sign-in. Only ever touched
-- by the SECURITY DEFINER functions below — no client-facing grants.
create table if not exists public.employee_sessions (
  token text primary key,
  employee_id uuid not null references public.employees(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_employee_sessions_expiry on public.employee_sessions (expires_at);

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

drop trigger if exists trg_employees_tenant_lock on public.employees;
create trigger trg_employees_tenant_lock
  before update on public.employees
  for each row execute function public.prevent_tenant_id_change();

alter table public.employees enable row level security;
alter table public.employee_sessions enable row level security;

drop policy if exists "employees_select_manager" on public.employees;
create policy "employees_select_manager"
  on public.employees for select
  to authenticated
  using (public.is_tenant_manager(tenant_id));

-- ---------------------------------------------------------------------------
-- Owner-side management (real Supabase Auth session required)
-- ---------------------------------------------------------------------------

create or replace function public.add_employee(
  p_full_name text,
  p_employee_type public.employee_type,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_employee public.employees%rowtype;
  v_name text := trim(coalesce(p_full_name, ''));
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

  insert into public.employees (tenant_id, full_name, employee_type, pin_hash)
  values (v_tenant_id, v_name, p_employee_type, crypt(p_pin, gen_salt('bf')))
  returning * into v_employee;

  return jsonb_build_object(
    'id', v_employee.id,
    'tenant_id', v_employee.tenant_id,
    'full_name', v_employee.full_name,
    'employee_type', v_employee.employee_type,
    'is_active', v_employee.is_active,
    'created_at', v_employee.created_at
  );
end;
$$;

create or replace function public.reset_employee_pin(
  p_employee_id uuid,
  p_new_pin text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.employees where id = p_employee_id;
  if v_tenant_id is null or not public.is_tenant_manager(v_tenant_id) then
    raise exception 'You are not allowed to manage this employee';
  end if;

  if p_new_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  update public.employees
  set pin_hash = crypt(p_new_pin, gen_salt('bf')),
      failed_pin_attempts = 0,
      pin_locked_until = null
  where id = p_employee_id;
end;
$$;

create or replace function public.set_employee_active(
  p_employee_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.employees where id = p_employee_id;
  if v_tenant_id is null or not public.is_tenant_manager(v_tenant_id) then
    raise exception 'You are not allowed to manage this employee';
  end if;

  update public.employees
  set is_active = coalesce(p_is_active, true),
      failed_pin_attempts = 0,
      pin_locked_until = null
  where id = p_employee_id;
end;
$$;

create or replace function public.remove_employee(p_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.employees where id = p_employee_id;
  if v_tenant_id is null or not public.is_tenant_manager(v_tenant_id) then
    raise exception 'You are not allowed to manage this employee';
  end if;

  delete from public.employees where id = p_employee_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff-side sign-in (anon — employees have no Supabase Auth account)
-- ---------------------------------------------------------------------------

create or replace function public.verify_employee_pin(
  p_slug text,
  p_full_name text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public
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
    'tenant_id', v_tenant.id,
    'tenant_slug', v_tenant.slug,
    'trading_name', v_tenant.trading_name
  );
end;
$$;

create or replace function public.staff_session_employee(p_token text)
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
begin
  select e.* into v_employee
  from public.employee_sessions s
  join public.employees e on e.id = s.employee_id
  where s.token = p_token and s.expires_at > now() and e.is_active;

  if not found then
    raise exception 'Session expired. Please sign in again.';
  end if;

  return v_employee;
end;
$$;

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

  return coalesce(
    (
      select jsonb_agg(
        to_jsonb(o) || jsonb_build_object(
          'order_items', coalesce((
            select jsonb_agg(to_jsonb(oi) order by oi.created_at)
            from public.order_items oi
            where oi.order_id = o.id
          ), '[]'::jsonb)
        )
        order by o.created_at desc
      )
      from public.store_orders o
      where o.tenant_id = v_employee.tenant_id
    ),
    '[]'::jsonb
  );
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
  v_order public.store_orders%rowtype;
begin
  v_employee := public.staff_session_employee(p_token);

  if v_employee.employee_type <> 'online_rep' then
    raise exception 'This account cannot manage online orders';
  end if;

  update public.store_orders
  set status = p_status
  where id = p_order_id and tenant_id = v_employee.tenant_id
  returning * into v_order;

  if not found then
    raise exception 'Order not found';
  end if;

  return to_jsonb(v_order) || jsonb_build_object(
    'order_items', coalesce((
      select jsonb_agg(to_jsonb(oi) order by oi.created_at)
      from public.order_items oi
      where oi.order_id = v_order.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.staff_sign_out(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.employee_sessions where token = p_token;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on type public.employee_type to authenticated;

-- pin_hash is deliberately excluded — select(*) will fail on purpose.
grant select (
  id, tenant_id, full_name, employee_type, is_active,
  failed_pin_attempts, pin_locked_until, created_at, updated_at
) on public.employees to authenticated;

revoke all on function public.add_employee(text, public.employee_type, text) from public;
revoke all on function public.reset_employee_pin(uuid, text) from public;
revoke all on function public.set_employee_active(uuid, boolean) from public;
revoke all on function public.remove_employee(uuid) from public;
revoke all on function public.verify_employee_pin(text, text, text) from public;
revoke all on function public.staff_session_employee(text) from public;
revoke all on function public.staff_online_orders(text) from public;
revoke all on function public.staff_update_order_status(text, uuid, public.order_status) from public;
revoke all on function public.staff_sign_out(text) from public;

grant execute on function public.add_employee(text, public.employee_type, text) to authenticated;
grant execute on function public.reset_employee_pin(uuid, text) to authenticated;
grant execute on function public.set_employee_active(uuid, boolean) to authenticated;
grant execute on function public.remove_employee(uuid) to authenticated;

-- Staff have no Supabase Auth session, so these run as `anon`.
grant execute on function public.verify_employee_pin(text, text, text) to anon, authenticated;
grant execute on function public.staff_online_orders(text) to anon, authenticated;
grant execute on function public.staff_update_order_status(text, uuid, public.order_status) to anon, authenticated;
grant execute on function public.staff_sign_out(text) to anon, authenticated;
