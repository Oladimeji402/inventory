-- Migration: rider verification documents (private storage), admin audit log and the
-- RPCs behind the platform admin console (riders, stores, orders, payouts, admins).
-- Date: 2026-11-06
--
-- NOTE: the original rider design deliberately stored no licence images. Riders now
-- upload documents to a PRIVATE bucket; only the owner and platform admins can read
-- them (admins via short-lived signed URLs).

-- ============================================================================
-- 1. RIDER DOCUMENTS
-- ============================================================================
do $$ begin
  create type public.rider_document_type as enum (
    'drivers_license_front',
    'drivers_license_back',
    'vehicle_papers',
    'passport_photo'
  );
exception when duplicate_object then null;
end $$;

alter table public.riders
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

create table if not exists public.rider_documents (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  doc_type public.rider_document_type not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rider_id, doc_type)
);

create index if not exists idx_rider_documents_rider on public.rider_documents (rider_id);

alter table public.rider_documents enable row level security;
revoke all on public.rider_documents from anon, authenticated;
grant select on public.rider_documents to authenticated;

drop policy if exists "rider_documents_select_own" on public.rider_documents;
create policy "rider_documents_select_own" on public.rider_documents for select to authenticated
  using (rider_id in (select r.id from public.riders r where r.user_id = auth.uid())
         or public.is_platform_admin());

alter table public.rider_payouts
  add column if not exists processed_at timestamptz,
  add column if not exists admin_note text,
  add column if not exists reference text;

-- Private bucket. Path convention: <auth user id>/<doc_type> (one file per type).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rider-documents', 'rider-documents', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists "rider_docs_insert_own" on storage.objects;
create policy "rider_docs_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'rider-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "rider_docs_update_own" on storage.objects;
create policy "rider_docs_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'rider-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'rider-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "rider_docs_select_own_or_admin" on storage.objects;
create policy "rider_docs_select_own_or_admin" on storage.objects for select to authenticated
  using (bucket_id = 'rider-documents'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_platform_admin()));

-- Which documents each vehicle needs. Bicycles need no licence.
create or replace function public.rider_required_documents(p_vehicle public.vehicle_type)
returns text[]
language sql
immutable
as $$
  select case
    when p_vehicle = 'bicycle' then array['passport_photo']
    else array['drivers_license_front', 'drivers_license_back', 'vehicle_papers', 'passport_photo']
  end;
$$;

grant execute on function public.rider_required_documents(public.vehicle_type) to authenticated;

-- Record an uploaded file (the client uploads to storage first; we verify it exists).
create or replace function public.submit_rider_document(
  p_doc_type text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_path text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rider from public.riders where user_id = auth.uid();
  if not found then
    raise exception 'Complete your rider details first';
  end if;

  if v_rider.kyc_status = 'verified' then
    raise exception 'Your documents are already verified. Contact support to change them.';
  end if;

  if not (p_doc_type = any (public.rider_required_documents(v_rider.vehicle_type))) then
    raise exception 'That document is not required for your vehicle';
  end if;

  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') then
    raise exception 'Upload a JPG, PNG, WebP or PDF file';
  end if;

  if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 5242880 then
    raise exception 'Files must be 5 MB or smaller';
  end if;

  v_path := auth.uid()::text || '/' || p_doc_type;

  if not exists (
    select 1 from storage.objects where bucket_id = 'rider-documents' and name = v_path
  ) then
    raise exception 'Upload the file before saving it';
  end if;

  insert into public.rider_documents (rider_id, doc_type, storage_path, file_name, mime_type, size_bytes)
  values (v_rider.id, p_doc_type::public.rider_document_type, v_path,
          left(coalesce(nullif(trim(p_file_name), ''), p_doc_type), 200), p_mime_type, p_size_bytes)
  on conflict (rider_id, doc_type) do update
    set storage_path = excluded.storage_path,
        file_name = excluded.file_name,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        status = 'pending',
        reviewer_notes = null,
        reviewed_at = null,
        updated_at = now();

  return jsonb_build_object('docType', p_doc_type, 'path', v_path, 'status', 'pending');
end;
$$;

-- Send the rider's documents for review once every required one is on file.
create or replace function public.submit_rider_verification()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_required text[];
  v_missing text[];
  v_rejected integer;
begin
  select * into v_rider from public.riders where user_id = auth.uid();
  if not found then
    raise exception 'Complete your rider details first';
  end if;

  if v_rider.kyc_status = 'verified' then
    return jsonb_build_object('status', 'verified');
  end if;

  v_required := public.rider_required_documents(v_rider.vehicle_type);

  select coalesce(array_agg(r), '{}') into v_missing
  from unnest(v_required) r
  where not exists (
    select 1 from public.rider_documents d
    where d.rider_id = v_rider.id and d.doc_type::text = r
  );

  if array_length(v_missing, 1) > 0 then
    raise exception 'Upload all required documents first (missing: %)', array_to_string(v_missing, ', ');
  end if;

  select count(*) into v_rejected
  from public.rider_documents where rider_id = v_rider.id and status = 'rejected';

  if v_rejected > 0 then
    raise exception 'Replace the rejected documents before sending for review';
  end if;

  update public.riders set kyc_status = 'pending_review' where id = v_rider.id;

  update public.rider_kyc_submissions
  set status = 'pending_review', submitted_at = now(), reviewer_notes = null, reviewed_at = null
  where rider_id = v_rider.id;

  return jsonb_build_object('status', 'pending_review');
end;
$$;

create or replace function public.get_my_rider_verification()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_notes text;
  v_docs jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rider from public.riders where user_id = auth.uid();
  if not found then
    return null;
  end if;

  select reviewer_notes into v_notes
  from public.rider_kyc_submissions where rider_id = v_rider.id
  order by created_at desc limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'docType', d.doc_type,
    'status', d.status,
    'notes', d.reviewer_notes,
    'fileName', d.file_name,
    'mimeType', d.mime_type,
    'sizeBytes', d.size_bytes
  )), '[]'::jsonb)
  into v_docs
  from public.rider_documents d where d.rider_id = v_rider.id;

  return jsonb_build_object(
    'kycStatus', v_rider.kyc_status,
    'reviewerNotes', v_notes,
    'vehicleType', v_rider.vehicle_type,
    'suspended', v_rider.suspended_at is not null,
    'suspensionReason', v_rider.suspension_reason,
    'required', to_jsonb(public.rider_required_documents(v_rider.vehicle_type)),
    'documents', v_docs
  );
