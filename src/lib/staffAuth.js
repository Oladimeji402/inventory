import { isSupabaseConfigured, supabase } from './supabase';

const TILL_SESSION_KEY = 'subtech.till.active_staff_session';

/**
 * Verifies a name+PIN against the merchant dashboard's `employees` table via
 * the verify_employee_pin RPC. Shared by the merchant/rider staff login
 * (useStaffSession) and the till's counter sign-in (LoginScreen) so both
 * surfaces authenticate the same way against the same source of truth.
 */
export async function verifyStaffPin({ storeSlug, fullName, pin }) {
  if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc('verify_employee_pin', {
    p_slug: String(storeSlug || '').trim(),
    p_full_name: String(fullName || '').trim(),
    p_pin: pin
  });
  if (error) return { error: error.message };
  if (data?.token) {
    setActiveStaffSession(data);
  }
  return { data };
}

export function getActiveStaffSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(TILL_SESSION_KEY) || window.localStorage.getItem(TILL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveStaffSession(session) {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(session);
    window.sessionStorage.setItem(TILL_SESSION_KEY, serialized);
    window.localStorage.setItem(TILL_SESSION_KEY, serialized);
  } catch {
    // storage quota or disabled
  }
}

export function clearActiveStaffSession() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(TILL_SESSION_KEY);
    window.localStorage.removeItem(TILL_SESSION_KEY);
  } catch {
    // storage quota or disabled
  }
}

export async function fetchTillProducts(token) {
  if (!isSupabaseConfigured || !token) return null;
  try {
    const { data, error } = await supabase.rpc('staff_till_catalog', { p_token: token });
    if (error) {
      console.warn('Could not fetch cloud catalog for till:', error.message);
      return null;
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Network error fetching till catalog:', err);
    return null;
  }
}

export async function submitTillCheckout(token, salePayload) {
  if (!isSupabaseConfigured || !token) return null;
  try {
    const { data, error } = await supabase.rpc('staff_till_checkout', {
      p_token: token,
      p_order: salePayload
    });
    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.warn('Error recording till sale to cloud:', err);
    throw err;
  }
}

