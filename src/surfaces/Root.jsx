import { lazy, Suspense, useState, useEffect } from 'react';
import ShopRoot from './shop/ShopRoot';
import StorefrontApp from '../components/storefront/StorefrontApp';
import TillApp from '../App';
import { appLinks, resolveSurface, inferTenantSlugFromHost } from '../config/surfaces';
import GetStartedPage from './marketing/GetStartedPage';
import MerchantRoot from './merchant/MerchantRoot';
import RiderRoot from './rider/RiderRoot';
import AdminRoot from './admin/AdminRoot';
import RidesRoot from './rides/RidesRoot';

// The marketing site is the only surface that needs the animation libraries, so load it on demand.
const HomePage = lazy(() => import('./home/HomePage'));

function currentPath() {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

/**
 * Supabase's "Confirm your email" / "Reset password" links redirect back through
 * its own /auth/v1/verify endpoint. If the exact emailRedirectTo URL isn't in the
 * project's allow-listed Redirect URLs, Supabase silently falls back to the
 * generic Site URL — which lands the user on the bare marketing homepage instead
 * of the merchant login flow, with the auth tokens still attached to the URL.
 */
function hasAuthCallbackParams() {
  if (typeof window === 'undefined') return false;
  const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search || '');
  return Boolean(
    hashParams.get('access_token') || hashParams.get('refresh_token') || queryParams.get('code')
  );
}

export default function Root() {
  const surface = resolveSurface();
  const [path, setPath] = useState(currentPath);
  const hostSlug = inferTenantSlugFromHost();

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Dedicated tenant subdomain (e.g. apex-pharmacy.counterpoint.app)
  if (hostSlug && surface !== 'merchant' && surface !== 'till') {
    return (
      <StorefrontApp
        storeSlug={hostSlug}
        onExitToLanding={() => { window.location.href = appLinks.marketing(); }}
      />
    );
  }

  if (surface === 'merchant') return <MerchantRoot />;
  if (surface === 'till') return <TillApp />;

  if (surface === 'rider') {
    return <RiderRoot />;
  }

  if (surface === 'admin') {
    return <AdminRoot />;
  }

  if (surface === 'shop') return <ShopRoot />;

  // Direct store link for guests (e.g. /store/apex-pharmacy)
  const storeSlugMatch = path.match(/^\/store\/([a-zA-Z0-9_-]+)/);
  if (storeSlugMatch) {
    return (
      <StorefrontApp
        storeSlug={storeSlugMatch[1]}
        onExitToLanding={() => {
          window.history.pushState({}, '', '/');
          setPath('/');
        }}
      />
    );
  }

  if (surface === 'rides') return <RidesRoot />;

  if (path === '/start') return <GetStartedPage />;

  if (hasAuthCallbackParams()) {
    window.location.replace(`${appLinks.merchantLogin()}${window.location.search}${window.location.hash}`);
    return null;
  }

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050b1c' }} aria-busy="true" />}>
      <HomePage />
    </Suspense>
  );
}

