-- Migration: real passenger rides (okada, keke/maruwa, car).
-- Passenger posts a trip with an offered price; verified riders bid or accept; the
-- passenger chooses one; the rider arrives, starts the trip with the passenger's code
-- and completes it. Payment is cash to the rider (no platform wallet involved yet).
-- Date: 2026-11-08
--
-- All reads and writes go through the SECURITY DEFINER functions below. The tables
-- have row-level security enabled and no policies, so the anon/authenticated keys
-- cannot touch them directly.

-- ============================================================================
-- 1. TABLES
-- ============================================================================
create table if not exists public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references auth.users(id) on delete cascade,
  passenger_name text not null,
  passenger_phone text not null,
  vehicle_type text not null check (vehicle_type in ('motorcycle', 'tricycle', 'car')),
  pickup_address text not null check (length(trim(pickup_address)) between 5 and 300),
  dropoff_address text not null check (length(trim(dropoff_address)) between 5 and 300),
  note text check (note is null or length(note) <= 300),
  scheduled_for timestamptz,
  offered_price numeric(12,2) not null check (offered_price between 100 and 1000000),
  agreed_price numeric(12,2),
  status text not null default 'open'
    check (status in ('open', 'assigned', 'arrived', 'in_progress', 'completed', 'cancelled')),
  rider_id uuid references public.riders(id) on delete set null,
  start_otp text,
  payment_method text not null default 'cash' check (payment_method = 'cash'),
  rating smallint check (rating between 1 and 5),
  rating_comment text check (rating_comment is null or length(rating_comment) <= 400),
  cancelled_by text check (cancelled_by in ('passenger', 'rider', 'admin')),
  cancel_reason text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_ride_requests_open on public.ride_requests (status, created_at desc);
create index if not exists idx_ride_requests_passenger on public.ride_requests (passenger_id, created_at desc);
create index if not exists idx_ride_requests_rider on public.ride_requests (rider_id, status);

create table if not exists public.ride_bids (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.ride_requests(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  price numeric(12,2) not null check (price between 100 and 1000000),
  eta_minutes integer not null default 10 check (eta_minutes between 1 and 120),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ride_id, rider_id)
);

create index if not exists idx_ride_bids_ride on public.ride_bids (ride_id, status);

