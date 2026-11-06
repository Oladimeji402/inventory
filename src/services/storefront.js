import { isSupabaseConfigured, supabase } from '../lib/supabase';

export async function fetchStorefrontStore(slug) {
  if (!isSupabaseConfigured || !slug) return null;
  try {
    const { data, error } = await supabase.rpc('get_storefront_store', {
      p_slug: String(slug).trim().toLowerCase()
    });
    if (error) {
      console.warn('Error fetching store profile:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Network error fetching store profile:', err);
    return null;
  }
}

export async function fetchStorefrontCatalog(slug) {
  if (!isSupabaseConfigured || !slug) return [];
  try {
    const { data, error } = await supabase.rpc('get_storefront_catalog', {
      p_slug: String(slug).trim().toLowerCase()
    });
    if (error) {
      console.warn('Error fetching store catalog:', error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Network error fetching store catalog:', err);
    return [];
  }
}

export async function submitStorefrontOrder(slug, orderData) {
  if (!isSupabaseConfigured || !slug) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase.rpc('submit_storefront_order', {
    p_slug: String(slug).trim().toLowerCase(),
    p_order: orderData
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Asks the verify-paystack-payment edge function to confirm the transaction with
 * Paystack and mark the order paid. The browser never decides that an order is paid.
 */
export async function verifyStorefrontPayment(orderId, reference) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('verify-paystack-payment', {
    body: { orderId, reference }
  });
  if (error) throw new Error(error.message);
  if (!data?.paid) throw new Error(data?.error || 'Payment could not be confirmed.');
  return data;
}

/** Frees the stock reserved by an order whose payment was abandoned. */
export async function releaseUnpaidOrder(orderId) {
  if (!isSupabaseConfigured || !orderId) return false;
  const { data, error } = await supabase.rpc('release_unpaid_order', { p_order_id: orderId });
  if (error) {
    console.warn('Could not release unpaid order:', error.message);
    return false;
  }
  return Boolean(data);
}

export async function fetchMarketplaceStores(corridor = null) {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.rpc('get_active_marketplace_stores', {
      p_corridor: corridor && corridor !== 'All' ? corridor : null
    });
    if (error) {
      console.warn('Error fetching marketplace stores:', error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Network error fetching marketplace stores:', err);
    return [];
  }
}