end;
$$;

revoke all on function public.submit_rider_document(text, text, text, integer) from public, anon;
revoke all on function public.submit_rider_verification() from public, anon;
revoke all on function public.get_my_rider_verification() from public, anon;
grant execute on function public.submit_rider_document(text, text, text, integer) to authenticated;
grant execute on function public.submit_rider_verification() to authenticated;
grant execute on function public.get_my_rider_verification() to authenticated;

-- Riders take deliveries only once verified, and never while suspended.
create or replace function public.current_ready_rider()
returns public.riders
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rider from public.riders where user_id = auth.uid() limit 1;
  if not found then
    raise exception 'Rider profile not found';
  end if;

  if v_rider.onboarding_status <> 'complete' then
    raise exception 'Finish rider onboarding before taking deliveries';
  end if;

  if v_rider.suspended_at is not null then
    raise exception 'Your rider account is suspended. Contact support.';
  end if;

  if v_rider.kyc_status <> 'verified' then
    raise exception 'Your documents must be verified before you can take deliveries';
  end if;

  return v_rider;
end;
$$;

-- Riders may not change suspension fields themselves.
create or replace function public.guard_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_platform_admin() then
    return new;
  end if;

  if tg_table_name = 'profiles' then
    if new.is_platform_admin is distinct from old.is_platform_admin then
      raise exception 'is_platform_admin cannot be changed by clients';
    end if;
  elsif tg_table_name = 'tenants' then
    if new.status is distinct from old.status then
      raise exception 'Tenant status can only be changed by a platform admin';
    end if;
  elsif tg_table_name = 'riders' then
    if new.kyc_status is distinct from old.kyc_status
       or new.suspended_at is distinct from old.suspended_at
       or new.suspension_reason is distinct from old.suspension_reason then
      raise exception 'Rider verification and suspension can only be changed by a platform admin';
    end if;
  elsif tg_table_name = 'store_orders' then
    if new.payment_status is distinct from old.payment_status
       or new.payment_reference is distinct from old.payment_reference
       or new.rider_id is distinct from old.rider_id
       or new.courier_fare is distinct from old.courier_fare
       or new.courier_tip is distinct from old.courier_tip
       or new.total is distinct from old.total
       or new.tenant_id is distinct from old.tenant_id then
      raise exception 'Payment, courier and total fields cannot be edited directly';
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 2. ADMIN AUDIT LOG
-- ============================================================================
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid,
  admin_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_created on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

