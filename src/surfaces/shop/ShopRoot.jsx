import { useEffect } from 'react';
import { Bike, Home, Package, ShoppingBag, User } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { appLinks } from '../../config/surfaces';
import StorefrontApp from '../../components/storefront/StorefrontApp';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import { shopPath, useShopRoute } from './shopRouter';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import AccountPage from './pages/AccountPage';
import { OrderPage, OrdersPage } from './pages/OrdersPages';
import './shop.css';

function Link({ to, navigate, className, children, ...rest }) {
  return (
    <a
      href={shopPath(to)}
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

export default function ShopRoot() {
  const auth = useCustomerAuth();
  const { segments, navigate } = useShopRoute();
  const [section, id] = segments;

  useEffect(() => {
    document.title = `${BRAND.name} Shop`;
  }, []);

  // A store page owns the whole screen (its own header and cart).
  if (section === 'store' && id) {
    const customer = auth.user ? { user: auth.user, profile: auth.profile, addresses: auth.addresses } : null;
    return (
      <StorefrontApp
        key={id + (auth.user?.id || 'guest')}
        storeSlug={id}
        customer={customer}
        onExitToLanding={() => navigate('/')}
        onTrackOrder={(orderId) => navigate(`/orders/${orderId}`)}
      />
    );
  }

  let page;
  if (section === 'login' || section === 'signup') page = <AuthPage auth={auth} navigate={navigate} mode={section === 'signup' ? 'signup' : 'login'} />;
  else if (section === 'account') page = <AccountPage auth={auth} navigate={navigate} />;
  else if (section === 'orders' && id) page = <OrderPage auth={auth} navigate={navigate} orderId={id} />;
  else if (section === 'orders') page = <OrdersPage auth={auth} navigate={navigate} />;
  else page = <HomePage navigate={navigate} />;

  const current = section || 'home';
  const accountTo = auth.user ? '/account' : '/login';
  const toRider = () => { window.location.href = appLinks.rider(); };

  return (
    <div className="sh-root">
      <header className="sh-header">
        <div className="sh-wrap sh-header-in">
          <Link to="/" navigate={navigate} className="sh-logo"><span className="sh-logo-mark"><ShoppingBag size={17} /></span>{BRAND.name} Shop</Link>
          <nav className="sh-nav" aria-label="Main">
            <Link to="/" navigate={navigate} className={`sh-nav-link ${current === 'home' ? 'active' : ''}`}><Home size={15} /> Stores</Link>
            <Link to="/orders" navigate={navigate} className={`sh-nav-link ${current === 'orders' ? 'active' : ''}`}><Package size={15} /> Orders</Link>
            {auth.rider?.onboarding_status === 'complete' && (
              <button type="button" className="sh-nav-link" onClick={toRider}><Bike size={15} /> Rider mode</button>
            )}
            <Link to={accountTo} navigate={navigate} className={`sh-nav-link ${['account', 'login', 'signup'].includes(current) ? 'active' : ''}`}>
              <User size={15} /> {auth.user ? (auth.profile?.full_name || 'Account').split(' ')[0] : 'Sign in'}
            </Link>
          </nav>
        </div>
      </header>

      <main>{page}</main>

      <nav className="sh-tabbar" aria-label="Main">
        <Link to="/" navigate={navigate} className={current === 'home' ? 'active' : ''}><Home size={20} />Stores</Link>
        <Link to="/orders" navigate={navigate} className={current === 'orders' ? 'active' : ''}><Package size={20} />Orders</Link>
        {auth.rider?.onboarding_status === 'complete' && <button type="button" onClick={toRider}><Bike size={20} />Rider</button>}
        <Link to={accountTo} navigate={navigate} className={['account', 'login', 'signup'].includes(current) ? 'active' : ''}><User size={20} />{auth.user ? 'Account' : 'Sign in'}</Link>
      </nav>
    </div>
  );
}
