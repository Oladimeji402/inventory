import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { mapOrder } from './useMerchantStore';

/**
 * Orders for a signed-in PIN employee. Every call goes through a token-checked
 * database function; failures are surfaced, never swallowed.
 */
export function useStaffOrders(token) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!isSupabaseConfigured || !token) {
      setOrders([]);
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
      setError('');
    }
    const { data, error: rpcError } = await supabase.rpc('staff_online_orders', { p_token: token });
    if (rpcError) {
      // A failed background refresh keeps the last good list but still tells the person.
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    setError('');
    setOrders((data || []).map(mapOrder));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime enforces the same RLS as a query and anon staff sessions have no
  // auth.uid(), so there is no push channel for them: poll instead.
  useEffect(() => {
    if (!isSupabaseConfigured || !token) return undefined;
    const id = window.setInterval(() => load(true), 15000);
    return () => window.clearInterval(id);
  }, [token, load]);

  const call = useCallback(async (name, args) => {
    if (!isSupabaseConfigured || !token) return { error: 'Not signed in.' };
    const { data, error: rpcError } = await supabase.rpc(name, { p_token: token, ...args });
    if (rpcError) return { error: rpcError.message };
    await load(true);
    return { data };
  }, [token, load]);

  const updateOrderStatus = useCallback(
    (orderId, status) => call('staff_update_order_status', { p_order_id: orderId, p_status: status }),
    [call]
  );
  const markReady = useCallback(
    (orderId, ready = true) => call('staff_mark_order_ready', { p_order_id: orderId, p_ready: ready }),
    [call]
  );

  return { orders, loading, error, reload: load, updateOrderStatus, markReady };
}