create or replace function public.admin_log(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_summary text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_log (admin_id, admin_email, action, entity_type, entity_id, summary, metadata)
  values (
    auth.uid(),
    (select u.email from auth.users u where u.id = auth.uid()),
    p_action, p_entity_type, p_entity_id, p_summary, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.admin_log(text, text, text, text, jsonb) from public, anon, authenticated;

-- ============================================================================
-- 3. EXISTING ADMIN ACTIONS NOW WRITE TO THE AUDIT LOG
-- ============================================================================
create or replace function public.admin_set_tenant_status(
  p_tenant_id uuid,
  p_status public.tenant_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.tenant_status;
  v_tenant public.tenants%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select status into v_old from public.tenants where id = p_tenant_id;
  if not found then
    raise exception 'Store not found';
  end if;

  update public.tenants set status = p_status where id = p_tenant_id returning * into v_tenant;

  perform public.admin_log('store.status', 'store', p_tenant_id::text,
    format('%s: %s → %s', v_tenant.trading_name, v_old, p_status),
    jsonb_build_object('from', v_old, 'to', p_status));

  return jsonb_build_object('id', v_tenant.id, 'status', v_tenant.status);
end;
$$;

create or replace function public.admin_reset_employee_pin(p_employee_id uuid, p_new_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if p_new_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  update public.employees
  set pin_hash = crypt(p_new_pin, gen_salt('bf')), failed_pin_attempts = 0, pin_locked_until = null
  where id = p_employee_id
  returning full_name into v_name;

  if not found then
    raise exception 'Employee not found';
  end if;

  perform public.admin_log('staff.pin_reset', 'employee', p_employee_id::text,
    format('PIN reset for %s', v_name));
end;
$$;

create or replace function public.admin_set_employee_active(p_employee_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  update public.employees
  set is_active = coalesce(p_is_active, true), failed_pin_attempts = 0, pin_locked_until = null
  where id = p_employee_id
  returning full_name into v_name;

  if not found then
    raise exception 'Employee not found';
  end if;

  perform public.admin_log('staff.active', 'employee', p_employee_id::text,
    format('%s %s', v_name, case when p_is_active then 'activated' else 'deactivated' end));
end;
$$;

-- Approving a rider requires every required document to be approved first.
create or replace function public.admin_review_rider_kyc(
  p_submission_id uuid,
  p_status public.kyc_status,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.rider_kyc_submissions%rowtype;
  v_rider public.riders%rowtype;
  v_pending integer;
  v_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  if p_status not in ('verified', 'rejected', 'pending_review') then
    raise exception 'Invalid review status';
  end if;

  select * into v_sub from public.rider_kyc_submissions where id = p_submission_id;
  if not found then
    raise exception 'KYC submission not found';
  end if;

  select * into v_rider from public.riders where id = v_sub.rider_id;

  if p_status = 'verified' then
    select count(*) into v_pending
    from unnest(public.rider_required_documents(v_rider.vehicle_type)) r
    where not exists (
      select 1 from public.rider_documents d
      where d.rider_id = v_rider.id and d.doc_type::text = r and d.status = 'approved'
    );
    if v_pending > 0 then
      raise exception 'Approve every required document before verifying this rider';
    end if;
  end if;

  if p_status = 'rejected' and nullif(trim(coalesce(p_notes, '')), '') is null then
    raise exception 'Add a reason so the rider knows what to fix';
  end if;

  update public.rider_kyc_submissions
  set status = p_status, reviewer_notes = nullif(trim(coalesce(p_notes, '')), ''),
      reviewed_at = now(), updated_at = now()
  where id = p_submission_id;

  update public.riders set kyc_status = p_status where id = v_rider.id;

  select full_name into v_name from public.profiles where id = v_rider.user_id;
  perform public.admin_log('rider.kyc', 'rider', v_rider.id::text,
    format('%s: verification %s', coalesce(v_name, 'Rider'), p_status),
    jsonb_build_object('status', p_status, 'notes', p_notes));

  return jsonb_build_object('id', v_sub.id, 'status', p_status);
end;
$$;

-- ============================================================================
-- 4. RIDERS (list, detail, document review, suspension)
-- ============================================================================
create or replace function public.admin_list_riders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_riders jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_riders
  from (
    select r.created_at, jsonb_build_object(
      'id', r.id,
      'name', p.full_name,
      'phone', p.phone,
      'email', (select u.email from auth.users u where u.id = r.user_id),
      'vehicleType', r.vehicle_type,
      'plate', r.vehicle_plate_number,
      'city', r.city,
      'state', r.state,
      'kycStatus', r.kyc_status,
      'onboardingStatus', r.onboarding_status,
      'suspended', r.suspended_at is not null,
      'createdAt', r.created_at,
      'submittedAt', k.submitted_at,
      'docsRequired', cardinality(public.rider_required_documents(r.vehicle_type)),
      'docsUploaded', coalesce(d.uploaded, 0),
      'docsApproved', coalesce(d.approved, 0),
      'deliveries', coalesce(o.cnt, 0),
      'earned', coalesce(o.earned, 0)
    ) as j
    from public.riders r
    join public.profiles p on p.id = r.user_id
    left join lateral (
      select submitted_at from public.rider_kyc_submissions ks
      where ks.rider_id = r.id order by ks.created_at desc limit 1
    ) k on true
    left join lateral (
      select count(*) as uploaded, count(*) filter (where status = 'approved') as approved
      from public.rider_documents rd where rd.rider_id = r.id
    ) d on true
    left join lateral (
      select count(*) as cnt, sum(coalesce(courier_fare, 0) + coalesce(courier_tip, 0)) as earned
      from public.store_orders so where so.rider_id = r.id and so.status = 'delivered'
    ) o on true
    order by r.created_at desc
    limit 500
  ) x;

  return v_riders;
end;
$$;

create or replace function public.admin_get_rider(p_rider_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.riders%rowtype;
  v_p public.profiles%rowtype;
  v_k public.rider_kyc_submissions%rowtype;
  v_docs jsonb;
  v_trips jsonb;
  v_payouts jsonb;
  v_earned numeric := 0;
  v_reserved numeric := 0;
  v_paid numeric := 0;
  v_deliveries integer := 0;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_r from public.riders where id = p_rider_id;
  if not found then
    raise exception 'Rider not found';
  end if;
  select * into v_p from public.profiles where id = v_r.user_id;
  select * into v_k from public.rider_kyc_submissions where rider_id = v_r.id order by created_at desc limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'docType', d.doc_type, 'path', d.storage_path, 'fileName', d.file_name,
    'mimeType', d.mime_type, 'sizeBytes', d.size_bytes, 'status', d.status,
    'notes', d.reviewer_notes, 'reviewedAt', d.reviewed_at, 'uploadedAt', d.updated_at
  ) order by d.doc_type), '[]'::jsonb)
  into v_docs
  from public.rider_documents d where d.rider_id = v_r.id;

  select coalesce(sum(coalesce(courier_fare, 0) + coalesce(courier_tip, 0)), 0), count(*)
  into v_earned, v_deliveries
  from public.store_orders where rider_id = v_r.id and status = 'delivered';

  select coalesce(sum(amount) filter (where status in ('pending', 'processing', 'completed')), 0),
         coalesce(sum(amount) filter (where status = 'completed'), 0)
  into v_reserved, v_paid
  from public.rider_payouts where rider_id = v_r.id;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) into v_trips
  from (
    select o.created_at, jsonb_build_object(
      'id', o.id, 'storeName', t.trading_name, 'customerName', o.customer_name,
      'address', o.address, 'status', o.status, 'fare', coalesce(o.courier_fare, 0),
      'tip', coalesce(o.courier_tip, 0), 'createdAt', o.created_at
    ) as j
    from public.store_orders o join public.tenants t on t.id = o.tenant_id
    where o.rider_id = v_r.id order by o.created_at desc limit 20
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', po.id, 'amount', po.amount, 'bankName', po.bank_name,
    'accountNumber', po.account_number, 'status', po.status, 'createdAt', po.created_at
  ) order by po.created_at desc), '[]'::jsonb)
  into v_payouts
  from (select * from public.rider_payouts where rider_id = v_r.id order by created_at desc limit 20) po;

  return jsonb_build_object(
    'id', v_r.id,
    'name', v_p.full_name,
    'phone', v_p.phone,
    'email', (select u.email from auth.users u where u.id = v_r.user_id),
    'dateOfBirth', v_r.date_of_birth,
    'vehicleType', v_r.vehicle_type,
    'vehicleMakeModel', v_r.vehicle_make_model,
    'plate', v_r.vehicle_plate_number,
    'licenseNumber', v_r.drivers_license_number,
    'licenseExpiry', v_r.drivers_license_expiry,
    'state', v_r.state,
    'city', v_r.city,
    'baseAddress', v_r.base_address,
    'nextOfKinName', v_r.next_of_kin_name,
    'nextOfKinPhone', v_r.next_of_kin_phone,
    'onboardingStatus', v_r.onboarding_status,
    'kycStatus', v_r.kyc_status,
    'submissionId', v_k.id,
    'reviewerNotes', v_k.reviewer_notes,
    'submittedAt', v_k.submitted_at,
    'reviewedAt', v_k.reviewed_at,
    'suspended', v_r.suspended_at is not null,
    'suspendedAt', v_r.suspended_at,
    'suspensionReason', v_r.suspension_reason,
    'createdAt', v_r.created_at,
    'requiredDocuments', to_jsonb(public.rider_required_documents(v_r.vehicle_type)),
    'documents', v_docs,
    'deliveries', v_deliveries,
    'earned', v_earned,
    'paidOut', v_paid,
    'availableBalance', greatest(0, v_earned - v_reserved),
    'recentTrips', v_trips,
    'payouts', v_payouts
  );
end;
$$;

create or replace function public.admin_review_rider_document(
  p_document_id uuid,
  p_status text,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc public.rider_documents%rowtype;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid document status';
  end if;
  if p_status = 'rejected' and v_notes is null then
    raise exception 'Add a reason so the rider knows what to re-upload';
  end if;

  update public.rider_documents
  set status = p_status, reviewer_notes = v_notes, reviewed_at = now(), updated_at = now()
  where id = p_document_id
  returning * into v_doc;

  if not found then
    raise exception 'Document not found';
  end if;

  -- A rejected document sends the whole application back to the rider.
  if p_status = 'rejected' then
    update public.riders set kyc_status = 'rejected' where id = v_doc.rider_id;
    update public.rider_kyc_submissions
    set status = 'rejected', reviewer_notes = v_notes, reviewed_at = now()
    where rider_id = v_doc.rider_id;
  end if;

  perform public.admin_log('rider.document', 'rider', v_doc.rider_id::text,
    format('%s %s', replace(v_doc.doc_type::text, '_', ' '), p_status),
    jsonb_build_object('documentId', p_document_id, 'notes', v_notes));

  return jsonb_build_object('id', v_doc.id, 'status', p_status);
end;
$$;

create or replace function public.admin_set_rider_suspended(
  p_rider_id uuid,
  p_suspended boolean,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if p_suspended and v_reason is null then
    raise exception 'Add a reason for the suspension';
  end if;

  update public.riders
  set suspended_at = case when p_suspended then now() else null end,
      suspension_reason = case when p_suspended then v_reason else null end
  where id = p_rider_id;

  if not found then
    raise exception 'Rider not found';
  end if;

  select p.full_name into v_name from public.riders r join public.profiles p on p.id = r.user_id
  where r.id = p_rider_id;

  perform public.admin_log('rider.suspend', 'rider', p_rider_id::text,
    format('%s %s', coalesce(v_name, 'Rider'), case when p_suspended then 'suspended' else 'reinstated' end),
    jsonb_build_object('reason', v_reason));

  return jsonb_build_object('id', p_rider_id, 'suspended', p_suspended);
end;
$$;

-- ============================================================================
-- 5. PAYOUTS
-- ============================================================================
create or replace function public.admin_list_payouts(p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select po.created_at, jsonb_build_object(
      'id', po.id,
      'riderId', r.id,
      'riderName', p.full_name,
      'riderPhone', p.phone,
      'amount', po.amount,
      'bankName', po.bank_name,
      'accountNumber', po.account_number,
      'accountName', po.account_name,
      'status', po.status,
      'reference', po.reference,
      'adminNote', po.admin_note,
      'processedAt', po.processed_at,
      'createdAt', po.created_at
    ) as j
    from public.rider_payouts po
    join public.riders r on r.id = po.rider_id
    join public.profiles p on p.id = r.user_id
    where p_status is null or po.status = p_status
    order by po.created_at desc
    limit 300
  ) x;

  return v_rows;
end;
$$;

-- pending -> processing -> completed | failed. A failed payout releases the balance.
create or replace function public.admin_update_payout(
  p_payout_id uuid,
  p_status text,
  p_note text default '',
  p_reference text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.rider_payouts%rowtype;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_ref text := nullif(trim(coalesce(p_reference, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('processing', 'completed', 'failed') then
    raise exception 'Invalid payout status';
  end if;

  select * into v_po from public.rider_payouts where id = p_payout_id for update;
  if not found then
    raise exception 'Payout not found';
  end if;

  if v_po.status in ('completed', 'failed') then
    raise exception 'This payout is already %', v_po.status;
  end if;
  if p_status = 'processing' and v_po.status <> 'pending' then
    raise exception 'Only pending payouts can be moved to processing';
  end if;
  if p_status = 'completed' and v_ref is null then
    raise exception 'Enter the bank transfer reference before marking it paid';
  end if;
  if p_status = 'failed' and v_note is null then
    raise exception 'Add a reason for the failed payout';
  end if;

  update public.rider_payouts
  set status = p_status,
      admin_note = coalesce(v_note, admin_note),
      reference = coalesce(v_ref, reference),
      processed_at = case when p_status in ('completed', 'failed') then now() else processed_at end
  where id = p_payout_id;

  perform public.admin_log('payout.' || p_status, 'payout', p_payout_id::text,
    format('Payout of ₦%s %s', trim(to_char(v_po.amount, 'FM999,999,990')), p_status),
    jsonb_build_object('reference', v_ref, 'note', v_note));

  return jsonb_build_object('id', p_payout_id, 'status', p_status);
end;
$$;

-- ============================================================================
-- 6. ORDERS
-- ============================================================================
create or replace function public.admin_list_orders(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orders jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_orders
  from (
    select o.created_at, jsonb_build_object(
      'id', o.id,
      'tenantId', o.tenant_id,
      'storeName', t.trading_name,
      'slug', t.slug,
      'customerName', o.customer_name,
      'customerPhone', o.customer_phone,
      'channel', o.channel,
      'fulfillmentType', o.fulfillment_type,
      'total', o.total,
      'paymentMethod', o.payment_method,
      'paymentStatus', o.payment_status,
      'status', o.status,
      'courierName', o.courier_name,
      'itemsSummary', o.items_summary,
      'createdAt', o.created_at
    ) as j
    from public.store_orders o
    join public.tenants t on t.id = o.tenant_id
    order by o.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 500)
  ) x;

  return v_orders;
end;
$$;

create or replace function public.admin_get_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o public.store_orders%rowtype;
  v_t public.tenants%rowtype;
  v_items jsonb;
  v_rider jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_o from public.store_orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;
  select * into v_t from public.tenants where id = v_o.tenant_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'name', i.product_name, 'quantity', i.quantity,
    'unitPrice', i.unit_price, 'lineTotal', i.line_total
  ) order by i.created_at), '[]'::jsonb)
  into v_items
  from public.order_items i where i.order_id = v_o.id;

  select jsonb_build_object('id', r.id, 'name', p.full_name, 'phone', p.phone, 'vehicleType', r.vehicle_type)
  into v_rider
  from public.riders r join public.profiles p on p.id = r.user_id
  where r.id = v_o.rider_id;

  return jsonb_build_object(
    'id', v_o.id,
    'storeId', v_t.id,
    'storeName', v_t.trading_name,
    'storeSlug', v_t.slug,
    'channel', v_o.channel,
    'fulfillmentType', v_o.fulfillment_type,
    'status', v_o.status,
    'customerName', v_o.customer_name,
    'customerPhone', v_o.customer_phone,
    'address', v_o.address,
    'total', v_o.total,
    'deliveryFee', v_o.delivery_fee,
    'paymentMethod', v_o.payment_method,
    'paymentStatus', v_o.payment_status,
    'paymentReference', v_o.payment_reference,
    'cashier', v_o.cashier_name,
    'courierFare', v_o.courier_fare,
    'courierTip', v_o.courier_tip,
    'rider', v_rider,
    'items', v_items,
    'voidedAt', v_o.voided_at,
    'voidReason', v_o.void_reason,
    'createdAt', v_o.created_at,
    'updatedAt', v_o.updated_at
  );
end;
$$;

-- Cancels an open order and returns its stock. It does NOT refund money; refunds are
-- done in the payment provider's dashboard.
create or replace function public.admin_cancel_order(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o public.store_orders%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if v_reason is null then
    raise exception 'Add a reason for cancelling this order';
  end if;

  select * into v_o from public.store_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_o.status not in ('pending', 'dispatched') then
    raise exception 'Only open orders can be cancelled (this one is %)', v_o.status;
  end if;

  update public.catalog_products p
  set stock = p.stock + i.quantity
  from public.order_items i
  where i.order_id = v_o.id and i.product_id = p.id and p.tenant_id = v_o.tenant_id;

  update public.store_orders
  set status = 'cancelled', voided_at = now(), void_reason = v_reason, voided_by = 'Platform admin'
  where id = p_order_id;

  perform public.admin_log('order.cancel', 'order', p_order_id::text,
    format('Order cancelled (%s)', v_reason),
    jsonb_build_object('total', v_o.total, 'paymentStatus', v_o.payment_status));

  return jsonb_build_object('id', p_order_id, 'status', 'cancelled');
end;
$$;

create or replace function public.admin_mark_order_paid(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o public.store_orders%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_o from public.store_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_o.payment_method <> 'Transfer' then
    raise exception 'Only bank-transfer orders can be marked paid manually';
  end if;
  if v_o.status = 'cancelled' then
    raise exception 'This order is cancelled';
  end if;

  update public.store_orders set payment_status = 'paid' where id = p_order_id;

  perform public.admin_log('order.paid', 'order', p_order_id::text, 'Transfer confirmed as paid',
    jsonb_build_object('total', v_o.total));

  return jsonb_build_object('id', p_order_id, 'paymentStatus', 'paid');
end;
$$;

-- ============================================================================
-- 7. STORE DETAIL + TRENDS
-- ============================================================================
create or replace function public.admin_get_store(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t public.tenants%rowtype;
  v_owner jsonb;
  v_stats jsonb;
  v_sub jsonb;
  v_pay jsonb;
  v_branches jsonb;
  v_recent jsonb;
  v_kyc jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_t from public.tenants where id = p_tenant_id;
  if not found then
    raise exception 'Store not found';
  end if;

  select jsonb_build_object('name', p.full_name, 'phone', p.phone,
                            'email', (select u.email from auth.users u where u.id = p.id))
  into v_owner
  from public.tenant_members m join public.profiles p on p.id = m.user_id
  where m.tenant_id = v_t.id order by (m.role = 'owner') desc, m.created_at limit 1;

  select jsonb_build_object(
    'gmv', coalesce(sum(total) filter (where status <> 'cancelled' and payment_status = 'paid'), 0),
    'orders', count(*) filter (where status <> 'cancelled' and payment_status = 'paid'),
    'gmv30d', coalesce(sum(total) filter (where status <> 'cancelled' and payment_status = 'paid'
                                           and created_at >= now() - interval '30 days'), 0),
    'orders30d', count(*) filter (where status <> 'cancelled' and payment_status = 'paid'
                                    and created_at >= now() - interval '30 days'),
    'online', count(*) filter (where channel = 'online' and status <> 'cancelled' and payment_status = 'paid'),
    'counter', count(*) filter (where channel = 'counter' and status <> 'cancelled'),
    'cancelled', count(*) filter (where status = 'cancelled'),
    'unpaid', count(*) filter (where payment_status = 'unpaid' and status <> 'cancelled'),
    'products', (select count(*) from public.catalog_products cp where cp.tenant_id = v_t.id and cp.is_active),
    'outOfStock', (select count(*) from public.catalog_products cp
                   where cp.tenant_id = v_t.id and cp.is_active and cp.stock = 0),
    'lowStock', (select count(*) from public.catalog_products cp
                 where cp.tenant_id = v_t.id and cp.is_active and cp.stock > 0
                   and cp.stock <= cp.low_stock_threshold),
    'staff', (select count(*) from public.employees e where e.tenant_id = v_t.id and e.is_active)
  ) into v_stats
  from public.store_orders where tenant_id = v_t.id;

  select jsonb_build_object('plan', s.plan_tier, 'status', s.status, 'amount', s.amount,
                            'cycle', s.billing_cycle, 'renewsAt', s.current_period_end)
  into v_sub
  from public.subscriptions s where s.tenant_id = v_t.id order by s.created_at desc limit 1;

  select jsonb_build_object('bankName', pa.bank_name,
         'accountNumber', case when pa.account_number is null then null
                               else '••••••' || right(pa.account_number, 4) end,
         'accountName', pa.account_name, 'verified', pa.is_verified)
  into v_pay
  from public.merchant_payout_accounts pa where pa.tenant_id = v_t.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'name', b.name, 'address', b.address, 'city', b.city, 'phone', b.phone,
    'isMain', b.is_main, 'isActive', b.is_active) order by b.is_main desc, b.created_at), '[]'::jsonb)
  into v_branches
  from public.store_branches b where b.tenant_id = v_t.id;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select o.created_at, jsonb_build_object(
      'id', o.id, 'customerName', o.customer_name, 'channel', o.channel, 'total', o.total,
      'status', o.status, 'paymentStatus', o.payment_status, 'paymentMethod', o.payment_method,
      'createdAt', o.created_at) as j
    from public.store_orders o where o.tenant_id = v_t.id order by o.created_at desc limit 15
  ) x;

  select jsonb_build_object('status', k.status, 'notes', k.reviewer_notes,
                            'submittedAt', k.submitted_at, 'reviewedAt', k.reviewed_at)
  into v_kyc
  from public.kyc_submissions k where k.tenant_id = v_t.id order by k.created_at desc limit 1;

  return jsonb_build_object(
    'id', v_t.id,
    'name', v_t.trading_name,
    'legalName', v_t.legal_name,
    'slug', v_t.slug,
    'category', v_t.category,
    'entityType', v_t.entity_type,
    'cacNumber', v_t.cac_number,
    'tin', v_t.tin,
    'status', v_t.status,
    'kycStatus', v_t.kyc_status,
    'onboardingStatus', v_t.onboarding_status,
    'contactEmail', v_t.contact_email,
    'contactPhone', v_t.contact_phone,
    'state', v_t.state,
    'city', v_t.city,
    'corridor', v_t.corridor,
    'address', v_t.address,
    'hasPhysicalStore', v_t.has_physical_store,
    'description', v_t.business_description,
    'website', v_t.website_or_social,
    'createdAt', v_t.created_at,
    'owner', v_owner,
    'stats', v_stats,
    'subscription', v_sub,
    'payout', v_pay,
    'branches', v_branches,
    'recentOrders', v_recent,
    'kyc', v_kyc
  );
end;
$$;

create or replace function public.admin_get_trends(p_days integer default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 14), 7), 90);
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_series jsonb;
  v_status jsonb;
  v_channels jsonb;
  v_top jsonb;
  v_queue jsonb;
  v_cmp jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('day', s.day, 'gmv', s.gmv, 'orders', s.orders)
                            order by s.day), '[]'::jsonb)
  into v_series
  from (
    select d::date as day,
           coalesce(sum(o.total), 0) as gmv,
           count(o.id) as orders
    from generate_series(v_today - (v_days - 1), v_today, interval '1 day') d
    left join public.store_orders o
      on (o.created_at at time zone 'Africa/Lagos')::date = d::date
     and o.status <> 'cancelled' and o.payment_status = 'paid'
    group by d::date
  ) s;

  select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb) into v_status
  from (select status::text, count(*) as cnt from public.store_orders
        where created_at >= now() - interval '30 days' group by status) q;

  select coalesce(jsonb_object_agg(channel, gmv), '{}'::jsonb) into v_channels
  from (select channel, coalesce(sum(total), 0) as gmv from public.store_orders
        where created_at >= now() - interval '30 days' and status <> 'cancelled' and payment_status = 'paid'
        group by channel) q;

  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'name', q.name, 'slug', q.slug,
                                               'gmv', q.gmv, 'orders', q.orders) order by q.gmv desc), '[]'::jsonb)
  into v_top
  from (
    select t.id, t.trading_name as name, t.slug, coalesce(sum(o.total), 0) as gmv, count(o.id) as orders
    from public.tenants t
    join public.store_orders o on o.tenant_id = t.id
     and o.created_at >= now() - interval '30 days' and o.status <> 'cancelled' and o.payment_status = 'paid'
    group by t.id order by gmv desc limit 5
  ) q;

  select jsonb_build_object(
    'ridersPendingReview', (select count(*) from public.riders where kyc_status = 'pending_review'),
    'payoutsPending', (select count(*) from public.rider_payouts where status in ('pending', 'processing')),
    'payoutsPendingAmount', (select coalesce(sum(amount), 0) from public.rider_payouts
                             where status in ('pending', 'processing')),
    'unpaidTransfers', (select count(*) from public.store_orders
                        where payment_method = 'Transfer' and payment_status = 'unpaid' and status <> 'cancelled'),
    'suspendedStores', (select count(*) from public.tenants where status = 'suspended'),
    'storesPendingKyc', (select count(*) from public.tenants where kyc_status = 'pending_review'),
    'newStores7d', (select count(*) from public.tenants where created_at >= now() - interval '7 days'),
    'newRiders7d', (select count(*) from public.riders where created_at >= now() - interval '7 days')
  ) into v_queue;

  select jsonb_build_object(
    'gmv7d', coalesce(sum(total) filter (where created_at >= now() - interval '7 days'), 0),
    'gmvPrev7d', coalesce(sum(total) filter (where created_at < now() - interval '7 days'
                                              and created_at >= now() - interval '14 days'), 0),
    'orders7d', count(*) filter (where created_at >= now() - interval '7 days'),
    'ordersPrev7d', count(*) filter (where created_at < now() - interval '7 days'
                                      and created_at >= now() - interval '14 days')
  ) into v_cmp
  from public.store_orders
  where status <> 'cancelled' and payment_status = 'paid' and created_at >= now() - interval '14 days';

  return jsonb_build_object(
    'days', v_days, 'series', v_series, 'statusBreakdown', v_status, 'channelGmv', v_channels,
    'topStores', v_top, 'queue', v_queue, 'compare', v_cmp
  );