create table if not exists public.ride_events (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.ride_requests(id) on delete cascade,
  actor text not null check (actor in ('passenger', 'rider', 'admin', 'system')),
  actor_id uuid,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ride_events_ride on public.ride_events (ride_id, created_at);

alter table public.ride_requests enable row level security;
alter table public.ride_bids enable row level security;
alter table public.ride_events enable row level security;
revoke all on public.ride_requests, public.ride_bids, public.ride_events from anon, authenticated;

-- ============================================================================
-- 2. HELPERS
-- ============================================================================
create or replace function public.ride_min_price(p_vehicle text)
returns numeric
language sql
immutable
as $$
  select case p_vehicle when 'motorcycle' then 300 when 'tricycle' then 400 when 'car' then 800 else 1000000 end;
$$;

-- Which ride type a rider's registered vehicle can serve (bicycles cannot take rides).
create or replace function public.rider_ride_vehicle(p_type public.vehicle_type)
returns text
language sql
immutable
as $$
  select case p_type
    when 'motorcycle' then 'motorcycle'
    when 'tricycle' then 'tricycle'
    when 'car' then 'car'
    when 'van' then 'car'
    else null
  end;
$$;

-- Immediate requests expire 30 minutes after posting; scheduled ones 30 minutes after pickup time.
create or replace function public.ride_expired(r public.ride_requests)
returns boolean
language sql
stable
as $$
  select r.status = 'open' and (
    (r.scheduled_for is null and r.created_at < now() - interval '30 minutes')
    or (r.scheduled_for is not null and r.scheduled_for < now() - interval '30 minutes')
  );
$$;

-- A rider is busy while on a ride that is due soon, or on a store delivery.
create or replace function public.rider_is_busy(p_rider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
           select 1 from public.ride_requests r
           where r.rider_id = p_rider_id and r.status in ('assigned', 'arrived', 'in_progress')
             and (r.scheduled_for is null or r.scheduled_for < now() + interval '2 hours'))
      or exists (
           select 1 from public.store_orders o where o.rider_id = p_rider_id and o.status = 'dispatched');
$$;

create or replace function public.ride_log(p_ride_id uuid, p_actor text, p_event text, p_detail jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ride_events (ride_id, actor, actor_id, event, detail)
  values (p_ride_id, p_actor, auth.uid(), p_event, coalesce(p_detail, '{}'::jsonb));
$$;

revoke all on function public.rider_is_busy(uuid) from public, anon, authenticated;
revoke all on function public.ride_log(uuid, text, text, jsonb) from public, anon, authenticated;

-- ============================================================================
-- 3. PASSENGER FUNCTIONS
-- ============================================================================
create or replace function public.create_ride_request(
  p_vehicle text,
  p_pickup text,
  p_dropoff text,
  p_price numeric,
  p_note text default null,
  p_scheduled_for timestamptz default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_phone text;
  v_pickup text := trim(coalesce(p_pickup, ''));
  v_dropoff text := trim(coalesce(p_dropoff, ''));
  v_id uuid;
  v_otp text;
begin
  if v_uid is null then
    raise exception 'Sign in to book a ride';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profile not found';
  end if;

  v_phone := coalesce(nullif(trim(coalesce(p_phone, '')), ''), nullif(trim(coalesce(v_profile.phone, '')), ''));
  if v_phone is null or v_phone !~ '^[+0-9 ()-]{7,20}$' then
    raise exception 'Add a valid phone number so your rider can reach you';
  end if;

  if p_vehicle is null or p_vehicle not in ('motorcycle', 'tricycle', 'car') then
    raise exception 'Choose a vehicle';
  end if;
  if length(v_pickup) < 5 or length(v_pickup) > 300 then
    raise exception 'Enter the pickup address';
  end if;
  if length(v_dropoff) < 5 or length(v_dropoff) > 300 then
    raise exception 'Enter the drop-off address';
  end if;
  if lower(v_pickup) = lower(v_dropoff) then
    raise exception 'Pickup and drop-off cannot be the same place';
  end if;
  if p_price is null or p_price < public.ride_min_price(p_vehicle) then
    raise exception 'The lowest offer for this vehicle is ₦%', public.ride_min_price(p_vehicle)::integer;
  end if;
  if p_price > 1000000 then
    raise exception 'That offer is too high';
  end if;

  if p_scheduled_for is not null then
    if p_scheduled_for < now() + interval '15 minutes' then
      raise exception 'Schedule your ride at least 15 minutes ahead';
    end if;
    if p_scheduled_for > now() + interval '14 days' then
      raise exception 'Rides can be scheduled up to 14 days ahead';
    end if;
    if (select count(*) from public.ride_requests r
        where r.passenger_id = v_uid and r.status = 'open' and r.scheduled_for is not null
          and not public.ride_expired(r)) >= 3 then
      raise exception 'You can have up to 3 scheduled rides waiting for riders';
    end if;
  elsif exists (
    select 1 from public.ride_requests r
    where r.passenger_id = v_uid
      and ((r.status in ('assigned', 'arrived', 'in_progress')
            and (r.scheduled_for is null or r.scheduled_for < now() + interval '2 hours'))
           or (r.status = 'open' and r.scheduled_for is null and not public.ride_expired(r)))
  ) then
    raise exception 'You already have a ride in progress. Finish or cancel it before booking another.';
  end if;

  v_otp := lpad((floor(random() * 9000) + 1000)::text, 4, '0');

  insert into public.ride_requests (
    passenger_id, passenger_name, passenger_phone, vehicle_type, pickup_address, dropoff_address,
    note, scheduled_for, offered_price, start_otp
  ) values (
    v_uid, coalesce(nullif(trim(v_profile.full_name), ''), 'Passenger'), v_phone, p_vehicle, v_pickup, v_dropoff,
    nullif(trim(coalesce(p_note, '')), ''), p_scheduled_for, p_price, v_otp
  )
  returning id into v_id;

  perform public.ride_log(v_id, 'passenger', 'requested',
    jsonb_build_object('offeredPrice', p_price, 'vehicle', p_vehicle, 'scheduledFor', p_scheduled_for));

  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.my_rides(p_limit integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in to see your rides';
  end if;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select r.created_at, jsonb_build_object(
      'id', r.id,
      'status', case when public.ride_expired(r) then 'expired' else r.status end,
      'vehicleType', r.vehicle_type,
      'pickup', r.pickup_address,
      'dropoff', r.dropoff_address,
      'offeredPrice', r.offered_price,
      'agreedPrice', r.agreed_price,
      'scheduledFor', r.scheduled_for,
      'createdAt', r.created_at,
      'completedAt', r.completed_at,
      'bidCount', (select count(*) from public.ride_bids b where b.ride_id = r.id and b.status = 'pending'),
      'riderName', (select split_part(p.full_name, ' ', 1)
                    from public.riders rd join public.profiles p on p.id = rd.user_id where rd.id = r.rider_id),
      'rating', r.rating
    ) as j
    from public.ride_requests r
    where r.passenger_id = auth.uid()
    order by r.created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) x;

  return v_rows;
end;
$$;

create or replace function public.my_ride(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.ride_requests%rowtype;
  v_status text;
  v_bids jsonb := '[]'::jsonb;
  v_rider jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in to see your ride';
  end if;

  select * into v_r from public.ride_requests where id = p_ride_id and passenger_id = auth.uid();
  if not found then
    raise exception 'Ride not found';
  end if;

  v_status := case when public.ride_expired(v_r) then 'expired' else v_r.status end;

  if v_status = 'open' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id,
      'price', b.price,
      'etaMinutes', b.eta_minutes,
      'createdAt', b.created_at,
      'rider', jsonb_build_object(
        'name', split_part(p.full_name, ' ', 1),
        'vehicleType', rd.vehicle_type,
        'makeModel', rd.vehicle_make_model,
        'plate', rd.vehicle_plate_number,
        'rating', st.avg_rating,
        'ratingCount', st.rating_count,
        'trips', st.trips
      )
    ) order by b.price asc, b.created_at asc), '[]'::jsonb)
    into v_bids
    from public.ride_bids b
    join public.riders rd on rd.id = b.rider_id
    join public.profiles p on p.id = rd.user_id
    left join lateral (
      select round(avg(x.rating)::numeric, 1) as avg_rating, count(x.rating) as rating_count,
             count(*) filter (where x.status = 'completed') as trips
      from public.ride_requests x where x.rider_id = rd.id
    ) st on true
    where b.ride_id = v_r.id and b.status = 'pending';
  end if;

  if v_r.rider_id is not null and v_r.status in ('assigned', 'arrived', 'in_progress', 'completed') then
    select jsonb_build_object(
      'name', split_part(p.full_name, ' ', 1),
      'phone', case when v_r.status = 'completed' then null else p.phone end,
      'vehicleType', rd.vehicle_type,
      'makeModel', rd.vehicle_make_model,
      'plate', rd.vehicle_plate_number
    ) into v_rider
    from public.riders rd join public.profiles p on p.id = rd.user_id
    where rd.id = v_r.rider_id;
  end if;

  return jsonb_build_object(
    'id', v_r.id,
    'status', v_status,
    'vehicleType', v_r.vehicle_type,
    'pickup', v_r.pickup_address,
    'dropoff', v_r.dropoff_address,
    'note', v_r.note,
    'scheduledFor', v_r.scheduled_for,
    'offeredPrice', v_r.offered_price,
    'agreedPrice', v_r.agreed_price,
    'minPrice', public.ride_min_price(v_r.vehicle_type),
    -- the start code is the passenger's to show the rider at pickup, before the trip begins
    'startOtp', case when v_r.status in ('assigned', 'arrived') then v_r.start_otp else null end,
    'passengerPhone', v_r.passenger_phone,
    'bids', v_bids,
    'rider', v_rider,
    'rating', v_r.rating,
    'ratingComment', v_r.rating_comment,
    'cancelledBy', v_r.cancelled_by,
    'cancelReason', v_r.cancel_reason,
    'createdAt', v_r.created_at,
    'acceptedAt', v_r.accepted_at,
    'arrivedAt', v_r.arrived_at,
    'startedAt', v_r.started_at,
    'completedAt', v_r.completed_at,
    'cancelledAt', v_r.cancelled_at
  );
end;
$$;

create or replace function public.update_ride_offer(p_ride_id uuid, p_price numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.ride_requests%rowtype;
begin
  select * into v_r from public.ride_requests where id = p_ride_id and passenger_id = auth.uid() for update;
  if not found then
    raise exception 'Ride not found';
  end if;
  if v_r.status <> 'open' or public.ride_expired(v_r) then
    raise exception 'This ride is no longer open';
  end if;
  if p_price is null or p_price < public.ride_min_price(v_r.vehicle_type) then
    raise exception 'The lowest offer for this vehicle is ₦%', public.ride_min_price(v_r.vehicle_type)::integer;
  end if;
  if p_price > 1000000 then
    raise exception 'That offer is too high';
  end if;

  update public.ride_requests set offered_price = p_price, updated_at = now() where id = p_ride_id;
  perform public.ride_log(p_ride_id, 'passenger', 'offer_changed', jsonb_build_object('from', v_r.offered_price, 'to', p_price));
  return jsonb_build_object('id', p_ride_id, 'offeredPrice', p_price);
end;
$$;

create or replace function public.accept_ride_bid(p_bid_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bid public.ride_bids%rowtype;
  v_r public.ride_requests%rowtype;
begin
  select * into v_bid from public.ride_bids where id = p_bid_id;
  if not found then
    raise exception 'Offer not found';
  end if;

  select * into v_r from public.ride_requests
  where id = v_bid.ride_id and passenger_id = auth.uid() for update;
  if not found then
    raise exception 'Ride not found';
  end if;
  if v_r.status <> 'open' or public.ride_expired(v_r) then
    raise exception 'This ride is no longer open';
  end if;

  -- re-read the bid now that the ride is locked
  select * into v_bid from public.ride_bids where id = p_bid_id for update;
  if v_bid.status <> 'pending' then
    raise exception 'That offer is no longer available';
  end if;
  if public.rider_is_busy(v_bid.rider_id) then
    raise exception 'That rider just took another job. Please choose another offer.';
  end if;

  update public.ride_requests
  set status = 'assigned', rider_id = v_bid.rider_id, agreed_price = v_bid.price,
      accepted_at = now(), updated_at = now()
  where id = v_r.id;

  update public.ride_bids
  set status = case when id = p_bid_id then 'accepted' else 'rejected' end, updated_at = now()
  where ride_id = v_r.id and status = 'pending';

  perform public.ride_log(v_r.id, 'passenger', 'bid_accepted', jsonb_build_object('bidId', p_bid_id, 'price', v_bid.price));
  return jsonb_build_object('id', v_r.id, 'status', 'assigned', 'agreedPrice', v_bid.price);
end;
$$;

create or replace function public.cancel_ride(p_ride_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.ride_requests%rowtype;
begin
  select * into v_r from public.ride_requests where id = p_ride_id and passenger_id = auth.uid() for update;
  if not found then
    raise exception 'Ride not found';
  end if;
  if v_r.status not in ('open', 'assigned', 'arrived') then
    raise exception 'This ride can no longer be cancelled (it is %)', v_r.status;
  end if;

  update public.ride_requests
  set status = 'cancelled', cancelled_by = 'passenger', cancel_reason = nullif(trim(coalesce(p_reason, '')), ''),
      cancelled_at = now(), updated_at = now()
  where id = p_ride_id;
  update public.ride_bids set status = 'rejected', updated_at = now() where ride_id = p_ride_id and status = 'pending';

  perform public.ride_log(p_ride_id, 'passenger', 'cancelled', jsonb_build_object('reason', p_reason, 'was', v_r.status));
  return jsonb_build_object('id', p_ride_id, 'status', 'cancelled');
end;
$$;

create or replace function public.rate_ride(p_ride_id uuid, p_rating integer, p_comment text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.ride_requests%rowtype;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Choose a rating from 1 to 5';
  end if;

  select * into v_r from public.ride_requests where id = p_ride_id and passenger_id = auth.uid() for update;
  if not found then
    raise exception 'Ride not found';
  end if;
  if v_r.status <> 'completed' then
    raise exception 'You can rate a ride after it is completed';
  end if;
  if v_r.rating is not null then
    raise exception 'You already rated this ride';
  end if;

  update public.ride_requests
  set rating = p_rating, rating_comment = nullif(left(trim(coalesce(p_comment, '')), 400), ''), updated_at = now()
  where id = p_ride_id;
  perform public.ride_log(p_ride_id, 'passenger', 'rated', jsonb_build_object('rating', p_rating));
  return jsonb_build_object('id', p_ride_id, 'rating', p_rating);
end;
$$;

-- ============================================================================
-- 4. RIDER FUNCTIONS
-- ============================================================================
create or replace function public.rider_open_rides()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_vehicle text;
  v_rows jsonb;
begin
  v_rider := public.current_ready_rider();
  if not v_rider.is_online then
    return '[]'::jsonb;
  end if;
  v_vehicle := public.rider_ride_vehicle(v_rider.vehicle_type);
  if v_vehicle is null then
    return '[]'::jsonb;
  end if;

  -- passenger phone and surname are withheld until the passenger picks this rider
  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select r.created_at, jsonb_build_object(
      'id', r.id,
      'passengerName', split_part(r.passenger_name, ' ', 1),
      'pickup', r.pickup_address,
      'dropoff', r.dropoff_address,
      'note', r.note,
      'scheduledFor', r.scheduled_for,
      'offeredPrice', r.offered_price,
      'minPrice', public.ride_min_price(r.vehicle_type),
      'createdAt', r.created_at,
      'bidCount', (select count(*) from public.ride_bids b where b.ride_id = r.id and b.status = 'pending'),
      'myBid', (select jsonb_build_object('price', b.price, 'etaMinutes', b.eta_minutes, 'status', b.status)
                from public.ride_bids b where b.ride_id = r.id and b.rider_id = v_rider.id
                  and b.status in ('pending', 'rejected'))
    ) as j
    from public.ride_requests r
    where r.status = 'open' and not public.ride_expired(r)
      and r.vehicle_type = v_vehicle and r.passenger_id <> auth.uid()
    order by r.created_at desc
    limit 30
  ) x;

  return v_rows;
end;
$$;

create or replace function public.rider_bid_ride(p_ride_id uuid, p_price numeric, p_eta_minutes integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_r public.ride_requests%rowtype;
  v_eta integer := coalesce(p_eta_minutes, 10);
begin
  v_rider := public.current_ready_rider();

  select * into v_r from public.ride_requests where id = p_ride_id for share;
  if not found or v_r.status <> 'open' or public.ride_expired(v_r) then
    raise exception 'This ride is no longer open';
  end if;
  if v_r.passenger_id = auth.uid() then
    raise exception 'You cannot bid on your own ride';
  end if;
  if public.rider_ride_vehicle(v_rider.vehicle_type) is distinct from v_r.vehicle_type then
    raise exception 'This ride needs a different vehicle';
  end if;
  if public.rider_is_busy(v_rider.id) then
    raise exception 'Finish your current job before taking another';
  end if;
  if p_price is null or p_price < public.ride_min_price(v_r.vehicle_type) or p_price > 1000000 then
    raise exception 'Enter a price of at least ₦%', public.ride_min_price(v_r.vehicle_type)::integer;
  end if;
  if v_eta < 1 or v_eta > 120 then
    raise exception 'Enter your arrival time in minutes (1 to 120)';
  end if;

  insert into public.ride_bids (ride_id, rider_id, price, eta_minutes)
  values (p_ride_id, v_rider.id, p_price, v_eta)
  on conflict (ride_id, rider_id) do update
    set price = excluded.price, eta_minutes = excluded.eta_minutes, status = 'pending', updated_at = now();

  perform public.ride_log(p_ride_id, 'rider', 'bid', jsonb_build_object('price', p_price, 'etaMinutes', v_eta));
  return jsonb_build_object('rideId', p_ride_id, 'price', p_price, 'etaMinutes', v_eta);
end;
$$;

create or replace function public.rider_withdraw_bid(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
begin
  v_rider := public.current_ready_rider();
  update public.ride_bids set status = 'withdrawn', updated_at = now()
  where ride_id = p_ride_id and rider_id = v_rider.id and status = 'pending';
  perform public.ride_log(p_ride_id, 'rider', 'bid_withdrawn');
  return jsonb_build_object('rideId', p_ride_id, 'withdrawn', true);
end;
$$;

create or replace function public.rider_active_ride()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_r public.ride_requests%rowtype;
begin
  select * into v_rider from public.riders where user_id = auth.uid();
  if not found then
    return null;
  end if;

  select * into v_r from public.ride_requests
  where rider_id = v_rider.id and status in ('assigned', 'arrived', 'in_progress')
  order by case status when 'in_progress' then 0 when 'arrived' then 1 else 2 end,
           coalesce(scheduled_for, accepted_at) asc
  limit 1;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_r.id,
    'status', v_r.status,
    'vehicleType', v_r.vehicle_type,
    'passengerName', v_r.passenger_name,
    'passengerPhone', v_r.passenger_phone,
    'pickup', v_r.pickup_address,
    'dropoff', v_r.dropoff_address,
    'note', v_r.note,
    'scheduledFor', v_r.scheduled_for,
    'agreedPrice', v_r.agreed_price,
    'acceptedAt', v_r.accepted_at,
    'arrivedAt', v_r.arrived_at,
    'startedAt', v_r.started_at
  );
end;
$$;

create or replace function public.rider_ride_arrived(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_r public.ride_requests%rowtype;
begin
  v_rider := public.current_ready_rider();
  select * into v_r from public.ride_requests where id = p_ride_id for update;
  if not found or v_r.rider_id is distinct from v_rider.id then
    raise exception 'This ride is not assigned to you';
  end if;
  if v_r.status <> 'assigned' then
    raise exception 'This ride is not waiting for pickup';
  end if;

  update public.ride_requests set status = 'arrived', arrived_at = now(), updated_at = now() where id = p_ride_id;
  perform public.ride_log(p_ride_id, 'rider', 'arrived');
  return jsonb_build_object('id', p_ride_id, 'status', 'arrived');
end;
$$;

create or replace function public.rider_start_ride(p_ride_id uuid, p_otp text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_r public.ride_requests%rowtype;
begin
  v_rider := public.current_ready_rider();
  select * into v_r from public.ride_requests where id = p_ride_id for update;
  if not found or v_r.rider_id is distinct from v_rider.id then
    raise exception 'This ride is not assigned to you';
  end if;
  if v_r.status <> 'arrived' then
    raise exception 'Confirm you have arrived at the pickup first';
  end if;
  if v_r.start_otp is null or trim(v_r.start_otp) <> trim(coalesce(p_otp, '')) then
    raise exception 'That code is not right. Ask the passenger for the 4-digit code on their screen.';
  end if;

  update public.ride_requests set status = 'in_progress', started_at = now(), updated_at = now() where id = p_ride_id;
  perform public.ride_log(p_ride_id, 'rider', 'started');
  return jsonb_build_object('id', p_ride_id, 'status', 'in_progress');
end;
$$;

create or replace function public.rider_complete_ride(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_r public.ride_requests%rowtype;
begin
  v_rider := public.current_ready_rider();
  select * into v_r from public.ride_requests where id = p_ride_id for update;
  if not found or v_r.rider_id is distinct from v_rider.id then
    raise exception 'This ride is not assigned to you';
  end if;
  if v_r.status <> 'in_progress' then
    raise exception 'This ride has not started yet';
  end if;

  update public.ride_requests set status = 'completed', completed_at = now(), updated_at = now() where id = p_ride_id;
  perform public.ride_log(p_ride_id, 'rider', 'completed', jsonb_build_object('price', v_r.agreed_price));
  return jsonb_build_object('id', p_ride_id, 'status', 'completed', 'collect', v_r.agreed_price);
end;
$$;

-- A rider who cannot make it hands the ride back; it reopens and the passenger's other offers return.
create or replace function public.rider_cancel_ride(p_ride_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_r public.ride_requests%rowtype;
begin
  v_rider := public.current_ready_rider();
  select * into v_r from public.ride_requests where id = p_ride_id for update;
  if not found or v_r.rider_id is distinct from v_rider.id then
    raise exception 'This ride is not assigned to you';
  end if;
  if v_r.status not in ('assigned', 'arrived') then
    raise exception 'A ride that has started cannot be handed back';
  end if;

  update public.ride_requests
  set status = 'open', rider_id = null, agreed_price = null, accepted_at = null, arrived_at = null, updated_at = now()
  where id = p_ride_id;
  update public.ride_bids set status = 'withdrawn', updated_at = now()
  where ride_id = p_ride_id and rider_id = v_rider.id;
  update public.ride_bids set status = 'pending', updated_at = now()
  where ride_id = p_ride_id and status = 'rejected';

  perform public.ride_log(p_ride_id, 'rider', 'rider_cancelled', jsonb_build_object('reason', p_reason));
  return jsonb_build_object('id', p_ride_id, 'status', 'open');
end;
$$;

create or replace function public.rider_ride_history(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_rows jsonb;
begin
  select * into v_rider from public.riders where user_id = auth.uid();
  if not found then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb)
  into v_rows
  from (
    select r.completed_at as at, jsonb_build_object(
      'id', r.id,
      'passengerName', split_part(r.passenger_name, ' ', 1),
      'pickup', r.pickup_address,
      'dropoff', r.dropoff_address,
      'price', r.agreed_price,
      'rating', r.rating,
      'completedAt', r.completed_at
    ) as j
    from public.ride_requests r
    where r.rider_id = v_rider.id and r.status = 'completed'
    order by r.completed_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) x;

  return v_rows;
end;
$$;

-- ============================================================================
-- 5. ADMIN FUNCTIONS
-- ============================================================================
create or replace function public.admin_list_rides(p_limit integer default 200)
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
    select r.created_at, jsonb_build_object(
      'id', r.id,
      'status', case when public.ride_expired(r) then 'expired' else r.status end,
      'vehicleType', r.vehicle_type,
      'passengerName', r.passenger_name,
      'passengerPhone', r.passenger_phone,
      'pickup', r.pickup_address,
      'dropoff', r.dropoff_address,
      'offeredPrice', r.offered_price,
      'agreedPrice', r.agreed_price,
      'scheduledFor', r.scheduled_for,
      'riderId', r.rider_id,
      'riderName', (select p.full_name from public.riders rd join public.profiles p on p.id = rd.user_id where rd.id = r.rider_id),
      'bidCount', (select count(*) from public.ride_bids b where b.ride_id = r.id),
      'rating', r.rating,
      'createdAt', r.created_at,
      'completedAt', r.completed_at
    ) as j
    from public.ride_requests r
    order by r.created_at desc
    limit least(greatest(coalesce(p_limit, 200), 1), 500)
  ) x;

  return v_rows;
end;
$$;

create or replace function public.admin_get_ride(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.ride_requests%rowtype;
  v_bids jsonb;
  v_events jsonb;
  v_rider jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_r from public.ride_requests where id = p_ride_id;
  if not found then
    raise exception 'Ride not found';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'riderId', b.rider_id, 'riderName', p.full_name, 'price', b.price,
    'etaMinutes', b.eta_minutes, 'status', b.status, 'createdAt', b.created_at
  ) order by b.created_at), '[]'::jsonb)
  into v_bids
  from public.ride_bids b
  join public.riders rd on rd.id = b.rider_id
  join public.profiles p on p.id = rd.user_id
  where b.ride_id = v_r.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'actor', e.actor, 'event', e.event, 'detail', e.detail, 'at', e.created_at) order by e.created_at), '[]'::jsonb)
  into v_events
  from public.ride_events e where e.ride_id = v_r.id;

  select jsonb_build_object('id', rd.id, 'name', p.full_name, 'phone', p.phone,
                            'vehicleType', rd.vehicle_type, 'plate', rd.vehicle_plate_number)
  into v_rider
  from public.riders rd join public.profiles p on p.id = rd.user_id where rd.id = v_r.rider_id;

  return jsonb_build_object(
    'id', v_r.id,
    'status', case when public.ride_expired(v_r) then 'expired' else v_r.status end,
    'vehicleType', v_r.vehicle_type,
    'passenger', jsonb_build_object('name', v_r.passenger_name, 'phone', v_r.passenger_phone,
                                    'email', (select u.email from auth.users u where u.id = v_r.passenger_id)),
    'rider', v_rider,
    'pickup', v_r.pickup_address,
    'dropoff', v_r.dropoff_address,
    'note', v_r.note,
    'scheduledFor', v_r.scheduled_for,
    'offeredPrice', v_r.offered_price,
    'agreedPrice', v_r.agreed_price,
    'paymentMethod', v_r.payment_method,
    'rating', v_r.rating,
    'ratingComment', v_r.rating_comment,
    'cancelledBy', v_r.cancelled_by,
    'cancelReason', v_r.cancel_reason,
    'createdAt', v_r.created_at,
    'acceptedAt', v_r.accepted_at,
    'arrivedAt', v_r.arrived_at,
    'startedAt', v_r.started_at,
    'completedAt', v_r.completed_at,
    'cancelledAt', v_r.cancelled_at,
    'bids', v_bids,
    'events', v_events
  );
end;
$$;

create or replace function public.admin_cancel_ride(p_ride_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.ride_requests%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if v_reason is null then
    raise exception 'Add a reason for cancelling this ride';
  end if;

  select * into v_r from public.ride_requests where id = p_ride_id for update;
  if not found then
    raise exception 'Ride not found';
  end if;
  if v_r.status not in ('open', 'assigned', 'arrived', 'in_progress') then
    raise exception 'Only open or active rides can be cancelled (this one is %)', v_r.status;
  end if;

  update public.ride_requests
  set status = 'cancelled', cancelled_by = 'admin', cancel_reason = v_reason, cancelled_at = now(), updated_at = now()
  where id = p_ride_id;
  update public.ride_bids set status = 'rejected', updated_at = now() where ride_id = p_ride_id and status = 'pending';

  perform public.ride_log(p_ride_id, 'admin', 'cancelled', jsonb_build_object('reason', v_reason, 'was', v_r.status));
  perform public.admin_log('ride.cancel', 'ride', p_ride_id::text, format('Ride cancelled (%s)', v_reason),
    jsonb_build_object('was', v_r.status));
  return jsonb_build_object('id', p_ride_id, 'status', 'cancelled');
end;
$$;

-- ============================================================================
-- 6. A RIDER ON A RIDE CANNOT ACCEPT A STORE DELIVERY
-- ============================================================================
create or replace function public.accept_order_dispatch(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders;
  v_profile public.profiles%rowtype;
  v_order public.store_orders%rowtype;
  v_tenant public.tenants%rowtype;
begin
  v_rider := public.current_ready_rider();

  if exists (select 1 from public.ride_requests r where r.rider_id = v_rider.id
             and r.status in ('assigned', 'arrived', 'in_progress')
             and (r.scheduled_for is null or r.scheduled_for < now() + interval '2 hours')) then
    raise exception 'Finish your current ride before taking a delivery';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();

  select * into v_order from public.store_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.channel <> 'online' or v_order.fulfillment_type <> 'delivery'
     or v_order.payment_status <> 'paid' then
    raise exception 'This order is not available for delivery';
  end if;

  if v_order.rider_id is not null and v_order.rider_id <> v_rider.id then
    raise exception 'This order has already been claimed by another rider';
  end if;

  if v_order.status not in ('pending', 'dispatched') then
    raise exception 'This order is no longer open';
  end if;

  select * into v_tenant from public.tenants where id = v_order.tenant_id;

  update public.store_orders
  set rider_id = v_rider.id,
      courier_name = coalesce(v_profile.full_name, 'Courier Rider'),
      courier_phone = coalesce(v_profile.phone, v_rider.next_of_kin_phone),
      status = 'dispatched',
      courier_fare = coalesce(courier_fare, 1850)
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object(
    'orderId', v_order.id,
    'storeName', v_tenant.trading_name,
    'storeAddress', coalesce(v_tenant.address, 'Store pickup'),
    'storePhone', v_tenant.contact_phone,
    'customerName', v_order.customer_name,
    'customerAddress', coalesce(v_order.address, 'Doorstep Delivery'),
    'customerPhone', v_order.customer_phone,
    'fare', coalesce(v_order.courier_fare, 1850),
    'tip', coalesce(v_order.courier_tip, 0),
    'itemsSummary', coalesce(v_order.items_summary, 'Retail Package'),
    'status', v_order.status
  );
end;
$$;

revoke all on function public.accept_order_dispatch(uuid) from public, anon;
grant execute on function public.accept_order_dispatch(uuid) to authenticated;

-- ============================================================================
-- 7. GRANTS
-- ============================================================================
revoke all on function public.create_ride_request(text, text, text, numeric, text, timestamptz, text) from public, anon;
revoke all on function public.my_rides(integer) from public, anon;
revoke all on function public.my_ride(uuid) from public, anon;
revoke all on function public.update_ride_offer(uuid, numeric) from public, anon;
revoke all on function public.accept_ride_bid(uuid) from public, anon;
revoke all on function public.cancel_ride(uuid, text) from public, anon;
revoke all on function public.rate_ride(uuid, integer, text) from public, anon;
revoke all on function public.rider_open_rides() from public, anon;
revoke all on function public.rider_bid_ride(uuid, numeric, integer) from public, anon;
revoke all on function public.rider_withdraw_bid(uuid) from public, anon;
revoke all on function public.rider_active_ride() from public, anon;
revoke all on function public.rider_ride_arrived(uuid) from public, anon;
revoke all on function public.rider_start_ride(uuid, text) from public, anon;
revoke all on function public.rider_complete_ride(uuid) from public, anon;
revoke all on function public.rider_cancel_ride(uuid, text) from public, anon;
revoke all on function public.rider_ride_history(integer) from public, anon;
revoke all on function public.admin_list_rides(integer) from public, anon;
revoke all on function public.admin_get_ride(uuid) from public, anon;
revoke all on function public.admin_cancel_ride(uuid, text) from public, anon;

grant execute on function public.create_ride_request(text, text, text, numeric, text, timestamptz, text) to authenticated;
grant execute on function public.my_rides(integer) to authenticated;
grant execute on function public.my_ride(uuid) to authenticated;
grant execute on function public.update_ride_offer(uuid, numeric) to authenticated;
grant execute on function public.accept_ride_bid(uuid) to authenticated;
grant execute on function public.cancel_ride(uuid, text) to authenticated;
grant execute on function public.rate_ride(uuid, integer, text) to authenticated;
grant execute on function public.rider_open_rides() to authenticated;
grant execute on function public.rider_bid_ride(uuid, numeric, integer) to authenticated;
grant execute on function public.rider_withdraw_bid(uuid) to authenticated;
grant execute on function public.rider_active_ride() to authenticated;
grant execute on function public.rider_ride_arrived(uuid) to authenticated;
grant execute on function public.rider_start_ride(uuid, text) to authenticated;
grant execute on function public.rider_complete_ride(uuid) to authenticated;
grant execute on function public.rider_cancel_ride(uuid, text) to authenticated;
grant execute on function public.rider_ride_history(integer) to authenticated;
grant execute on function public.admin_list_rides(integer) to authenticated;
grant execute on function public.admin_get_ride(uuid) to authenticated;
grant execute on function public.admin_cancel_ride(uuid, text) to authenticated;
