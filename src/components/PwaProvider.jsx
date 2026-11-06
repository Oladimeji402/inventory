import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSyncStatus, subscribeSyncStatus } from '../services/store';
import { BRAND } from '../config/brand';
import InstallBanner from './InstallBanner';

const DISMISS_KEY = 'stv:install-dismissed-until';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 900;
const PwaContext = createContext(null);

/** Short brand label shown in the prompt, e.g. "STV". */
const APP_LABEL = BRAND.domain.split('.')[0].toUpperCase();

function wasDismissed() {
  try {
    return Number(window.localStorage.getItem(DISMISS_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    // storage unavailable: the banner simply returns on the next visit
  }
}

function clearDismissed() {
  try {
    window.localStorage.removeItem(DISMISS_KEY);
  } catch {
    // ignore
  }
}

/** Safari on iPhone/iPad cannot show an install prompt; the user adds it from the Share sheet. */
export function isIosSafari(nav = typeof navigator !== 'undefined' ? navigator : null) {
  if (!nav) return false;
  const ua = nav.userAgent || '';
  const iPadOs = /Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1;
  const ios = /iPad|iPhone|iPod/.test(ua) || iPadOs;
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  return ios && !otherBrowser && /Safari/.test(ua);
}

export function PwaProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [iosSafari] = useState(() => isIosSafari());
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [syncStatus, setSyncStatus] = useState(() => getSyncStatus());

  useEffect(() => {
    const isStandalone =
      (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' && window.navigator?.standalone);

    if (isStandalone) {
      setIsInstalled(true);
    }

    let autoOpenTimer;

    // Safari never fires beforeinstallprompt, so offer the Share steps instead.
    if (isIosSafari() && !isStandalone && !wasDismissed()) {
      autoOpenTimer = window.setTimeout(() => setInstallModalOpen(true), SHOW_DELAY_MS);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      if (!wasDismissed() && !isStandalone) {
        autoOpenTimer = window.setTimeout(() => setInstallModalOpen(true), SHOW_DELAY_MS);
      }
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallModalOpen(false);
      setInstalling(false);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = subscribeSyncStatus(setSyncStatus);

    return () => {
      window.clearTimeout(autoOpenTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const openInstallModal = useCallback(() => {
    clearDismissed();
    setInstallModalOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    markDismissed();
    setInstallModalOpen(false);
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      setInstallModalOpen(false);
      return;
    }
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        setInstallModalOpen(false);
      } else {
        markDismissed();
        setInstallModalOpen(false);
      }
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const value = useMemo(
    () => ({
      isInstallable,
      isInstalled,
      isOffline,
      syncStatus,
      installModalOpen,
      installing,
      openInstallModal,
      closeInstallModal,
      installApp
    }),
    [
      isInstallable,
      isInstalled,
      isOffline,
      syncStatus,
      installModalOpen,
      installing,
      openInstallModal,
      closeInstallModal,
      installApp
    ]
  );

  return (
    <PwaContext.Provider value={value}>
      {children}
      <InstallBanner
        open={installModalOpen && !isInstalled && (isInstallable || iosSafari)}
        mode={isInstallable ? 'prompt' : 'ios'}
        appName={APP_LABEL}
        installing={installing}
        onInstall={installApp}
        onClose={closeInstallModal}
      />
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    throw new Error('usePwa must be used within PwaProvider');
  }
  return ctx;
}
