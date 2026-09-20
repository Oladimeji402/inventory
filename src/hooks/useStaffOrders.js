import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { mapOrder } from './useMerchantStore';

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
    if (!silent) setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('staff_online_orders', { p_token: token });
    if (rpcError) {
      if (!silent) setError(rpcError.message);
      if (!silent) setLoading(false);
      return;
    }
    setOrders((data || []).map(mapOrder));
    if (!silent) setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // No live push channel for anon staff sessions (Realtime enforces the same
  // RLS as a query, and there's no auth.uid() to pass it) — poll instead so
  // new orders still show up without a manual refresh.
  useEffect(() => {
    if (!isSupabaseConfigured || !token) return undefined;
    const id = window.setInterval(() => load(true), 15000);
    return () => window.clearInterval(id);
  }, [token, load]);

  const updateOrderStatus = useCallback(async (orderId, status) => {
    if (!isSupabaseConfigured || !token) return { error: 'Not signed in.' };
    const { data, error: rpcError } = await supabase.rpc('staff_update_order_status', {
      p_token: token,
      p_order_id: orderId,
      p_status: status
    });
    if (rpcError) return { error: rpcError.message };
    const mapped = mapOrder(data);
    setOrders((current) => current.map((item) => (item.id === orderId ? mapped : item)));
    return { data: mapped };
  }, [token]);

  return { orders, loading, error, reload: load, updateOrderStatus };
}
