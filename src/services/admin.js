import { isSupabaseConfigured, supabase } from '../lib/supabase';

/**
 * Platform-admin API. Every call either returns real data or rejects with the real
 * error — there is no mock data and no silent fallback. Each underlying database
 * function re-checks that the caller is a platform admin.
 */

export const RIDER_DOCUMENT_BUCKET = 'rider-documents';

function requireBackend() {
  if (!isSupabaseConfigured) throw new Error('Admin services are not configured.');
}

async function rpc(name, args) {
  requireBackend();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

export function computeStoreAge(createdAt) {
  if (!createdAt) return 'Unknown';
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor(Math.max(0, now - created) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Created today';
  if (diffDays === 1) return '1 day old';
  if (diffDays < 30) return `${diffDays} days old`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} old`;

  return `${(diffDays / 365).toFixed(1)} years old`;
}

export function formatRegistrationDate(createdAt) {
  if (!createdAt) return 'N/A';
  try {
    return new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return createdAt;
  }
}

// ── Session ────────────────────────────────────────────────────────────────
export async function isPlatformAdmin() {
  if (!isSupabaseConfigured) return false;
  const { data, error } = await supabase.rpc('is_platform_admin');
  return !error && data === true;
}

// ── Overview ───────────────────────────────────────────────────────────────
export const fetchPlatformMetrics = async () => ({ data: await rpc('admin_get_platform_metrics') });
export const fetchTrends = async (days = 14) => ({ data: await rpc('admin_get_trends', { p_days: days }) });

export async function fetchCorridors() {
  const data = await rpc('admin_get_corridors');
  return { data: { corridors: data?.corridors || [], plans: data?.plans || [] } };
}

// ── Stores ─────────────────────────────────────────────────────────────────
export const fetchStores = async () => ({ data: await rpc('admin_list_stores') });
export const fetchStore = async (tenantId) => ({ data: await rpc('admin_get_store', { p_tenant_id: tenantId }) });

export async function updateTenantStatus(tenantId, newStatus) {
  return { data: await rpc('admin_set_tenant_status', { p_tenant_id: tenantId, p_status: newStatus }) };
}

// ── Riders ─────────────────────────────────────────────────────────────────
export const fetchRiders = async () => ({ data: await rpc('admin_list_riders') });
export const fetchRider = async (riderId) => ({ data: await rpc('admin_get_rider', { p_rider_id: riderId }) });

/** status: 'approved' | 'rejected'. A rejection needs a reason for the rider. */
export async function reviewRiderDocument(documentId, status, notes = '') {
  return {
    data: await rpc('admin_review_rider_document', { p_document_id: documentId, p_status: status, p_notes: notes })
  };
}

/** status: 'verified' | 'rejected' */
export async function reviewRiderKyc(submissionId, status, notes = '') {
  return {
    data: await rpc('admin_review_rider_kyc', { p_submission_id: submissionId, p_status: status, p_notes: notes })
  };
}

export async function setRiderSuspended(riderId, suspended, reason = '') {
  return {
    data: await rpc('admin_set_rider_suspended', { p_rider_id: riderId, p_suspended: suspended, p_reason: reason })
  };
}

/** Short-lived signed link to a private rider document. */
export async function getRiderDocumentUrl(path, seconds = 300) {
  requireBackend();
  const { data, error } = await supabase.storage.from(RIDER_DOCUMENT_BUCKET).createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// ── Orders ─────────────────────────────────────────────────────────────────
export const fetchPlatformOrders = async (limit = 200) => ({ data: await rpc('admin_list_orders', { p_limit: limit }) });
export const fetchOrder = async (orderId) => ({ data: await rpc('admin_get_order', { p_order_id: orderId }) });
export const cancelOrder = async (orderId, reason) => ({
  data: await rpc('admin_cancel_order', { p_order_id: orderId, p_reason: reason })
});
export const markOrderPaid = async (orderId) => ({ data: await rpc('admin_mark_order_paid', { p_order_id: orderId }) });

// ── Payouts ────────────────────────────────────────────────────────────────
export const fetchPayouts = async (status = null) => ({ data: await rpc('admin_list_payouts', { p_status: status }) });

/** status: 'processing' | 'completed' (needs reference) | 'failed' (needs note) */
export async function updatePayout(payoutId, status, { note = '', reference = '' } = {}) {
  return {
    data: await rpc('admin_update_payout', {
      p_payout_id: payoutId,
      p_status: status,
      p_note: note,
      p_reference: reference
    })
  };
}

// ── Staff ──────────────────────────────────────────────────────────────────
function mapEmployee(e) {
  return {
    id: e.id,
    name: e.name,
    role: e.role,
    type: e.type,
    isActive: e.isActive,
    locked: Boolean(e.locked),
    storeId: e.storeId,
    storeName: e.storeName,
    storeSlug: e.storeSlug,
    createdAt: e.createdAt
  };
}

export async function fetchAllEmployees() {
  const data = await rpc('admin_list_employees', { p_tenant_id: null });
  return { data: data.map(mapEmployee) };
}

export async function fetchTenantEmployees(tenantId) {
  const data = await rpc('admin_list_employees', { p_tenant_id: tenantId });
  return { data: data.map(mapEmployee) };
}

export async function resetEmployeePin(employeeId, newPin) {
  await rpc('admin_reset_employee_pin', { p_employee_id: employeeId, p_new_pin: newPin });
  return { data: { success: true, employeeId } };
}

export async function toggleEmployeeActive(employeeId, isActive) {
  await rpc('admin_set_employee_active', { p_employee_id: employeeId, p_is_active: isActive });
  return { data: { success: true, employeeId, isActive } };
}

// ── Admin accounts + audit log ─────────────────────────────────────────────
export const fetchAdmins = async () => ({ data: await rpc('admin_list_admins') });
export const setPlatformAdmin = async (email, isAdmin) => ({
  data: await rpc('admin_set_platform_admin', { p_email: email, p_is_admin: isAdmin })
});
export const fetchAudit = async (limit = 200) => ({ data: await rpc('admin_list_audit', { p_limit: limit }) });

// ── Rides ──────────────────────────────────────────────────────────────────
export const fetchRides = async (limit = 300) => ({ data: await rpc('admin_list_rides', { p_limit: limit }) });
export const fetchRide = async (rideId) => ({ data: await rpc('admin_get_ride', { p_ride_id: rideId }) });
export const cancelRideAsAdmin = async (rideId, reason) => ({
  data: await rpc('admin_cancel_ride', { p_ride_id: rideId, p_reason: reason })
});
