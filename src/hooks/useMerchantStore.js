import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { timeAgo } from '../lib/formatMoney';

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || 'General Retail',
    price: Number(row.price) || 0,
    cost: Number(row.cost) || 0,
    stock: Number(row.stock) || 0,
    lowStockThreshold: Number.isFinite(Number(row.low_stock_threshold)) ? Number(row.low_stock_threshold) : 5,
    imageUrl: row.image_url || '',
    barcode: row.barcode || '',
    isActive: row.is_active !== false,
    createdAt: row.created_at
  };
}

function mapOrderItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: Number(row.quantity) || 0,
    unitPrice: Number(row.unit_price) || 0,
    lineTotal: Number(row.line_total) || 0,
    legacy: false
  };
}

/** Legacy orders created before order_items existed only have a free-text summary. */
function legacyLineFromSummary(summary) {
  if (!summary) return [];
  return [{ id: 'legacy', productName: summary, quantity: null, unitPrice: null, lineTotal: null, legacy: true }];
}

export function mapOrder(row) {
  const items = Array.isArray(row.order_items) && row.order_items.length > 0
    ? row.order_items.map(mapOrderItem)
    : legacyLineFromSummary(row.items_summary);

  return {
    id: row.id,
    customerId: row.customer_id || null,
    customerName: row.customer_name || 'Customer',
    address: row.address || '',
    itemsSummary: row.items_summary || '',
    lineItems: items,
    total: Number(row.total) || 0,
    status: row.status || 'pending',
    timeAgo: timeAgo(row.created_at),
    createdAt: row.created_at,
    courierInfo: row.courier_name
      ? {
          courierName: row.courier_name,
          courierPhone: row.courier_phone || '',
          etaMinutes: row.eta_minutes,
          otp: row.delivery_otp || ''
        }
      : null
  };
}

function mapCustomer(row) {
  return {
    id: row.id,
    fullName: row.full_name || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    notes: row.notes || '',
    createdAt: row.created_at
  };
}

function mapEmployee(row) {
  return {
    id: row.id,
    fullName: row.full_name || '',
    employeeType: row.employee_type,
    tillRole: row.till_role || 'Sales Representative',
    isActive: row.is_active !== false,
    lockedUntil: row.pin_locked_until || null,
    createdAt: row.created_at
  };
}


function mapPayout(row) {
  if (!row) {
    return { bankName: '', accountNumber: '', accountName: '' };
  }
  return {
    bankName: row.bank_name || '',
    accountNumber: row.account_number || '',
    accountName: row.account_name || ''
  };
}

export function tenantToStoreProfile(tenant, payout) {
  if (!tenant) {
    return {
      name: '',
      slug: '',
      category: 'General Retail',
      address: '',
      whatsapp: '',
      bankName: '',
      accountNumber: '',
      accountName: '',
      hasPhysicalStore: true
    };
  }
  return {
    name: tenant.trading_name || '',
    slug: tenant.slug || '',
    category: tenant.category || 'General Retail',
    address: tenant.address || '',
    whatsapp: tenant.contact_phone || '',
    bankName: payout?.bankName || '',
    accountNumber: payout?.accountNumber || '',
    accountName: payout?.accountName || '',
    hasPhysicalStore: tenant.has_physical_store ?? true
  };
}

