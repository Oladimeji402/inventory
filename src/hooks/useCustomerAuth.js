import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { authCallbackUrl } from '../config/surfaces';
import { shopPath } from '../surfaces/shop/shopRouter';
import { listAddresses } from '../services/customer';

const CONFIG_ERROR = 'Shopping accounts are not available right now.';

async function loadAccount(userId) {
  const [{ data: profile }, { data: rider }, addresses] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('riders').select('id, kyc_status, onboarding_status, suspended_at').eq('user_id', userId).maybeSingle(),
    listAddresses().catch(() => [])
  ]);
  return { profile: profile || null, rider: rider || null, addresses };
}

/** One Supabase account can be a shopper and a rider; `rider` tells the UI whether to offer the switch. */
export function useCustomerAuth() {
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState({ profile: null, rider: null, addresses: [] });
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const hydrate = useCallback(async (next) => {
    setSession(next);
    if (!next?.user) {
      setAccount({ profile: null, rider: null, addresses: [] });
      setLoading(false);
      return;
    }
    try {
      setAccount(await loadAccount(next.user.id));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    supabase.auth.getSession().then(({ data }) => hydrate(data?.session || null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'TOKEN_REFRESHED') return setSession(next);
      hydrate(next);
    });
    return () => listener?.subscription?.unsubscribe();
  }, [hydrate]);

  const refresh = useCallback(async () => {
    if (session?.user) setAccount(await loadAccount(session.user.id));
  }, [session]);

  const signIn = useCallback(async ({ email, password }) => {
    if (!isSupabaseConfigured) return { error: CONFIG_ERROR };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { error: error.message } : { ok: true };
  }, []);

  const signUp = useCallback(async ({ fullName, email, phone, password }) => {
    if (!isSupabaseConfigured) return { error: CONFIG_ERROR };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: authCallbackUrl(shopPath('/login')),
        data: { full_name: fullName.trim(), phone: phone.trim() }
      }
    });
    if (error) return { error: error.message };
    return { ok: true, needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
  }, []);

  return {
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user || null,
    ...account,
    signIn,
    signUp,
    signOut,
    refresh
  };
}
