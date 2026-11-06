import { useEffect } from 'react';
import { Bike, ListChecks, ShoppingBag, User } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { appLinks } from '../../config/surfaces';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import AuthPage from '../shop/pages/AuthPage';
import { ridesPath, useRidesRoute } from './ridesRouter';
import BookPage from './pages/BookPage';
import TripPage from './pages/TripPage';
import TripsPage from './pages/TripsPage';
import '../shop/shop.css';
import './rides.css';

function Link({ to, navigate, className, children, ...rest }) {
  return (
    <a
      href={ridesPath(to)}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export default function RidesRoot() {
  const auth = useCustomerAuth();
  const { segments, navigate } = useRidesRoute();
  const [section, id] = segments;

  useEffect(() => {
    document.title = `${BRAND.name} Rides`;
  }, []);

  let page;
  if (section === 'login' || section === 'signup') page = <AuthPage auth={auth} navigate={navigate} mode={section === 'signup' ? 'signup' : 'login'} />;
  else if (section === 'trips' && id) page = <TripPage auth={auth} navigate={navigate} rideId={id} />;
  else if (section === 'trips') page = <TripsPage auth={auth} navigate={navigate} />;
  else page = <BookPage auth={auth} navigate={navigate} />;

  const current = section || 'book';
  const toShop = () => { window.location.href = appLinks.shop(); };
  const toRider = () => { window.location.href = appLinks.rider(); };
  const riderReady = auth.rider?.onboarding_status === 'complete';

  return (
    <div className="sh-root">
      <header className="sh-header">
        <div className="sh-wrap sh-header-in">
          <Link to="/" navigate={navigate} className="sh-logo"><span className="sh-logo-mark"><Bike size={17} /></span>{BRAND.name} Rides</Link>
          <nav className="sh-nav" aria-label="Main">
            <Link to="/" navigate={navigate} className={`sh-nav-link ${current === 'book' ? 'active' : ''}`}><Bike size={15} /> Book a ride</Link>
            <Link to="/trips" navigate={navigate} className={`sh-nav-link ${current === 'trips' ? 'active' : ''}`}><ListChecks size={15} /> My trips</Link>
            <button type="button" className="sh-nav-link" onClick={toShop}><ShoppingBag size={15} /> Shop</button>
            {riderReady && <button type="button" className="sh-nav-link" onClick={toRider}><Bike size={15} /> Rider mode</button>}
            <Link to={auth.user ? '/trips' : '/login'} navigate={navigate} className={`sh-nav-link ${['login', 'signup'].includes(current) ? 'active' : ''}`}>
              <User size={15} /> {auth.user ? (auth.profile?.full_name || 'Account').split(' ')[0] : 'Sign in'}
            </Link>
          </nav>
        </div>
      </header>

      <main>{page}</main>

      <nav className="sh-tabbar" aria-label="Main">
        <Link to="/" navigate={navigate} className={current === 'book' ? 'active' : ''}><Bike size={20} />Book</Link>
        <Link to="/trips" navigate={navigate} className={current === 'trips' ? 'active' : ''}><ListChecks size={20} />Trips</Link>
        <button type="button" onClick={toShop}><ShoppingBag size={20} />Shop</button>
        {riderReady ? <button type="button" onClick={toRider}><Bike size={20} />Rider</button>
          : <Link to={auth.user ? '/trips' : '/login'} navigate={navigate} className={['login', 'signup'].includes(current) ? 'active' : ''}><User size={20} />{auth.user ? 'Account' : 'Sign in'}</Link>}
      </nav>
    </div>
  );
}
