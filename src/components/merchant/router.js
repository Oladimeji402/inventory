import { useCallback, useEffect, useState } from 'react';

/** Tiny path router for the merchant dashboard; every page lives under /dashboard. */
export const DASHBOARD_BASE = '/dashboard';

export function dashPath(to = '/') {
  const normalized = to.startsWith('/') ? to : `/${to}`;
  return normalized === '/' ? DASHBOARD_BASE : `${DASHBOARD_BASE}${normalized}`;
}

function currentSegments() {
  if (typeof window === 'undefined') return [];
  let path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path.startsWith(DASHBOARD_BASE)) path = path.slice(DASHBOARD_BASE.length) || '/';
  return path.split('/').filter(Boolean);
}

export function useDashRoute() {
  const [segments, setSegments] = useState(currentSegments);

  useEffect(() => {
    const onPop = () => setSegments(currentSegments());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to) => {
    window.history.pushState({}, '', dashPath(to));
    setSegments(currentSegments());
    window.scrollTo({ top: 0 });
  }, []);

  return { segments, navigate };
}