export function useMerchantStore(tenant, { onTenantUpdated } = {}) {
  const tenantId = tenant?.id || null;
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payout, setPayout] = useState({ bankName: '', accountNumber: '', accountName: '' });
  const [loading, setLoading] = useState(Boolean(tenantId));
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !tenantId) {
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      setEmployees([]);
      setPayout({ bankName: '', accountNumber: '', accountName: '' });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [productRes, orderRes, customerRes, employeeRes, payoutRes] = await Promise.all([
      supabase
        .from('catalog_products')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('store_orders')
        .select('*, order_items(*)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('employees')
        .select('id, tenant_id, full_name, employee_type, till_role, is_active, failed_pin_attempts, pin_locked_until, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('merchant_payout_accounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()
    ]);

    if (productRes.error || orderRes.error || customerRes.error || employeeRes.error || payoutRes.error) {
      setError(
        productRes.error?.message
        || orderRes.error?.message
        || customerRes.error?.message
        || employeeRes.error?.message
        || payoutRes.error?.message
      );
      setLoading(false);
      return;
    }

    setProducts((productRes.data || []).map(mapProduct));
    setOrders((orderRes.data || []).map(mapOrder));
    setCustomers((customerRes.data || []).map(mapCustomer));
    setEmployees((employeeRes.data || []).map(mapEmployee));
    setPayout(mapPayout(payoutRes.data));
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  // New/updated storefront orders show up live — no manual refresh needed.
  useEffect(() => {
    if (!isSupabaseConfigured || !tenantId) return undefined;

    const channel = supabase
      .channel(`store_orders:${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_orders', filter: `tenant_id=eq.${tenantId}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, load]);

  const saveProduct = useCallback(async (payload) => {
    if (!isSupabaseConfigured || !tenantId) {
      return { error: 'Store is not connected.' };
    }

    const row = {
      tenant_id: tenantId,
      name: String(payload.name || '').trim(),
      category: payload.category || 'General Retail',
      price: Number(payload.price) || 0,
      cost: Number(payload.cost) || 0,
      stock: Math.max(0, parseInt(payload.stock, 10) || 0),
      low_stock_threshold: Math.max(0, parseInt(payload.lowStockThreshold, 10) || 0),
      image_url: payload.imageUrl ? String(payload.imageUrl).trim() : null,
      barcode: String(payload.barcode || payload.sku || '').trim() || null,
      is_active: payload.isActive !== false
    };

    if (!row.name) return { error: 'Enter a product name.' };

    const query = payload.id
      ? supabase.from('catalog_products').update(row).eq('id', payload.id).eq('tenant_id', tenantId).select('*').single()
      : supabase.from('catalog_products').insert(row).select('*').single();

    const { data, error: saveError } = await query;
    if (saveError) return { error: saveError.message };
    const mapped = mapProduct(data);
    setProducts((current) => {
      const rest = current.filter((item) => item.id !== mapped.id);
      return [mapped, ...rest];
    });
    return { data: mapped };
  }, [tenantId]);

  const deleteProduct = useCallback(async (id) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    const { error: deleteError } = await supabase
      .from('catalog_products')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (deleteError) return { error: deleteError.message };
    setProducts((current) => current.filter((item) => item.id !== id));
    return { ok: true };
  }, [tenantId]);

  const setProductActive = useCallback(async (id, isActive) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    const { data, error: updateError } = await supabase
      .from('catalog_products')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();
    if (updateError) return { error: updateError.message };
    const mapped = mapProduct(data);
    setProducts((current) => current.map((item) => (item.id === id ? mapped : item)));
    return { data: mapped };
  }, [tenantId]);

  const uploadProductImage = useCallback(async (file) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    if (!file) return { error: 'Choose a photo to upload.' };

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${tenantId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadError) return { error: uploadError.message };

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return { data: { url: data.publicUrl } };
  }, [tenantId]);

  const saveCustomer = useCallback(async (payload) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };

    const row = {
      tenant_id: tenantId,
      full_name: String(payload.fullName || '').trim(),
      phone: String(payload.phone || '').trim() || null,
      email: String(payload.email || '').trim() || null,
      address: String(payload.address || '').trim() || null,
      notes: String(payload.notes || '').trim() || null
    };

    if (!row.full_name) return { error: 'Enter the customer\'s name.' };

    const query = payload.id
      ? supabase.from('customers').update(row).eq('id', payload.id).eq('tenant_id', tenantId).select('*').single()
      : supabase.from('customers').insert(row).select('*').single();

    const { data, error: saveError } = await query;
    if (saveError) {
      if (saveError.code === '23505') return { error: 'A customer with that phone number already exists.' };
      return { error: saveError.message };
    }
    const mapped = mapCustomer(data);
    setCustomers((current) => {
      const rest = current.filter((item) => item.id !== mapped.id);
      return [mapped, ...rest];
    });
    return { data: mapped };
  }, [tenantId]);

  const deleteCustomer = useCallback(async (id) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (deleteError) return { error: deleteError.message };
    setCustomers((current) => current.filter((item) => item.id !== id));
    return { ok: true };
  }, [tenantId]);

  const updateOrderStatus = useCallback(async (orderId, status) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    const { data, error: updateError } = await supabase
      .from('store_orders')
      .update({ status })
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .select('*, order_items(*)')
      .single();
    if (updateError) return { error: updateError.message };
    const mapped = mapOrder(data);
    setOrders((current) => current.map((item) => (item.id === orderId ? mapped : item)));
    return { data: mapped };
  }, [tenantId]);

  const addEmployee = useCallback(async ({ fullName, employeeType, pin, tillRole }) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    const { data, error: rpcError } = await supabase.rpc('add_employee', {
      p_full_name: fullName,
      p_employee_type: employeeType,
      p_pin: pin,
      p_till_role: tillRole || 'Sales Representative'
    });
    if (rpcError) return { error: rpcError.message };
    const mapped = mapEmployee(data);
    setEmployees((current) => [mapped, ...current]);
    return { data: mapped };
  }, [tenantId]);

  const resetEmployeePin = useCallback(async (employeeId, newPin) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    const { error: rpcError } = await supabase.rpc('reset_employee_pin', {
      p_employee_id: employeeId,
      p_new_pin: newPin
    });
    if (rpcError) return { error: rpcError.message };
    setEmployees((current) => current.map((item) => (
      item.id === employeeId ? { ...item, lockedUntil: null } : item
    )));
    return { ok: true };
  }, [tenantId]);

  const setEmployeeActive = useCallback(async (employeeId, isActive) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    const { error: rpcError } = await supabase.rpc('set_employee_active', {
      p_employee_id: employeeId,
      p_is_active: isActive
    });
    if (rpcError) return { error: rpcError.message };
    setEmployees((current) => current.map((item) => (
      item.id === employeeId ? { ...item, isActive, lockedUntil: null } : item
    )));
    return { ok: true };
  }, [tenantId]);

  const removeEmployee = useCallback(async (employeeId) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    const { error: rpcError } = await supabase.rpc('remove_employee', { p_employee_id: employeeId });
    if (rpcError) return { error: rpcError.message };
    setEmployees((current) => current.filter((item) => item.id !== employeeId));
    return { ok: true };
  }, [tenantId]);

  const saveSettings = useCallback(async (form) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    const { data, error: rpcError } = await supabase.rpc('update_merchant_store', {
      p_trading_name: form.name,
      p_category: form.category,
      p_slug: form.slug,
      p_address: form.address,
      p_contact_phone: form.whatsapp,
      p_has_physical_store: form.hasPhysicalStore,
      p_bank_name: form.bankName,
      p_account_number: form.accountNumber,
      p_account_name: form.accountName
    });
    if (rpcError) return { error: rpcError.message };
    setPayout({
      bankName: form.bankName || '',
      accountNumber: form.accountNumber || '',
      accountName: form.accountName || ''
    });
    if (onTenantUpdated) await onTenantUpdated();
    return { data };
  }, [tenantId, onTenantUpdated]);

  const storeProfile = useMemo(
    () => tenantToStoreProfile(tenant, payout),
    [tenant, payout]
  );

  return {
    storeProfile,
    products,
    orders,
    customers,
    employees,
    payout,
    loading,
    error,
    reload: load,
    saveProduct,
    deleteProduct,
    setProductActive,
    uploadProductImage,
    saveCustomer,
    deleteCustomer,
    addEmployee,
    resetEmployeePin,
    setEmployeeActive,
    removeEmployee,
    updateOrderStatus,
    saveSettings
  };
}