end;
$$;

-- ============================================================================
-- 8. ADMIN ACCOUNTS + AUDIT LOG VIEWER
-- ============================================================================
create or replace function public.admin_list_admins()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.full_name, 'email', u.email, 'since', p.updated_at,
    'isYou', p.id = auth.uid()) order by p.created_at), '[]'::jsonb)
  into v_rows
  from public.profiles p join auth.users u on u.id = p.id
  where p.is_platform_admin;

  return v_rows;
end;
$$;

create or replace function public.admin_set_platform_admin(p_email text, p_is_admin boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select u.id into v_user_id from auth.users u where lower(u.email) = lower(trim(coalesce(p_email, '')));
  if v_user_id is null then
    raise exception 'No account exists with that email. Ask them to sign up first.';
  end if;
  if not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'That account has no profile yet. Ask them to sign in once first.';
  end if;
  if not p_is_admin and v_user_id = auth.uid() then
    raise exception 'You cannot remove your own admin access';
  end if;

  update public.profiles set is_platform_admin = coalesce(p_is_admin, false) where id = v_user_id;

  perform public.admin_log('admin.access', 'admin', v_user_id::text,
    format('%s %s platform admin access', lower(trim(p_email)),
           case when p_is_admin then 'granted' else 'removed from' end));

  return jsonb_build_object('id', v_user_id, 'isAdmin', p_is_admin);
end;
$$;

create or replace function public.admin_list_audit(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select a.created_at, jsonb_build_object(
      'id', a.id, 'admin', a.admin_email, 'action', a.action, 'entityType', a.entity_type,
      'entityId', a.entity_id, 'summary', a.summary, 'metadata', a.metadata, 'createdAt', a.created_at) as j
    from public.admin_audit_log a
    order by a.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 500)
  ) x;

  return v_rows;
