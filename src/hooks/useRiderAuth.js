import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { authCallbackUrl, riderFullPath } from '../config/surfaces';
import { clearIntendedSlug } from '../lib/intendedSlug';

const CONFIG_ERROR =
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.';

async function loadRiderProfile(userId) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const { data: rider, error: riderError } = await supabase
    .from('riders')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (riderError) throw riderError;

  return { profile, rider: rider || null };
}

export function useRiderAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riderReady, setRiderReady] = useState(false);
  const [error, setError] = useState(null);

  const hydrate = useCallback(async (nextSession) => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setProfile(null);
      setRider(null);
      setRiderReady(true);
      setLoading(false);
      return;
    }

    if (!nextSession?.user) {
      setSession(null);
      setProfile(null);
      setRider(null);
      setRiderReady(true);
      setLoading(false);
      return;
    }

    setSession(nextSession);
    setRiderReady(false);
    setLoading(true);

    try {
      const data = await loadRiderProfile(nextSession.user.id);
      setProfile(data.profile);
      setRider(data.rider);
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not load your rider account.');
    } finally {
      setRiderReady(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setRiderReady(true);
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

  const refreshRider = useCallback(async () => {
    if (!session?.user) return;
    const data = await loadRiderProfile(session.user.id);
    setProfile(data.profile);
    setRider(data.rider);
  }, [session]);

  const signUp = useCallback(async ({ fullName, email, phone, password }) => {
    if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: authCallbackUrl(riderFullPath('/login')),
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
      redirectTo: authCallbackUrl(riderFullPath('/login'))
    });

    if (resetError) return { error: resetError.message };
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  const completeOnboarding = useCallback(async (payload) => {
    if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

    const { data, error: rpcError } = await supabase.rpc('provision_rider', {
      p_date_of_birth: payload.dateOfBirth,
      p_vehicle_type: payload.vehicleType,
      p_vehicle_make_model: payload.vehicleMakeModel,
      p_vehicle_plate_number: payload.vehiclePlateNumber,
      p_drivers_license_number: payload.driversLicenseNumber,
      p_drivers_license_expiry: payload.driversLicenseExpiry || null,
      p_state: payload.state,
      p_city: payload.city,
      p_base_address: payload.baseAddress,
      p_next_of_kin_name: payload.nextOfKinName,
      p_next_of_kin_phone: payload.nextOfKinPhone
    });

    if (rpcError) return { error: rpcError.message };
    clearIntendedSlug();
    await refreshRider();
    return { data };
  }, [refreshRider]);

  return {
    configured: isSupabaseConfigured,
    session,
    user: session?.user || null,
    profile,
    rider,
    loading,
    error,
    riderReady,
    needsOnboarding: Boolean(
      session && riderReady && (!rider || rider.onboarding_status !== 'complete')
    ),
    signUp,
    signIn,
    requestPasswordReset,
    signOut,
    completeOnboarding,
    refreshRider
  };
}
