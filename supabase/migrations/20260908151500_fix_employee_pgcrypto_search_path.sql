-- Fix: crypt()/gen_salt()/gen_random_bytes() live in the `extensions` schema
-- on this project, not `public`. The employee-PIN functions only had
-- `search_path = public`, so pgcrypto calls failed with
-- "function gen_salt(unknown) does not exist". Add `extensions` to the path.

create or replace function public.add_employee(
  p_full_name text,
  p_employee_type public.employee_type,
  p_pin text
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
set search_path = public, extensions
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
    'tenant_id', v_tenant.id,
    'tenant_slug', v_tenant.slug,
    'trading_name', v_tenant.trading_name
  );
end;
$$;
