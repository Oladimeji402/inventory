import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { authCallbackUrl } from '../config/surfaces';

const CONFIG_ERROR =
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.';

async function loadMembership(userId) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const { data: membership, error: memberError } = await supabase
    .from('tenant_members')
    .select('role, tenant_id, tenants (*)')
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError) throw memberError;

  return {
    profile,
    tenant: membership?.tenants || null,
    membershipRole: membership?.role || null
  };
}

export function useMerchantAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [membershipRole, setMembershipRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membershipReady, setMembershipReady] = useState(false);
  const [error, setError] = useState(null);

  const hydrate = useCallback(async (nextSession) => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setProfile(null);
      setTenant(null);
      setMembershipRole(null);
      setMembershipReady(true);
      setLoading(false);
      return;
    }

    if (!nextSession?.user) {
      setSession(null);
      setProfile(null);
      setTenant(null);
      setMembershipRole(null);
      setMembershipReady(true);
      setLoading(false);
      return;
    }

    setSession(nextSession);
    setMembershipReady(false);
    setLoading(true);

    try {
      const data = await loadMembership(nextSession.user.id);
      setProfile(data.profile);
      setTenant(data.tenant);
      setMembershipRole(data.membershipRole);
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not load your store account.');
    } finally {
      setMembershipReady(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setMembershipReady(true);
      return undefined;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession);
        return;
      }
      hydrate(nextSession);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [hydrate]);

  const refreshTenant = useCallback(async () => {
    if (!session?.user) return;
    const data = await loadMembership(session.user.id);
    setProfile(data.profile);
    setTenant(data.tenant);
    setMembershipRole(data.membershipRole);
  }, [session]);

  const signUp = useCallback(async ({ fullName, email, phone, password }) => {
    if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: authCallbackUrl('/login'),
        data: {
          full_name: fullName.trim(),
          phone: phone.trim()
        }
      }
    });

    if (signUpError) return { error: signUpError.message };
    return { data, needsEmailConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) return { error: signInError.message };
    return { data };
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authCallbackUrl('/login')
    });

    if (resetError) return { error: resetError.message };
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  const checkSlug = useCallback(async (slug) => {
    if (!isSupabaseConfigured) return { available: true };
    const { data, error: rpcError } = await supabase.rpc('is_slug_available', { p_slug: slug });
    if (rpcError) return { available: false, error: rpcError.message };
    return { available: Boolean(data) };
  }, []);

  const completeOnboarding = useCallback(async (payload) => {
    if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

    const { data, error: rpcError } = await supabase.rpc('provision_merchant_tenant', {
      p_trading_name: payload.tradingName,
      p_legal_name: payload.legalName,
      p_entity_type: payload.entityType,
      p_cac_number: payload.cacNumber,
      p_tin: payload.tin,
      p_category: payload.category,
      p_slug: payload.slug,
      p_state: payload.state,
      p_city: payload.city,
      p_address: payload.address,
      p_has_physical_store: payload.hasPhysicalStore,
      p_business_description: payload.businessDescription,
      p_website_or_social: payload.websiteOrSocial,
      p_bank_name: payload.bankName,
      p_account_number: payload.accountNumber,
      p_account_name: payload.accountName
    });

    if (rpcError) return { error: rpcError.message };
    await refreshTenant();
    return { data };
  }, [refreshTenant]);

  return {
    configured: isSupabaseConfigured,
    session,
    user: session?.user || null,
    profile,
    tenant,
    membershipRole,
    loading,
    error,
    membershipReady,
    needsOnboarding: Boolean(
      session && membershipReady && (!tenant || tenant.onboarding_status !== 'complete')
    ),
    signUp,
    signIn,
    requestPasswordReset,
    signOut,
    checkSlug,
    completeOnboarding,
    refreshTenant
  };
}
