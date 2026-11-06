import { useCallback, useEffect, useState } from 'react';

/** Ride routes live at the root on rides.<domain> and under /rides everywhere else. */
export function ridesBase() {
  if (typeof window === 'undefined') return '/rides';
  const sub = window.location.hostname.split('.')[0];
  return sub === 'rides' || sub === 'ride' ? '' : '/rides';
}

export function ridesPath(to = '/') {
  const normalized = to.startsWith('/') ? to : `/${to}`;
  const base = ridesBase();
  return normalized === '/' ? base || '/' : `${base}${normalized}`;
}

function currentSegments() {
  if (typeof window === 'undefined') return [];
  const base = ridesBase();
  let path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (base && path.startsWith(base)) path = path.slice(base.length) || '/';
  return path.split('/').filter(Boolean);
}

export function useRidesRoute() {
  const [segments, setSegments] = useState(currentSegments);

  useEffect(() => {
    const onPop = () => setSegments(currentSegments());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to) => {
    window.history.pushState({}, '', ridesPath(to));
    setSegments(currentSegments());
    window.scrollTo?.({ top: 0 });
  }, []);

  return { segments, navigate };
}
