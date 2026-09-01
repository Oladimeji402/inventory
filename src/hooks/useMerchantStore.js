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
    barcode: row.barcode || '',
    isActive: row.is_active !== false,
    createdAt: row.created_at
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    customerName: row.customer_name || 'Customer',
    address: row.address || '',
    itemsSummary: row.items_summary || '',
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
  const [payout, setPayout] = useState({ bankName: '', accountNumber: '', accountName: '' });
  const [loading, setLoading] = useState(Boolean(tenantId));
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !tenantId) {
      setProducts([]);
      setOrders([]);
      setPayout({ bankName: '', accountNumber: '', accountName: '' });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [productRes, orderRes, payoutRes] = await Promise.all([
      supabase
        .from('catalog_products')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('store_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('merchant_payout_accounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()
    ]);

    if (productRes.error || orderRes.error || payoutRes.error) {
      setError(productRes.error?.message || orderRes.error?.message || payoutRes.error?.message);
      setLoading(false);
      return;
    }

    setProducts((productRes.data || []).map(mapProduct));
    setOrders((orderRes.data || []).map(mapOrder));
    setPayout(mapPayout(payoutRes.data));
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const updateOrderStatus = useCallback(async (orderId, status) => {
    if (!isSupabaseConfigured || !tenantId) return { error: 'Store is not connected.' };
    const { data, error: updateError } = await supabase
      .from('store_orders')
      .update({ status })
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();
    if (updateError) return { error: updateError.message };
    const mapped = mapOrder(data);
    setOrders((current) => current.map((item) => (item.id === orderId ? mapped : item)));
    return { data: mapped };
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
    payout,
    loading,
    error,
    reload: load,
    saveProduct,
    deleteProduct,
    setProductActive,
    updateOrderStatus,
    saveSettings
  };
}
