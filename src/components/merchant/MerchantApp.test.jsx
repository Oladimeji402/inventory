import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => {
  const order = {
    id: 'a1b2c3d4-0000-4000-8000-000000000002', createdAt: '2026-11-05T08:00:00Z', channel: 'online', status: 'pending',
    paymentStatus: 'unpaid', paymentMethod: 'Transfer', fulfillmentType: 'delivery', customerName: 'Tunde Bakare',
    customerPhone: '08033334444', address: '5 Opebi Road', total: 22350, deliveryFee: 850, itemCount: 5, hasRider: false, readyAt: null,
    items: [{ id: 'i1', name: 'Indomie Carton', quantity: 2, unitPrice: 10750, lineTotal: 21500 }], rider: null
  };
  const api = {
    order,
    fetchOverview: vi.fn(async () => ({
      days: 30,
      today: { sales: 58400, orders: 7 },
      period: { sales: 1420500, orders: 212, previousSales: 1180000, previousOrders: 190 },
      series: [{ date: '2026-11-04', sales: 1000, orders: 1 }, { date: '2026-11-05', sales: 2000, orders: 2 }],
      attention: { newOrders: 1, awaitingTransferCount: 1, awaitingTransferAmount: 22350, awaitingCardCount: 0, inTransit: 0, lowStock: 2, outOfStock: 1, lowStockItems: [{ id: 'p2', name: 'Indomie Carton', stock: 3, threshold: 5 }] },
      products: { total: 4, active: 3, outOfStock: 1, lowStock: 2 },
      checklist: { tenantStatus: 'trialing', kycStatus: 'not_started', acceptingOrders: true, hasAddress: true, hasPhone: false, hasCorridor: false, productCount: 4, hasSettlementAccount: false, settlementVerified: false, staffCount: 0, orderCount: 212 }
    })),
    fetchAnalytics: vi.fn(async () => ({})),
    fetchOrders: vi.fn(async () => ({ rows: [order], total: 1, counts: { all: 1, new: 0, awaiting_payment: 1, in_transit: 0, delivered: 0, cancelled: 0 } })),
    fetchOrder: vi.fn(async () => order),
    markOrderPaid: vi.fn(async () => ({ payment_status: 'paid' })),
    cancelOrder: vi.fn(async () => ({})),
    updateOrderStatus: vi.fn(async () => ({})),
    markOrderReady: vi.fn(async () => ({})),
    fetchProducts: vi.fn(async () => ({
      rows: [{ id: 'p2', name: 'Indomie Carton', category: 'Groceries', price: 8500, cost: 0, stock: 3, lowStockThreshold: 5, imageUrl: null, barcode: 'SKU-2', isActive: true, createdAt: '2026-11-01T00:00:00Z' }],
      total: 1, counts: { all: 1, active: 1, inactive: 0, low: 1, out: 0 }
    })),
    adjustStock: vi.fn(async () => ({ id: 'p2', stock: 27 })),
    fetchPayouts: vi.fn(async () => ({
      account: null, tenantStatus: 'trialing', kycStatus: 'not_started', subscription: null,
      collected: { onlineCard: 0, onlineTransfer: 0, counter: 0, awaitingTransfer: 0 }
    })),
    fetchEmployees: vi.fn(async () => []),
    fetchStore: vi.fn(async () => ({ slug: 'apex', tradingName: 'Apex', category: 'General Retail', contactEmail: 'a@b.co', status: 'trialing', kycStatus: 'not_started', hasPhysicalStore: true, acceptingOrders: true })),
    subscribeToOrders: vi.fn(() => () => {})
  };
  return { api };
});

vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: true, supabase: {} }));
vi.mock('../../services/merchant', async () => {
  const actual = await vi.importActual('../../services/merchant');
  return new Proxy({ ...actual }, { get: (target, key) => (key in api ? api[key] : target[key]) });
});

import MerchantApp from './MerchantApp';

const tenant = { id: 't1', slug: 'apex', trading_name: 'Apex Pharmacy' };
const renderApp = (props = {}) => render(
  <MerchantApp tenant={tenant} profile={{ full_name: 'Ade' }} membershipRole="owner" onSignOut={vi.fn()} onOpenStorefront={vi.fn()} onRefreshTenant={vi.fn()} storefrontUrl="http://x/store/apex" {...props} />
);

