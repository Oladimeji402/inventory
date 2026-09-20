import { isSupabaseConfigured, supabase } from './supabase';

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
  return { data };
}
