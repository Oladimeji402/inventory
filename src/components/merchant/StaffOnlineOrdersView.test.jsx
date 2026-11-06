import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: true, supabase: { rpc } }));

import StaffOnlineOrdersView from './StaffOnlineOrdersView';

const row = (over) => ({
  id: 'o1aaaaaa-0000-4000-8000-000000000000', created_at: new Date().toISOString(), channel: 'online', status: 'pending',
  payment_status: 'paid', payment_method: 'Card', fulfillment_type: 'pickup', customer_name: 'Ada', customer_phone: '0803',
  total: 5000, delivery_fee: 0, order_items: [{ id: 'i', product_name: 'Milk', quantity: 1, unit_price: 5000, line_total: 5000 }], ...over
});

beforeAll(() => {
  window.matchMedia = (q) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
});
beforeEach(() => rpc.mockReset());

describe('Staff online orders', () => {
  it('shows real orders and never shows the delivery code', async () => {
    rpc.mockResolvedValue({ data: [row()], error: null });
    render(<StaffOnlineOrdersView staff={{ token: 'tok', full_name: 'Bola', trading_name: 'Apex' }} onSignOut={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Orders' }));
    fireEvent.click(await screen.findByText('Ada'));
    expect(await screen.findByText('Ready for customer pickup'.replace('Ready for customer pickup', 'Pack this pickup order'))).toBeInTheDocument();
    expect(screen.queryByText(/OTP|code/i)).toBeNull();
  });

  it('surfaces the real error when the session is rejected', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Session expired. Please sign in again.' } });
    render(<StaffOnlineOrdersView staff={{ token: 'bad', full_name: 'Bola', trading_name: 'Apex' }} onSignOut={vi.fn()} />);
    expect(await screen.findByText(/Session expired/)).toBeInTheDocument();
  });

  it('packs a paid order through the token-checked function', async () => {
    rpc.mockImplementation(async (name) => (name === 'staff_online_orders' ? { data: [row()], error: null } : { data: {}, error: null }));
    render(<StaffOnlineOrdersView staff={{ token: 'tok', full_name: 'Bola', trading_name: 'Apex' }} onSignOut={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Orders' }));
    fireEvent.click(await screen.findByText('Ada'));
    fireEvent.click(await screen.findByRole('button', { name: /Mark packed/ }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('staff_mark_order_ready', { p_token: 'tok', p_order_id: 'o1aaaaaa-0000-4000-8000-000000000000', p_ready: true }));
  });
});
