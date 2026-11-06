import { describe, it, expect, vi, afterEach } from 'vitest';
import { openPaystackPopup } from './paystack';

describe('Paystack Inline Payment Helper', () => {
  afterEach(() => {
    delete window.PaystackPop;
    vi.restoreAllMocks();
  });

  it('never reports success when no public key is configured', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await openPaystackPopup({ email: 'a@b.co', amountInNaira: 12500, publicKey: '', onSuccess, onError });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/not configured/i));
  });

  it('never simulates an approval when the Paystack script is unavailable', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await openPaystackPopup({ email: 'a@b.co', amountInNaira: 5000, publicKey: 'pk_test_x', onSuccess, onError });

    expect(confirm).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('opens the checkout in kobo with the supplied reference and forwards the callback', async () => {
    const openIframe = vi.fn();
    const setup = vi.fn((opts) => {
      opts.callback({ reference: opts.ref, status: 'success' });
      return { openIframe };
    });
    window.PaystackPop = { setup };
    const onSuccess = vi.fn();

    await openPaystackPopup({
      email: 'a@b.co',
      amountInNaira: 12500,
      publicKey: 'pk_test_x',
      reference: 'SF-123',
      onSuccess
    });

    expect(setup).toHaveBeenCalledWith(expect.objectContaining({ amount: 1250000, ref: 'SF-123', currency: 'NGN' }));
    expect(openIframe).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ reference: 'SF-123' }));
  });
});
