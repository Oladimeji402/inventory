import LandingPage from '../components/landing/LandingPage';
import MarketplaceApp from '../components/marketplace/MarketplaceApp';
import RiderApp from '../components/rider/RiderApp';
import TillApp from '../App';
import { appLinks, resolveSurface } from '../config/surfaces';
import MerchantRoot from './merchant/MerchantRoot';

export default function Root() {
  const surface = resolveSurface();

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

  return <LandingPage />;
}
