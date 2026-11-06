import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const submitStorefrontOrder = vi.fn();
const verifyStorefrontPayment = vi.fn();
const releaseUnpaidOrder = vi.fn();
const openPaystackPopup = vi.fn();

vi.mock('../../services/storefront', () => ({
  submitStorefrontOrder: (...a) => submitStorefrontOrder(...a),
  verifyStorefrontPayment: (...a) => verifyStorefrontPayment(...a),
  releaseUnpaidOrder: (...a) => releaseUnpaidOrder(...a)
}));
vi.mock('../../lib/paystack', () => ({ openPaystackPopup: (...a) => openPaystackPopup(...a) }));

import StorefrontCartDrawer from './StorefrontCartDrawer';

const cart = [{ id: '11111111-1111-1111-1111-111111111111', name: 'Peak Milk', price: 1000, quantity: 2 }];

function renderDrawer(onCheckoutComplete = vi.fn()) {
  render(
    <StorefrontCartDrawer
      isOpen
      onClose={() => {}}
      cartItems={cart}
      onUpdateQuantity={() => {}}
      onClearCart={() => {}}
      onCheckoutComplete={onCheckoutComplete}
      storeSlug="apex"
    />
  );
  return onCheckoutComplete;
}

describe('StorefrontCartDrawer checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: () => 'test-uuid' });
  });

  it('starts with empty customer fields instead of a pre-filled demo shopper', () => {
    renderDrawer();
    expect(screen.queryByDisplayValue('Amara Kalu')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(/803 291 0029/)).not.toBeInTheDocument();
  });

  it('shows an error and never confirms the order when the server rejects it', async () => {
    submitStorefrontOrder.mockRejectedValue(new Error('An item in your cart is out of stock'));
    const done = renderDrawer();

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Tolu A.' } });
    fireEvent.change(inputs[1], { target: { value: '08031234567' } });
    fireEvent.change(inputs[2], { target: { value: '12 Admiralty Way' } });
    fireEvent.click(screen.getByRole('button', { name: /Place Order/i }));

    expect(await screen.findByText(/out of stock/i)).toBeInTheDocument();
    expect(done).not.toHaveBeenCalled();
    expect(openPaystackPopup).not.toHaveBeenCalled();
  });

  it('does not confirm a card order until the payment is verified server-side', async () => {
    submitStorefrontOrder.mockResolvedValue({ order_id: 'ord-1', total: 2850, delivery_otp: '4821' });
    verifyStorefrontPayment.mockRejectedValue(new Error('Payment was not successful'));
    openPaystackPopup.mockImplementation(async ({ onSuccess }) => onSuccess({ reference: 'SF-test-uuid' }));
    const done = renderDrawer();

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Tolu A.' } });
    fireEvent.change(inputs[1], { target: { value: '08031234567' } });
    fireEvent.change(inputs[2], { target: { value: '12 Admiralty Way' } });
    fireEvent.click(screen.getByRole('button', { name: /Place Order/i }));

    await waitFor(() => expect(verifyStorefrontPayment).toHaveBeenCalledWith('ord-1', 'SF-test-uuid'));
    expect(await screen.findByText(/could not confirm your payment/i)).toBeInTheDocument();
    expect(done).not.toHaveBeenCalled();
  });

  it('releases the reserved stock when the shopper closes the payment window', async () => {
    submitStorefrontOrder.mockResolvedValue({ order_id: 'ord-2', total: 2850 });
    openPaystackPopup.mockImplementation(async ({ onClose }) => onClose());
    const done = renderDrawer();

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Tolu A.' } });
    fireEvent.change(inputs[1], { target: { value: '08031234567' } });
    fireEvent.change(inputs[2], { target: { value: '12 Admiralty Way' } });
    fireEvent.click(screen.getByRole('button', { name: /Place Order/i }));

    await waitFor(() => expect(releaseUnpaidOrder).toHaveBeenCalledWith('ord-2'));
    expect(done).not.toHaveBeenCalled();
  });
});
