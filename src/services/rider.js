import { isSupabaseConfigured, supabase } from '../lib/supabase';

/**
 * Rider app API. Every function resolves with `{ data }` or rejects with the real
 * error — a failed call must never look like a successful delivery, pickup or cashout.
 */

function requireBackend() {
  if (!isSupabaseConfigured) {
    throw new Error('The rider service is not available right now. Please try again later.');
  }
}

async function callRpc(name, args) {
  requireBackend();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return { data };
}

export async function setRiderOnline(online) {
  return callRpc('rider_set_online', { p_online: Boolean(online) });
}

export async function fetchAvailableDispatches() {
  const res = await callRpc('get_available_dispatches');
  return { data: Array.isArray(res.data) ? res.data : [] };
}

export const acceptDispatch = (orderId) => callRpc('accept_order_dispatch', { p_order_id: orderId });

/** The delivery the rider is on right now (null when none) — used to resume after a refresh. */
export const fetchActiveOrder = () => callRpc('rider_active_order');

export const pickUpOrder = (orderId) => callRpc('rider_pick_up_order', { p_order_id: orderId });

export const verifyDelivery = (orderId, otp) => callRpc('verify_order_delivery', { p_order_id: orderId, p_otp: otp });

export async function fetchHistory(limit = 50) {
  const res = await callRpc('rider_history', { p_limit: limit });
  return { data: Array.isArray(res.data) ? res.data : [] };
}

export const fetchRiderWallet = () => callRpc('get_rider_wallet');

export const savePayoutAccount = (bankName, accountNumber, accountName) =>
  callRpc('save_rider_payout_account', {
    p_bank_name: bankName,
    p_account_number: accountNumber,
    p_account_name: accountName
  });

/** Withdraws the whole available balance to the saved payout account (settled by the team). */
export const cashoutRiderWallet = () => callRpc('request_rider_cashout', {});

// ── Passenger rides (a rider can take rides as well as store deliveries) ──────
export async function fetchOpenRides() {
  const res = await callRpc('rider_open_rides');
  return { data: Array.isArray(res.data) ? res.data : [] };
}

export const bidOnRide = (rideId, price, etaMinutes) =>
  callRpc('rider_bid_ride', { p_ride_id: rideId, p_price: price, p_eta_minutes: etaMinutes });

export const withdrawRideBid = (rideId) => callRpc('rider_withdraw_bid', { p_ride_id: rideId });

/** The ride the rider is currently on (null when none). */
export const fetchActiveRide = () => callRpc('rider_active_ride');

export const rideArrived = (rideId) => callRpc('rider_ride_arrived', { p_ride_id: rideId });
export const startRide = (rideId, otp) => callRpc('rider_start_ride', { p_ride_id: rideId, p_otp: otp });
export const completeRide = (rideId) => callRpc('rider_complete_ride', { p_ride_id: rideId });
export const handBackRide = (rideId, reason = null) => callRpc('rider_cancel_ride', { p_ride_id: rideId, p_reason: reason });

export async function fetchRideHistory(limit = 50) {
  const res = await callRpc('rider_ride_history', { p_limit: limit });
  return { data: Array.isArray(res.data) ? res.data : [] };
}
