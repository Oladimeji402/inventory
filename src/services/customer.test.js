import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('customer service', () => {
  let rpc, from, customer;
  const chain = (result) => {
    const q = { select: vi.fn(() => q), order: vi.fn(() => q), insert: vi.fn(() => Promise.resolve(result)), update: vi.fn(() => q), delete: vi.fn(() => q), eq: vi.fn(() => Promise.resolve(result)), then: (res) => Promise.resolve(result).then(res) };
    return q;
  };

  beforeEach(async () => {
    vi.resetModules();
    rpc = vi.fn();
    from = vi.fn();
    vi.doMock('../lib/supabase', () => ({ isSupabaseConfigured: true, supabase: { rpc, from } }));
    customer = await import('./customer');
  });

  it('loads orders and a single order through the account-scoped functions', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'o1' }], error: null });
    expect((await customer.fetchMyOrders(10)).data).toEqual([{ id: 'o1' }]);
    expect(rpc).toHaveBeenLastCalledWith('my_orders', { p_limit: 10 });
    await customer.fetchMyOrder('o1');
    expect(rpc).toHaveBeenLastCalledWith('my_order', { p_order_id: 'o1' });
  });

  it('rejects with the real error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Order not found' } });
    await expect(customer.fetchMyOrder('x')).rejects.toThrow('Order not found');
  });

  it('creates an address for the signed-in user and trims input', async () => {
    const q = chain({ error: null });
    from.mockReturnValue(q);
    await customer.saveAddress('u1', { label: ' Office ', address: ' 5 Allen Avenue ', city: '', is_default: true });
    expect(from).toHaveBeenCalledWith('customer_addresses');
    expect(q.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', label: 'Office', address: '5 Allen Avenue', city: null, is_default: true }));
  });

  it('surfaces database errors when saving an address', async () => {
    from.mockReturnValue(chain({ error: { message: 'You can save up to 10 addresses' } }));
    await expect(customer.saveAddress('u1', { address: '5 Allen Avenue' })).rejects.toThrow(/up to 10/);
  });

  it('refuses to run without a backend', async () => {
    vi.resetModules();
    vi.doMock('../lib/supabase', () => ({ isSupabaseConfigured: false, supabase: null }));
    const c = await import('./customer');
    await expect(c.fetchMyOrders()).rejects.toThrow(/not available/i);
  });
});
