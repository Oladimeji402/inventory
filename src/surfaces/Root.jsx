import { useState, useEffect } from 'react';
import LandingPage from '../components/landing/LandingPage';
import MarketplaceApp from '../components/marketplace/MarketplaceApp';
import StorefrontApp from '../components/storefront/StorefrontApp';
import TillApp from '../App';
import { appLinks, resolveSurface, inferTenantSlugFromHost } from '../config/surfaces';
import GetStartedPage from './marketing/GetStartedPage';
import MerchantRoot from './merchant/MerchantRoot';
import RiderRoot from './rider/RiderRoot';
import AdminRoot from './admin/AdminRoot';
import RidesApp from '../components/rides/RidesApp';

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

  // Store direct URL pattern (e.g. /store/apex-pharmacy or /shop/store/apex-pharmacy)
  const storeSlugMatch = path.match(/^\/(?:shop\/)?store\/([a-zA-Z0-9_-]+)/);
  const selectedSlug = storeSlugMatch ? storeSlugMatch[1] : null;

  if (selectedSlug) {
    return (
      <StorefrontApp
        storeSlug={selectedSlug}
        onExitToLanding={() => {
          const backPath = surface === 'shop' ? '/shop' : '/';
          window.history.pushState({}, '', backPath);
          setPath(backPath);
        }}
      />
    );
  }

  if (surface === 'shop') {
    return (
      <MarketplaceApp
        onOpenStorefront={(slug) => {
          const next = `/shop/store/${slug}`;
          window.history.pushState({}, '', next);
          setPath(next);
        }}
        onExitToLanding={() => { window.location.href = appLinks.marketing(); }}
      />
    );
  }

  if (surface === 'rides') {
    return (
      <RidesApp
        onExitToLanding={() => {
          window.history.pushState({}, '', '/');
          setPath('/');
        }}
      />
    );
  }

  if (path === '/start') return <GetStartedPage />;

  if (hasAuthCallbackParams()) {
    window.location.replace(`${appLinks.merchantLogin()}${window.location.search}${window.location.hash}`);
    return null;
  }

  return <LandingPage />;
}

