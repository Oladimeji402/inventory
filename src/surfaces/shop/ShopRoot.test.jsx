import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  auth: {},
  customer: { fetchMyOrders: vi.fn(), fetchMyOrder: vi.fn(), saveAddress: vi.fn(), deleteAddress: vi.fn(), updateMyProfile: vi.fn(), listAddresses: vi.fn() },
  store: { fetchMarketplaceStores: vi.fn() }
}));

vi.mock('../../hooks/useCustomerAuth', () => ({ useCustomerAuth: () => h.auth }));
vi.mock('../../services/customer', () => h.customer);
vi.mock('../../services/storefront', () => ({
  fetchMarketplaceStores: h.store.fetchMarketplaceStores,
  fetchStorefrontStore: vi.fn(async () => null),
  fetchStorefrontCatalog: vi.fn(async () => []),
  submitStorefrontOrder: vi.fn(),
  verifyStorefrontPayment: vi.fn(),
  releaseUnpaidOrder: vi.fn()
}));

import ShopRoot from './ShopRoot';

const guest = () => ({ user: null, profile: null, rider: null, addresses: [], signIn: vi.fn(async () => ({ ok: true })), signUp: vi.fn(async () => ({ ok: true })), signOut: vi.fn(), refresh: vi.fn() });
const member = (extra = {}) => ({
  ...guest(), user: { id: 'u1', email: 'amara@example.com' }, profile: { full_name: 'Amara Kalu', phone: '0803 000 1111' },
  addresses: [{ id: 'a1', label: 'Home', address: '12 Admiralty Way', city: 'Lekki', phone: null, is_default: true }], ...extra
});

const stores = [
  { id: 's1', name: 'Apex Health Pharmacy', slug: 'apex-pharmacy', category: 'Pharmacy', city: 'Ikeja', state: 'Lagos', productCount: 12 },
  { id: 's2', name: 'GreenGrocer Organics', slug: 'greengrocer', category: 'Supermarket', city: 'Lekki', state: 'Lagos', productCount: 1 }
];

const order = {
  id: 'abcdef12-0000-0000-0000-000000000000', status: 'dispatched', fulfillmentType: 'delivery', paymentMethod: 'Card', paymentStatus: 'paid',
  total: 4850, deliveryFee: 850, address: '12 Admiralty Way, Lekki', customerName: 'Amara Kalu', customerPhone: '0803 000 1111', deliveryOtp: '4821',
  store: { name: 'Apex Health Pharmacy', slug: 'apex-pharmacy', phone: '0802 000 1111', address: '14 Oba Akinjobi Way' },
  rider: { name: 'Tunde', phone: '0803 777 8888', vehicleType: 'motorcycle', plate: 'KJA-482-XD' },
  items: [{ name: 'Paracetamol', quantity: 2, unitPrice: 2000, lineTotal: 4000 }],
  createdAt: '2026-11-05T10:00:00Z', dispatchedAt: '2026-11-05T10:10:00Z', pickedUpAt: null, deliveredAt: null
};

const go = (path) => window.history.pushState({}, '', path);

beforeAll(() => { window.scrollTo = vi.fn(); });
beforeEach(() => {
  vi.clearAllMocks();
  h.auth = guest();
  h.store.fetchMarketplaceStores.mockResolvedValue(stores);
  h.customer.fetchMyOrders.mockResolvedValue({ data: [] });
});
afterEach(() => go('/'));

describe('Shop home', () => {
  it('lists real stores and filters them by search', async () => {
    go('/shop');
    render(<ShopRoot />);

    expect(await screen.findByText('Apex Health Pharmacy')).toBeInTheDocument();
    expect(screen.getByText('GreenGrocer Organics')).toBeInTheDocument();
    expect(screen.getByText('12 products in stock')).toBeInTheDocument();
    expect(screen.getByText('1 product in stock')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search stores'), { target: { value: 'green' } });
    expect(screen.queryByText('Apex Health Pharmacy')).not.toBeInTheDocument();
    expect(screen.getByText('GreenGrocer Organics')).toBeInTheDocument();
  });

  it('shows an honest empty state when no stores are open and never invents any', async () => {
    h.store.fetchMarketplaceStores.mockResolvedValue([]);
    go('/shop');
    render(<ShopRoot />);
    expect(await screen.findByText(/No stores are open yet/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Flash Deals|1-Click Demo/i);
  });

  it('opens a store page when a store is chosen', async () => {
    go('/shop');
    render(<ShopRoot />);
    fireEvent.click(await screen.findByText('Apex Health Pharmacy'));
    expect(window.location.pathname).toBe('/shop/store/apex-pharmacy');
  });
});

describe('Guests', () => {
  it('are asked to sign in to see orders, and sent back to them afterwards', async () => {
    go('/shop/orders');
    render(<ShopRoot />);
    expect(await screen.findByText(/Sign in to see your orders/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));
    expect(window.location.pathname + window.location.search).toBe('/shop/login?next=/orders');
  });

  it('validate sign-up before calling the server', async () => {
    go('/shop/signup');
    render(<ShopRoot />);
    fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'Amara Kalu' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'amara@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'longenough1' } });
    fireEvent.click(screen.getByRole('button', { name: /Create account/i, hidden: false }).closest('form').querySelector('button[type=submit]'));

    expect(await screen.findByText(/valid phone number/i)).toBeInTheDocument();
    expect(h.auth.signUp).not.toHaveBeenCalled();
  });

  it('can sign in and land on the page they wanted', async () => {
    go('/shop/login?next=/orders');
    render(<ShopRoot />);
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'amara@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-pass' } });
    fireEvent.click(document.querySelector('form button[type=submit]'));

    await waitFor(() => expect(h.auth.signIn).toHaveBeenCalledWith(expect.objectContaining({ email: 'amara@example.com' })));
    await waitFor(() => expect(window.location.pathname).toBe('/shop/orders'));
  });
});

