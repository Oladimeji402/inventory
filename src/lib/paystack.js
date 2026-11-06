/**
 * Paystack Inline Payment Integration Helper
 * Securely loads the official Paystack popup script and handles card checkout callbacks.
 */

const PAYSTACK_SCRIPT_URL = 'https://js.paystack.co/v1/inline.js';

export function loadPaystackScript(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(false);
      return;
    }

    if (window.PaystackPop) {
      resolve(true);
      return;
    }

    // In test environment, immediately resolve false to prevent hanging on external network
    if (import.meta.env.MODE === 'test') {
      resolve(false);
      return;
    }

    const timer = setTimeout(() => {
      resolve(false);
    }, timeoutMs);

    const existingScript = document.querySelector(`script[src="${PAYSTACK_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => { clearTimeout(timer); resolve(true); });
      existingScript.addEventListener('error', () => { clearTimeout(timer); resolve(false); });
      return;
    }

    const script = document.createElement('script');
    script.src = PAYSTACK_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    script.onerror = () => {
      clearTimeout(timer);
      console.warn('Failed to load Paystack script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Opens the real Paystack checkout. There is deliberately no simulated approval:
 * if Paystack cannot be opened, `onError` is called and no payment is reported.
 * Even on `onSuccess` the caller must verify the reference server-side.
 */
export async function openPaystackPopup({
  email,
  amountInNaira,
  publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  reference = 'PAY-' + Date.now(),
  metadata = {},
  onSuccess,
  onClose,
  onError
}) {
  if (!publicKey) {
    onError?.('Card payments are not configured for this store yet.');
    return;
  }

  const isLoaded = await loadPaystackScript(8000);
  if (!isLoaded || !window.PaystackPop) {
    onError?.('Could not load the payment window. Check your connection and try again.');
    return;
  }

  try {
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(Number(amountInNaira) * 100), // kobo
      currency: 'NGN',
      ref: reference,
      metadata,
      callback: (response) => onSuccess?.(response),
      onClose: () => onClose?.()
    });
    handler.openIframe();
  } catch (err) {
    console.warn('Paystack setup error:', err);
    onError?.('Could not start the payment. Please try again.');
  }
}
