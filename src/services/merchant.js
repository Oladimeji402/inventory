import { isSupabaseConfigured, supabase } from '../lib/supabase';

/**
 * Merchant dashboard API. Every call either returns real data from the tenant-scoped
 * database functions in 20261110000000_merchant_console.sql or rejects with the real
 * error. There is no mock data and no fallback that pretends an action worked.
 */

export const PRODUCT_IMAGE_BUCKET = 'product-images';

function requireBackend() {
  if (!isSupabaseConfigured) throw new Error('The store backend is not configured.');
}

async function rpc(name, args) {
  requireBackend();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

// ── Overview + analytics ────────────────────────────────────────────────────
export const fetchOverview = (days = 30) => rpc('merchant_overview', { p_days: days });
export const fetchAnalytics = (days = 30) => rpc('merchant_analytics', { p_days: days });

// ── Orders ──────────────────────────────────────────────────────────────────
export function fetchOrders({ view = 'all', search = '', channel = '', limit = 25, offset = 0 } = {}) {
  return rpc('merchant_list_orders', {
    p_view: view,
    p_search: search || null,
    p_channel: channel || null,
    p_limit: limit,
    p_offset: offset
  });
}
export const fetchOrder = (orderId) => rpc('merchant_get_order', { p_order_id: orderId });
export const updateOrderStatus = (orderId, status) =>
  rpc('merchant_update_order_status', { p_order_id: orderId, p_status: status });
export const markOrderReady = (orderId, ready = true) =>
  rpc('merchant_mark_order_ready', { p_order_id: orderId, p_ready: ready });
export const markOrderPaid = (orderId) => rpc('merchant_mark_order_paid', { p_order_id: orderId });
export const cancelOrder = (orderId, reason, refunded = false) =>
  rpc('merchant_cancel_order', { p_order_id: orderId, p_reason: reason, p_refunded: refunded });

// ── Products ────────────────────────────────────────────────────────────────
export function fetchProducts({ view = 'all', search = '', limit = 25, offset = 0 } = {}) {
  return rpc('merchant_list_products', {
    p_view: view,
    p_search: search || null,
    p_limit: limit,
    p_offset: offset
  });
}

export function productRow(tenantId, payload) {
  return {
    tenant_id: tenantId,
    name: String(payload.name || '').trim(),
    category: String(payload.category || '').trim() || 'General Retail',
    price: Number(payload.price) || 0,
    cost: Number(payload.cost) || 0,
    stock: Math.max(0, parseInt(payload.stock, 10) || 0),
    low_stock_threshold: Math.max(0, parseInt(payload.lowStockThreshold, 10) || 0),
    image_url: payload.imageUrl ? String(payload.imageUrl).trim() : null,
    barcode: String(payload.barcode || '').trim() || null,
    is_active: payload.isActive !== false
  };
}

export async function saveProduct(tenantId, payload) {
  requireBackend();
  if (!tenantId) throw new Error('Your store is not loaded yet.');
  const row = productRow(tenantId, payload);
  if (!row.name) throw new Error('Enter a product name.');
  if (row.price <= 0) throw new Error('Enter a selling price above zero.');

  const query = payload.id
    ? supabase.from('catalog_products').update(row).eq('id', payload.id).eq('tenant_id', tenantId)
    : supabase.from('catalog_products').insert(row);
  const { data, error } = await query.select('id').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setProductActive(tenantId, productId, isActive) {
  requireBackend();
  const { error } = await supabase
    .from('catalog_products')
    .update({ is_active: Boolean(isActive) })
    .eq('id', productId)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
  return { id: productId, isActive: Boolean(isActive) };
}

export const adjustStock = (productId, delta) =>
  rpc('merchant_adjust_stock', { p_product_id: productId, p_delta: delta });

export async function deleteProduct(tenantId, productId) {
  requireBackend();
  const { error } = await supabase.from('catalog_products').delete().eq('id', productId).eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
  return { id: productId };
}

export async function changePassword(password) {
  requireBackend();
  if (String(password || '').length < 8) throw new Error('Use at least 8 characters.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Pages through the orders list (100 at a time, newest first) for a CSV export. */
export async function fetchAllOrders(filters = {}, cap = 2000) {
  const rows = [];
  let total = 0;
  for (let offset = 0; offset < cap; offset += 100) {
    const page = await fetchOrders({ ...filters, limit: 100, offset });
    total = page?.total || 0;
    rows.push(...(page?.rows || []));
    if (rows.length >= total || !(page?.rows || []).length) break;
  }
  return { rows, total, truncated: total > rows.length };
}

export async function fetchAllProducts(filters = {}, cap = 5000) {
  const rows = [];
  let total = 0;
  for (let offset = 0; offset < cap; offset += 100) {
    const page = await fetchProducts({ ...filters, limit: 100, offset });
    total = page?.total || 0;
    rows.push(...(page?.rows || []));
    if (rows.length >= total || !(page?.rows || []).length) break;
  }
  return { rows, total, truncated: total > rows.length };
}

export async function uploadProductImage(tenantId, file) {
  requireBackend();
  if (!file) throw new Error('Choose a photo to upload.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('That file is not an image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Photos must be 5 MB or smaller.');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${tenantId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export const IMPORT_CHUNK = 200;

/** Sends rows to the database in chunks and merges the per-row outcomes. */
export async function importProducts(rows, onProgress) {
  const total = { created: 0, updated: 0, errors: [] };
  for (let start = 0; start < rows.length; start += IMPORT_CHUNK) {
    const chunk = rows.slice(start, start + IMPORT_CHUNK).map((row) => ({
      name: row.name,
      price: row.price,
      cost: row.cost,
      stock: row.stock,
      category: row.category,
      barcode: row.id || row.barcode || null
    }));
    const result = await rpc('merchant_import_products', { p_rows: chunk });
    total.created += result?.created || 0;
    total.updated += result?.updated || 0;
    (result?.errors || []).forEach((item) => {
      total.errors.push({ row: start + item.row, message: item.message });
    });
    if (onProgress) onProgress(Math.min(rows.length, start + IMPORT_CHUNK), rows.length);
  }
  return total;
}

// ── Customers ───────────────────────────────────────────────────────────────
export function fetchCustomers({ search = '', limit = 25, offset = 0 } = {}) {
  return rpc('merchant_list_customers', { p_search: search || null, p_limit: limit, p_offset: offset });
}

// ── Staff ───────────────────────────────────────────────────────────────────
export const fetchEmployees = () => rpc('merchant_list_employees');

export const addEmployee = ({ fullName, employeeType, pin, tillRole }) =>
  rpc('add_employee', {
    p_full_name: fullName,
    p_employee_type: employeeType,
    p_pin: pin,
    p_till_role: tillRole || 'Sales Representative'
  });
export const resetEmployeePin = (employeeId, pin) =>
  rpc('reset_employee_pin', { p_employee_id: employeeId, p_new_pin: pin });
export const setEmployeeActive = (employeeId, isActive) =>
  rpc('set_employee_active', { p_employee_id: employeeId, p_is_active: isActive });
export const removeEmployee = (employeeId) => rpc('remove_employee', { p_employee_id: employeeId });

// ── Store profile + settlement ──────────────────────────────────────────────
export const fetchStore = () => rpc('merchant_get_store');

export function updateStoreProfile(form) {
  return rpc('merchant_update_store_profile', {
    p_trading_name: form.tradingName,
    p_category: form.category,
    p_slug: form.slug,
    p_address: form.address,
    p_contact_phone: form.contactPhone,
    p_has_physical_store: form.hasPhysicalStore,
    p_state: form.state,
    p_city: form.city,
    p_lga: form.lga,
    p_corridor: form.corridor,
    p_business_description: form.businessDescription,
    p_website_or_social: form.websiteOrSocial,
    p_accepting_orders: form.acceptingOrders
  });
}

export const fetchPayouts = () => rpc('merchant_get_payouts');
export const savePayoutAccount = ({ bankName, accountNumber, accountName }) =>
  rpc('merchant_save_payout_account', {
    p_bank_name: bankName,
    p_account_number: accountNumber,
    p_account_name: accountName
  });

// ── Realtime ────────────────────────────────────────────────────────────────
/** Calls onChange whenever an order for this store changes. Returns an unsubscribe fn. */
export function subscribeToOrders(tenantId, onChange) {
  if (!isSupabaseConfigured || !tenantId) return () => {};
  const channel = supabase
    .channel(`merchant_orders:${tenantId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'store_orders', filter: `tenant_id=eq.${tenantId}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