describe('Signed-in customers', () => {
  beforeEach(() => { h.auth = member(); });

  it('see their orders with a readable status', async () => {
    h.customer.fetchMyOrders.mockResolvedValue({ data: [
      { id: 'o1', storeName: 'Apex Health Pharmacy', status: 'dispatched', paymentStatus: 'paid', paymentMethod: 'Card', fulfillmentType: 'delivery', total: 4850, itemsSummary: '2x Paracetamol', createdAt: '2026-11-05T10:00:00Z' },
      { id: 'o2', storeName: 'GreenGrocer', status: 'pending', paymentStatus: 'unpaid', paymentMethod: 'Transfer', fulfillmentType: 'delivery', total: 3000, itemsSummary: '1x Rice', createdAt: '2026-11-04T10:00:00Z' }
    ] });
    go('/shop/orders');
    render(<ShopRoot />);

    expect(await screen.findByText('On the way')).toBeInTheDocument();
    expect(screen.getByText('Awaiting transfer')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Apex Health Pharmacy'));
    expect(window.location.pathname).toBe('/shop/orders/o1');
  });

  it('track an order: handover code, rider and progress', async () => {
    h.customer.fetchMyOrder.mockResolvedValue({ data: order });
    go(`/shop/orders/${order.id}`);
    render(<ShopRoot />);

    expect(await screen.findByText('4821')).toBeInTheDocument();
    expect(screen.getByText(/Give this code to your rider/i)).toBeInTheDocument();
    expect(screen.getByText('Tunde will deliver your order')).toBeInTheDocument();
    expect(screen.getByText(/KJA-482-XD/)).toBeInTheDocument();
    expect(screen.getByText('Payment confirmed')).toBeInTheDocument();
    expect(screen.getByText('₦4,850')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:0803 777 8888');
  });

  it('never shows the handover code for an unpaid or finished order', async () => {
    h.customer.fetchMyOrder.mockResolvedValue({ data: { ...order, paymentStatus: 'unpaid', status: 'pending', rider: null } });
    go(`/shop/orders/${order.id}`);
    render(<ShopRoot />);
    expect(await screen.findByText(/payment was not completed/i)).toBeInTheDocument();
    expect(screen.queryByText('4821')).not.toBeInTheDocument();
  });

  it('manage saved addresses on their account', async () => {
    h.customer.saveAddress.mockResolvedValue();
    go('/shop/account');
    render(<ShopRoot />);

    expect(await screen.findByText('12 Admiralty Way, Lekki')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add address/i }));
    fireEvent.change(screen.getByLabelText('Delivery address'), { target: { value: '5 Allen Avenue, Ikeja' } });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Office' } });
    fireEvent.click(screen.getByRole('button', { name: /Save address/i }));

    await waitFor(() => expect(h.customer.saveAddress).toHaveBeenCalledWith('u1', expect.objectContaining({ address: '5 Allen Avenue, Ikeja', label: 'Office' })));
  });

  it('offer the rider switch only when they are a rider, and a way to become one otherwise', async () => {
    go('/shop/account');
    const { unmount } = render(<ShopRoot />);
    expect(await screen.findByRole('button', { name: /Become a rider/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Switch to rider mode/i })).not.toBeInTheDocument();
    unmount();

    h.auth = member({ rider: { id: 'r1', kyc_status: 'verified', onboarding_status: 'complete' } });
    render(<ShopRoot />);
    expect(await screen.findByRole('button', { name: /Switch to rider mode/i })).toBeInTheDocument();
    // the header offers it too
    expect(within(screen.getByRole('banner')).getByRole('button', { name: /Rider mode/i })).toBeInTheDocument();
  });
});
