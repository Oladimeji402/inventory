/**
 * Which store this till (this browser/device) is connected to. Once the
 * store's own subdomain resolves the tenant automatically, this manual
 * setting won't be needed — see inferTenantSlugFromHost() in config/surfaces.
 * Until then, a store admin sets it once from the Admin tab.
 */
const KEY = 'subtech.till.store_slug';
const NAME_KEY = 'subtech.till.store_name';

export function getTillStoreSlug() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setTillStoreSlug(slug) {
  if (typeof window === 'undefined') return;
  try {
    const value = String(slug || '').trim().toLowerCase();
    if (value) window.localStorage.setItem(KEY, value);
    else window.localStorage.removeItem(KEY);
  } catch {
    // localStorage unavailable (private mode, etc.) — setting just won't persist
  }
}

/** Trading name for the connected store, cached from the last successful sign-in. */
export function getTillStoreName() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setTillStoreName(name) {
  if (typeof window === 'undefined') return;
  try {
    const value = String(name || '').trim();
    if (value) window.localStorage.setItem(NAME_KEY, value);
    else window.localStorage.removeItem(NAME_KEY);
  } catch {
    // localStorage unavailable (private mode, etc.) — setting just won't persist
  }
}
