import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('merchant API (configured backend)', () => {
  let rpc;
  let from;
  let merchant;
  let chain;

  beforeEach(async () => {
    vi.resetModules();
    rpc = vi.fn();
    chain = {
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      select: vi.fn(() => chain),
      single: vi.fn(async () => ({ data: { id: 'p1' }, error: null }))
    };
    from = vi.fn(() => chain);
    vi.doMock('../lib/supabase', () => ({
      isSupabaseConfigured: true,
      supabase: { rpc, from, storage: { from: vi.fn() }, channel: vi.fn(), removeChannel: vi.fn() }
    }));
    merchant = await import('./merchant');
  });

  it.each([
    ['fetchOverview', [30], 'merchant_overview'],
    ['fetchAnalytics', [7], 'merchant_analytics'],
    ['fetchOrders', [{ view: 'new' }], 'merchant_list_orders'],
    ['fetchOrder', ['o1'], 'merchant_get_order'],
    ['updateOrderStatus', ['o1', 'delivered'], 'merchant_update_order_status'],
    ['markOrderReady', ['o1'], 'merchant_mark_order_ready'],
    ['markOrderPaid', ['o1'], 'merchant_mark_order_paid'],
    ['cancelOrder', ['o1', 'no stock', true], 'merchant_cancel_order'],
    ['fetchProducts', [{ view: 'low' }], 'merchant_list_products'],
    ['fetchCustomers', [{ search: 'ada' }], 'merchant_list_customers'],
    ['fetchEmployees', [], 'merchant_list_employees'],
    ['addEmployee', [{ fullName: 'Ada', employeeType: 'counter', pin: '1234' }], 'add_employee'],
    ['resetEmployeePin', ['e1', '4321'], 'reset_employee_pin'],
    ['setEmployeeActive', ['e1', false], 'set_employee_active'],
    ['removeEmployee', ['e1'], 'remove_employee'],
    ['fetchStore', [], 'merchant_get_store'],
    ['updateStoreProfile', [{ tradingName: 'Apex' }], 'merchant_update_store_profile'],
    ['fetchPayouts', [], 'merchant_get_payouts'],
    ['savePayoutAccount', [{ bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Apex' }], 'merchant_save_payout_account']
  ])('%s rejects with the real error and never returns fake data', async (fn, args, rpcName) => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Only the store owner or an admin can do this' } });
    await expect(merchant[fn](...args)).rejects.toThrow('Only the store owner or an admin can do this');
    expect(rpc.mock.calls[0][0]).toBe(rpcName);
  });

  it('passes order filters through to the database function', async () => {
    rpc.mockResolvedValue({ data: { rows: [], total: 0, counts: {} }, error: null });
    await merchant.fetchOrders({ view: 'awaiting_payment', search: 'ORD-1', channel: 'online', limit: 10, offset: 20 });
    expect(rpc).toHaveBeenCalledWith('merchant_list_orders', {
      p_view: 'awaiting_payment', p_search: 'ORD-1', p_channel: 'online', p_limit: 10, p_offset: 20
    });
  });

  it('cancels with the refund flag the owner ticked', async () => {
    rpc.mockResolvedValue({ data: { id: 'o1' }, error: null });
    await merchant.cancelOrder('o1', 'Out of stock', true);
    expect(rpc).toHaveBeenCalledWith('merchant_cancel_order', { p_order_id: 'o1', p_reason: 'Out of stock', p_refunded: true });
  });

  it('adjusts stock atomically by a delta and rejects a short password', async () => {
    rpc.mockResolvedValue({ data: { id: 'p1', stock: 9 }, error: null });
    await merchant.adjustStock('p1', -3);
    expect(rpc).toHaveBeenCalledWith('merchant_adjust_stock', { p_product_id: 'p1', p_delta: -3 });
    await expect(merchant.changePassword('short')).rejects.toThrow('8 characters');
  });

  it('pages through every order for an export and says when it was cut off', async () => {
    const row = (i) => ({ id: `o${i}` });
    rpc
      .mockResolvedValueOnce({ data: { rows: Array.from({ length: 100 }, (_, i) => row(i)), total: 250 }, error: null })
      .mockResolvedValueOnce({ data: { rows: Array.from({ length: 100 }, (_, i) => row(i + 100)), total: 250 }, error: null });
    const result = await merchant.fetchAllOrders({ view: 'all' }, 200);
    expect(result.rows).toHaveLength(200);
    expect(result.truncated).toBe(true);
  });

  it('validates a product before touching the database', async () => {
    await expect(merchant.saveProduct('t1', { name: '  ', price: 100 })).rejects.toThrow('Enter a product name.');
    await expect(merchant.saveProduct('t1', { name: 'Milk', price: 0 })).rejects.toThrow('selling price');
    expect(from).not.toHaveBeenCalled();
  });

  it('inserts a new product scoped to the tenant and updates an existing one', async () => {
    await merchant.saveProduct('t1', { name: ' Milk ', price: '1800', cost: '1500', stock: '4', lowStockThreshold: '2', barcode: ' 123 ' });
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 't1', name: 'Milk', price: 1800, cost: 1500, stock: 4, low_stock_threshold: 2, barcode: '123', is_active: true
    }));
    await merchant.saveProduct('t1', { id: 'p9', name: 'Milk', price: 1 });
    expect(chain.update).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('tenant_id', 't1');
  });

  it('surfaces a database error from a product write', async () => {
    chain.single.mockResolvedValueOnce({ data: null, error: { message: 'new row violates row-level security policy' } });
    await expect(merchant.saveProduct('t1', { name: 'Milk', price: 10 })).rejects.toThrow('row-level security');
  });

  it('rejects non-image and oversized uploads before uploading', async () => {
    await expect(merchant.uploadProductImage('t1', new File(['x'], 'a.pdf', { type: 'application/pdf' }))).rejects.toThrow('not an image');
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await expect(merchant.uploadProductImage('t1', big)).rejects.toThrow('5 MB');
  });

  it('imports in chunks and merges per-row errors with the right row numbers', async () => {
    const rows = Array.from({ length: merchant.IMPORT_CHUNK + 5 }, (_, i) => ({ name: `P${i}`, price: 1, stock: 1, cost: 0, category: 'x', id: `S${i}` }));
    rpc
      .mockResolvedValueOnce({ data: { created: merchant.IMPORT_CHUNK - 1, updated: 0, errors: [{ row: 3, message: 'Invalid price' }] }, error: null })
      .mockResolvedValueOnce({ data: { created: 4, updated: 1, errors: [{ row: 2, message: 'Invalid stock' }] }, error: null });
    const progress = vi.fn();
    const result = await merchant.importProducts(rows, progress);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(result.created).toBe(merchant.IMPORT_CHUNK + 3);
    expect(result.updated).toBe(1);
    expect(result.errors).toEqual([
      { row: 3, message: 'Invalid price' },
      { row: merchant.IMPORT_CHUNK + 2, message: 'Invalid stock' }
    ]);
    expect(progress).toHaveBeenLastCalledWith(rows.length, rows.length);
    expect(rpc.mock.calls[0][1].p_rows[0]).toMatchObject({ barcode: 'S0', name: 'P0' });
  });
});

describe('merchant API (backend not configured)', () => {
  it('rejects instead of pretending an action worked', async () => {
    vi.resetModules();
    vi.doMock('../lib/supabase', () => ({ isSupabaseConfigured: false, supabase: null }));
    const merchant = await import('./merchant');
    await expect(merchant.markOrderPaid('o1')).rejects.toThrow('not configured');
    await expect(merchant.saveProduct('t1', { name: 'x', price: 1 })).rejects.toThrow('not configured');
  });
});
