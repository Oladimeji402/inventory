import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaProvider, isIosSafari } from './PwaProvider';

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';

function installMemoryStorage() {
  const data = new Map();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: (k) => data.delete(k),
      clear: () => data.clear()
    }
  });
}

function setUserAgent(value) {
  Object.defineProperty(window.navigator, 'userAgent', { value, configurable: true });
}

function fireInstallPrompt({ outcome = 'accepted' } = {}) {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = vi.fn();
  event.userChoice = Promise.resolve({ outcome });
  act(() => { window.dispatchEvent(event); });
  return event;
}

const renderApp = () => render(<PwaProvider><div>app</div></PwaProvider>);
const banner = () => screen.findByRole('region', { name: /Install STV/i }, { timeout: 3000 });

describe('install-as-app banner', () => {
  const originalUa = window.navigator.userAgent;
  beforeEach(() => {
    installMemoryStorage();
    setUserAgent(ANDROID_CHROME);
  });
  afterEach(() => setUserAgent(originalUa));

  it('detects Safari on iPhone but not other iOS browsers or Android', () => {
    expect(isIosSafari({ userAgent: IPHONE_SAFARI, maxTouchPoints: 5 })).toBe(true);
    expect(isIosSafari({ userAgent: IPHONE_CHROME, maxTouchPoints: 5 })).toBe(false);
    expect(isIosSafari({ userAgent: ANDROID_CHROME, maxTouchPoints: 5 })).toBe(false);
    // iPadOS reports itself as a Mac but has a touch screen
    expect(isIosSafari({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15', maxTouchPoints: 5 })).toBe(true);
    expect(isIosSafari({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15', maxTouchPoints: 0 })).toBe(false);
  });

  it('shows nothing until the browser says the app can be installed', async () => {
    renderApp();
    await act(async () => { await new Promise((r) => setTimeout(r, 1200)); });
    expect(screen.queryByRole('region', { name: /Install/i })).not.toBeInTheDocument();
  });

  it('shows a small "Install STV as an app" bar and installs on tap', async () => {
    renderApp();
    const event = fireInstallPrompt();
    const bar = await banner();
    expect(bar).toHaveTextContent('Install STV as an app');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Install' }));
    await act(async () => { await Promise.resolve(); });
    expect(event.prompt).toHaveBeenCalled();
  });

  it('can be dismissed, and stays away for a while', async () => {
    const { unmount } = renderApp();
    fireInstallPrompt();
    await banner();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('region', { name: /Install/i })).not.toBeInTheDocument();
    unmount();

    renderApp();
    fireInstallPrompt();
    await act(async () => { await new Promise((r) => setTimeout(r, 1200)); });
    expect(screen.queryByRole('region', { name: /Install/i })).not.toBeInTheDocument();
  });

  it('shows the Share → Add to Home Screen steps on Safari', async () => {
    setUserAgent(IPHONE_SAFARI);
    renderApp();
    const bar = await banner();
    expect(bar).toHaveTextContent('Install STV as an app');
    expect(bar).toHaveTextContent(/Tap\s*Share, then Add to Home Screen/);
    // Safari cannot install in one tap, so there is no Install button
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('region', { name: /Install/i })).not.toBeInTheDocument();
  });

  it('does not show once the app is already installed', async () => {
    const original = window.matchMedia;
    window.matchMedia = (q) => ({ matches: q.includes('standalone'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    setUserAgent(IPHONE_SAFARI);
    renderApp();
    await act(async () => { await new Promise((r) => setTimeout(r, 1200)); });
    expect(screen.queryByRole('region', { name: /Install/i })).not.toBeInTheDocument();
    window.matchMedia = original;
  });
});