end;
$$;

-- ============================================================================
-- 9. GRANTS
-- ============================================================================
revoke all on function public.admin_set_tenant_status(uuid, public.tenant_status) from public, anon;
revoke all on function public.admin_reset_employee_pin(uuid, text) from public, anon;
revoke all on function public.admin_set_employee_active(uuid, boolean) from public, anon;
revoke all on function public.admin_review_rider_kyc(uuid, public.kyc_status, text) from public, anon;
revoke all on function public.admin_list_riders() from public, anon;
revoke all on function public.admin_get_rider(uuid) from public, anon;
revoke all on function public.admin_review_rider_document(uuid, text, text) from public, anon;
revoke all on function public.admin_set_rider_suspended(uuid, boolean, text) from public, anon;
revoke all on function public.admin_list_payouts(text) from public, anon;
revoke all on function public.admin_update_payout(uuid, text, text, text) from public, anon;
revoke all on function public.admin_list_orders(integer) from public, anon;
revoke all on function public.admin_get_order(uuid) from public, anon;
revoke all on function public.admin_cancel_order(uuid, text) from public, anon;
revoke all on function public.admin_mark_order_paid(uuid) from public, anon;
revoke all on function public.admin_get_store(uuid) from public, anon;
revoke all on function public.admin_get_trends(integer) from public, anon;
revoke all on function public.admin_list_admins() from public, anon;
revoke all on function public.admin_set_platform_admin(text, boolean) from public, anon;
revoke all on function public.admin_list_audit(integer) from public, anon;

