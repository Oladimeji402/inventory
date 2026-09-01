import { ArrowRight, Bike, Store } from 'lucide-react';
import BrandMark from '../../shared/components/BrandMark';
import { appLinks } from '../../config/surfaces';
import '../../components/landing/LandingPage.css';
import './GetStartedPage.css';

export default function GetStartedPage() {
  return (
    <div className="landing-page-root get-started-page">
      <header className="lp-header">
        <div className="lp-container">
          <nav className="lp-nav">
            <BrandMark href={appLinks.marketing()} />
          </nav>
        </div>
      </header>

      <main className="get-started">
        <p className="lp-eyebrow">Get started</p>
        <h1 className="get-started-title">How do you want to use Subtech?</h1>
        <p className="get-started-lead">
          Pick a path. You will go straight to that product&apos;s account screens.
        </p>

        <div className="get-started-grid">
          <a className="get-started-card" href={appLinks.merchantSignup()}>
            <span className="get-started-icon">
              <Store size={22} />
            </span>
            <h2>Merchant</h2>
            <p>Open a neighborhood storefront, take orders, and dispatch riders.</p>
            <span className="get-started-go">
              Continue to merchant signup
              <ArrowRight size={16} />
            </span>
          </a>

          <a className="get-started-card" href={appLinks.rider()}>
            <span className="get-started-icon">
              <Bike size={22} />
            </span>
            <h2>Rider</h2>
            <p>Join the courier network and pick up paid, nearby deliveries.</p>
            <span className="get-started-go">
              Continue to rider portal
              <ArrowRight size={16} />
            </span>
          </a>
        </div>

        <p className="get-started-signin">
          Already have an account?{' '}
          <a href={appLinks.merchantLogin()}>Merchant sign in</a>
          <span aria-hidden="true"> · </span>
          <a href={appLinks.rider()}>Rider sign in</a>
        </p>
      </main>
    </div>
  );
}
