import { isSupabaseConfigured, supabase } from '../lib/supabase';

/** Passenger rides API. Every call returns real data or rejects with the real error. */

function requireBackend() {
  if (!isSupabaseConfigured) throw new Error('Rides are not available right now. Please try again later.');
}

async function rpc(name, args) {
  requireBackend();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

export const VEHICLES = [
  { id: 'motorcycle', label: 'Okada', emoji: '🏍️', minPrice: 300, startPrice: 1000, step: 100, seats: '1 passenger' },
  { id: 'tricycle', label: 'Keke / Maruwa', emoji: '🛺', minPrice: 400, startPrice: 1500, step: 100, seats: 'Up to 3 passengers' },
  { id: 'car', label: 'Car', emoji: '🚗', minPrice: 800, startPrice: 2500, step: 200, seats: 'Up to 4 passengers' }
];

export const vehicleById = (id) => VEHICLES.find((v) => v.id === id) || VEHICLES[0];

export async function createRide({ vehicle, pickup, dropoff, price, note, scheduledFor, phone }) {
  const data = await rpc('create_ride_request', {
    p_vehicle: vehicle,
    p_pickup: pickup,
    p_dropoff: dropoff,
    p_price: price,
    p_note: note || null,
    p_scheduled_for: scheduledFor || null,
    p_phone: phone || null
  });
  return { data };
}

export const fetchMyRides = async (limit = 30) => ({ data: (await rpc('my_rides', { p_limit: limit })) || [] });
export const fetchMyRide = async (rideId) => ({ data: await rpc('my_ride', { p_ride_id: rideId }) });
export const updateRideOffer = async (rideId, price) => ({ data: await rpc('update_ride_offer', { p_ride_id: rideId, p_price: price }) });
export const acceptRideBid = async (bidId) => ({ data: await rpc('accept_ride_bid', { p_bid_id: bidId }) });
export const cancelRide = async (rideId, reason = null) => ({ data: await rpc('cancel_ride', { p_ride_id: rideId, p_reason: reason }) });
export const rateRide = async (rideId, rating, comment = null) => ({
  data: await rpc('rate_ride', { p_ride_id: rideId, p_rating: rating, p_comment: comment })
});

export const ACTIVE_STATUSES = ['open', 'assigned', 'arrived', 'in_progress'];
