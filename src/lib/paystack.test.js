import { describe, it, expect, vi } from 'vitest';
import { openPaystackPopup } from './paystack';

describe('Paystack Inline Payment Helper', () => {
  it('triggers onSuccess in simulated mode when user confirms checkout', async () => {
    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    await openPaystackPopup({
      email: 'shopper@test.com',
      amountInNaira: 12500,
      publicKey: 'pk_test_sample_counterpoint',
      onSuccess,
      onClose
    });

    expect(onSuccess).toHaveBeenCalled();
    const result = onSuccess.mock.calls[0][0];
    expect(result.status).toBe('success');
    expect(result.reference).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('triggers onClose in simulated mode when user cancels card checkout', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false);
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    await openPaystackPopup({
      email: 'shopper@test.com',
      amountInNaira: 5000,
      publicKey: 'pk_test_sample_counterpoint',
      onSuccess,
      onClose
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