grant execute on function public.admin_set_tenant_status(uuid, public.tenant_status) to authenticated;
grant execute on function public.admin_reset_employee_pin(uuid, text) to authenticated;
grant execute on function public.admin_set_employee_active(uuid, boolean) to authenticated;
grant execute on function public.admin_review_rider_kyc(uuid, public.kyc_status, text) to authenticated;
grant execute on function public.admin_list_riders() to authenticated;
grant execute on function public.admin_get_rider(uuid) to authenticated;
grant execute on function public.admin_review_rider_document(uuid, text, text) to authenticated;
grant execute on function public.admin_set_rider_suspended(uuid, boolean, text) to authenticated;
grant execute on function public.admin_list_payouts(text) to authenticated;
grant execute on function public.admin_update_payout(uuid, text, text, text) to authenticated;
grant execute on function public.admin_list_orders(integer) to authenticated;
grant execute on function public.admin_get_order(uuid) to authenticated;
grant execute on function public.admin_cancel_order(uuid, text) to authenticated;
grant execute on function public.admin_mark_order_paid(uuid) to authenticated;
grant execute on function public.admin_get_store(uuid) to authenticated;
grant execute on function public.admin_get_trends(integer) to authenticated;
grant execute on function public.admin_list_admins() to authenticated;
grant execute on function public.admin_set_platform_admin(text, boolean) to authenticated;
grant execute on function public.admin_list_audit(integer) to authenticated;

