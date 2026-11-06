import { isSupabaseConfigured, supabase } from '../lib/supabase';

/** Customer (shopper) API: order history, tracking, saved addresses, profile. */

function requireBackend() {
  if (!isSupabaseConfigured) throw new Error('Shopping is not available right now. Please try again later.');
}

async function rpc(name, args) {
  requireBackend();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

export const fetchMyOrders = async (limit = 50) => ({ data: (await rpc('my_orders', { p_limit: limit })) || [] });
export const fetchMyOrder = async (orderId) => ({ data: await rpc('my_order', { p_order_id: orderId }) });

export async function listAddresses() {
  requireBackend();
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

/** Creates (no id) or updates (id) an address owned by `userId`. */
export async function saveAddress(userId, address) {
  requireBackend();
  const row = {
    label: address.label?.trim() || 'Home',
    recipient_name: address.recipient_name?.trim() || null,
    phone: address.phone?.trim() || null,
    address: address.address.trim(),
    city: address.city?.trim() || null,
    state: address.state?.trim() || null,
    is_default: Boolean(address.is_default)
  };
  const query = address.id
    ? supabase.from('customer_addresses').update(row).eq('id', address.id)
    : supabase.from('customer_addresses').insert({ ...row, user_id: userId });
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function deleteAddress(id) {
  requireBackend();
  const { error } = await supabase.from('customer_addresses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateMyProfile(userId, { fullName, phone }) {
  requireBackend();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName.trim(), phone: phone?.trim() || null })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}