beforeAll(() => {
  window.scrollTo = vi.fn();
  window.matchMedia = (query) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
});
beforeEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, '', '/dashboard');
});
afterEach(() => window.history.pushState({}, '', '/'));

describe('Merchant overview', () => {
  it('shows real figures, what needs attention and the setup checklist', async () => {
    renderApp();
    expect(await screen.findByText('₦58,400')).toBeInTheDocument();
    expect(screen.getByText('₦1,420,500')).toBeInTheDocument();
    expect(screen.getByText('Bank transfers to confirm')).toBeInTheDocument();
    expect(screen.getByText(/₦22,350 waiting on you/)).toBeInTheDocument();
    expect(screen.getByText('Add your address and phone number')).toBeInTheDocument();
    // sidebar badge: 1 new order + 1 transfer
    expect(within(screen.getByRole('link', { name: /Orders/ })).getByText('2')).toBeInTheDocument();
  });

  it('shows the real error with Retry instead of empty-looking numbers', async () => {
    api.fetchOverview.mockRejectedValueOnce(new Error('permission denied for function merchant_overview'));
    renderApp();
    expect(await screen.findByText(/permission denied for function merchant_overview/)).toBeInTheDocument();
    expect(screen.queryByText(/You're all caught up/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('₦58,400')).toBeInTheDocument();
  });
});

describe('Merchant orders', () => {
  it('lists orders and opens the detail with the transfer confirmation', async () => {
    window.history.pushState({}, '', '/dashboard/orders');
    renderApp();
    fireEvent.click(await screen.findByText('Tunde Bakare'));
    expect(await screen.findByText('Waiting for bank transfer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirm transfer received/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Yes, I received it/ }));
    await waitFor(() => expect(api.markOrderPaid).toHaveBeenCalledWith(api.order.id));
  });

  it('requires a reason to cancel and passes the refund tick through', async () => {
    window.history.pushState({}, '', `/dashboard/orders/${api.order.id}`);
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: /Cancel order/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));
    expect(await within(dialog).findByText(/is required/i)).toBeInTheDocument();
    expect(api.cancelOrder).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/Reason/i), { target: { value: 'Out of stock' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));
    await waitFor(() => expect(api.cancelOrder).toHaveBeenCalledWith(api.order.id, 'Out of stock', false));
  });

  it('shows a real failure when the database refuses the action', async () => {
    api.markOrderPaid.mockRejectedValueOnce(new Error('This order was cancelled; its stock has already been returned'));
    window.history.pushState({}, '', `/dashboard/orders/${api.order.id}`);
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: /Confirm transfer received/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Yes, I received it/ }));
    expect(await screen.findByText(/was cancelled; its stock/)).toBeInTheDocument();
  });

  it('hides owner-only actions from non-owners', async () => {
    window.history.pushState({}, '', `/dashboard/orders/${api.order.id}`);
    renderApp({ membershipRole: 'staff' });
    expect(await screen.findByText(/Only the store owner can confirm a transfer/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel order/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Payouts/ })).not.toBeInTheDocument();
  });
});

describe('Merchant products', () => {
  it('flags low stock and restocks through the atomic adjust call', async () => {
    window.history.pushState({}, '', '/dashboard/products');
    renderApp();
    expect(await screen.findByText('Indomie Carton')).toBeInTheDocument();
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Adjust stock for Indomie Carton/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Units to add or remove/), { target: { value: '24' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update stock' }));
    await waitFor(() => expect(api.adjustStock).toHaveBeenCalledWith('p2', 24));
  });
});

describe('Payouts & billing', () => {
  it('says plainly that payouts and billing are not live', async () => {
    window.history.pushState({}, '', '/dashboard/payouts');
    renderApp();
    expect(await screen.findByText(/Payouts to your bank are not switched on yet/)).toBeInTheDocument();
    expect(screen.getByText(/No settlement account yet/)).toBeInTheDocument();
    expect(screen.getByText(/Billing is not live/)).toBeInTheDocument();
  });
});
