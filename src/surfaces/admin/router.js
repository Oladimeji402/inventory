import { useCallback, useEffect, useState } from 'react';

/**
 * Tiny path router for the admin console. On admin.<domain> routes live at the root;
 * everywhere else they live under /admin.
 */
export function adminBase() {
  if (typeof window === 'undefined') return '/admin';
  return window.location.hostname.split('.')[0] === 'admin' ? '' : '/admin';
}

export function adminPath(to = '/') {
  const normalized = to.startsWith('/') ? to : `/${to}`;
  const base = adminBase();
  return normalized === '/' ? base || '/' : `${base}${normalized}`;
}

function currentSegments() {
  if (typeof window === 'undefined') return [];
  const base = adminBase();
  let path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (base && path.startsWith(base)) path = path.slice(base.length) || '/';
  return path.split('/').filter(Boolean);
}

export function useAdminRoute() {
  const [segments, setSegments] = useState(currentSegments);

  useEffect(() => {
    const onPop = () => setSegments(currentSegments());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to) => {
    window.history.pushState({}, '', adminPath(to));
    setSegments(currentSegments());
    window.scrollTo({ top: 0 });
  }, []);

  return { segments, navigate };
}