-- ============================================================================
-- 10. BICYCLE RIDERS HAVE NO LICENCE
-- ============================================================================
alter table public.riders alter column drivers_license_number drop not null;

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

  if p_vehicle_type <> 'bicycle' and (v_license is null or length(v_license) < 5) then
    raise exception 'Enter a valid licence number for your vehicle';
  end if;

  if coalesce(trim(p_base_address), '') = '' then
    raise exception 'Enter your base address or pickup area';
  end if;

  insert into public.riders (
    user_id, date_of_birth, vehicle_type, vehicle_make_model, vehicle_plate_number,
    drivers_license_number, drivers_license_expiry, state, city, base_address,
    next_of_kin_name, next_of_kin_phone, onboarding_status, onboarding_step
  )
  values (
    v_user_id, p_date_of_birth, p_vehicle_type,
    nullif(trim(coalesce(p_vehicle_make_model, '')), ''),
    nullif(trim(coalesce(p_vehicle_plate_number, '')), ''),
    case when p_vehicle_type = 'bicycle' then null else v_license end,
    case when p_vehicle_type = 'bicycle' then null else p_drivers_license_expiry end,
    nullif(trim(coalesce(p_state, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    trim(p_base_address),
    nullif(trim(coalesce(p_next_of_kin_name, '')), ''),
    nullif(trim(coalesce(p_next_of_kin_phone, '')), ''),
    'complete', 4
  )
  returning * into v_rider;

  insert into public.rider_kyc_submissions (rider_id, status) values (v_rider.id, 'not_started');

  return jsonb_build_object('id', v_rider.id, 'onboarding_status', v_rider.onboarding_status);
end;
$$;

revoke all on function public.provision_rider(
  date, public.vehicle_type, text, text, text, date, text, text, text, text, text
) from public, anon;
grant execute on function public.provision_rider(
  date, public.vehicle_type, text, text, text, date, text, text, text, text, text
) to authenticated;

-- ============================================================================
-- 11. FULL STORE LIST (same per-store stats as the overview, up to 500 stores)
-- ============================================================================
create or replace function public.admin_list_stores()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stores jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_stores
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
    limit 500
  ) x;


  return v_stores;
end;
$$;

revoke all on function public.admin_list_stores() from public, anon;
grant execute on function public.admin_list_stores() to authenticated;
