import { useCallback, useEffect, useState } from 'react';

/** Shop routes live at the root on shop.<domain> and under /shop everywhere else. */
export function shopBase() {
  if (typeof window === 'undefined') return '/shop';
  const sub = window.location.hostname.split('.')[0];
  return sub === 'shop' || sub === 'store' ? '' : '/shop';
}

export function shopPath(to = '/') {
  const normalized = to.startsWith('/') ? to : `/${to}`;
  const base = shopBase();
  return normalized === '/' ? base || '/' : `${base}${normalized}`;
}

function currentSegments() {
  if (typeof window === 'undefined') return [];
  const base = shopBase();
  let path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (base && path.startsWith(base)) path = path.slice(base.length) || '/';
  return path.split('/').filter(Boolean);
}

export function useShopRoute() {
  const [segments, setSegments] = useState(currentSegments);

  useEffect(() => {
    const onPop = () => setSegments(currentSegments());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to) => {
    window.history.pushState({}, '', shopPath(to));
    setSegments(currentSegments());
    window.scrollTo?.({ top: 0 });
  }, []);

  return { segments, navigate, search: typeof window === 'undefined' ? '' : window.location.search };
}
