const KEY = 'subtech_intended_slug';

export function saveIntendedSlug(slug) {
  if (typeof window === 'undefined') return;
  const value = String(slug || '').trim();
  if (value) window.sessionStorage.setItem(KEY, value);
  else window.sessionStorage.removeItem(KEY);
}

export function readIntendedSlug() {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(KEY) || '';
}

export function clearIntendedSlug() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(KEY);
}
