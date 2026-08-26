import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSyncStatus, subscribeSyncStatus } from '../services/store';
import InstallAppModal from './InstallAppModal';

const DISMISS_KEY = 'counterpoint:install-dismissed';
const PwaContext = createContext(null);

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // ignore
  }
}

export function PwaProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
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

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      if (!wasDismissed() && !isStandalone) {
        autoOpenTimer = window.setTimeout(() => setInstallModalOpen(true), 900);
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
      <InstallAppModal
        open={installModalOpen && isInstallable}
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
