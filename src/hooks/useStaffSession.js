import { useCallback, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { verifyStaffPin } from '../lib/staffAuth';

const KEY = 'subtech.merchant.staff_session';

function readStored() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(staff) {
  if (typeof window === 'undefined') return;
  try {
    if (staff) window.sessionStorage.setItem(KEY, JSON.stringify(staff));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // sessionStorage unavailable (private mode, etc.) — session just won't persist across reloads
  }
}

export function useStaffSession() {
  const [staff, setStaff] = useState(readStored);

  const signIn = useCallback(async ({ storeSlug, fullName, pin }) => {
    const result = await verifyStaffPin({ storeSlug, fullName, pin });
    if (result.error) return result;
    writeStored(result.data);
    setStaff(result.data);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    if (staff?.token && isSupabaseConfigured) {
      await supabase.rpc('staff_sign_out', { p_token: staff.token });
    }
    writeStored(null);
    setStaff(null);
  }, [staff]);

  return { staff, signIn, signOut };
}
