import LandingPage from '../components/landing/LandingPage';
import MarketplaceApp from '../components/marketplace/MarketplaceApp';
import RiderApp from '../components/rider/RiderApp';
import TillApp from '../App';
import { appLinks, resolveSurface } from '../config/surfaces';
import GetStartedPage from './marketing/GetStartedPage';
import MerchantRoot from './merchant/MerchantRoot';

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
  const path = currentPath();

  if (surface === 'merchant') return <MerchantRoot />;
  if (surface === 'till') return <TillApp />;

  if (surface === 'rider') {
    return <RiderApp onExitToLanding={() => { window.location.href = appLinks.marketing(); }} />;
  }

  if (surface === 'shop') {
    return (
      <MarketplaceApp
        onOpenStorefront={() => {}}
        onExitToLanding={() => { window.location.href = appLinks.marketing(); }}
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
