import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Banknote,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  Store,
  UserCog,
  Users
} from 'lucide-react';
import { BRAND } from '../../config/brand';
import { appLinks } from '../../config/surfaces';
import { fetchOverview, subscribeToOrders } from '../../services/merchant';
import { useDashRoute } from './router';
import { Link, ToastProvider, useAsync, useToast } from './ui';
import { timeAgo } from './format';
import MerchantOverview from './MerchantOverview';
import { MerchantOrderDetail, MerchantOrders } from './MerchantOrders';
import MerchantProducts from './MerchantProducts';
import MerchantCustomers from './MerchantCustomers';
import MerchantAnalytics from './MerchantAnalytics';
import MerchantPayouts from './MerchantPayouts';
import MerchantEmployees from './MerchantEmployees';
import MerchantSettings from './MerchantSettings';
import './Merchant.css';

const NAV = [
  { label: null, items: [{ to: '/', text: 'Overview', icon: LayoutDashboard, match: '' }] },
  {
    label: 'Sell',
    items: [
      { to: '/orders', text: 'Orders', icon: ShoppingBag, match: 'orders', badge: 'orders' },
      { to: '/products', text: 'Products', icon: Package, match: 'products', badge: 'stock' },
      { to: '/customers', text: 'Customers', icon: Users, match: 'customers' }
    ]
  },
  {
    label: 'Grow',
    items: [{ to: '/analytics', text: 'Analytics', icon: BarChart3, match: 'analytics' }]
  },
  {
    label: 'Store',
    items: [
      { to: '/payouts', text: 'Payouts & billing', icon: Banknote, match: 'payouts', managerOnly: true },
      { to: '/staff', text: 'Staff', icon: UserCog, match: 'staff', managerOnly: true },
      { to: '/settings', text: 'Settings', icon: Settings, match: 'settings' }
    ]
  }
];

function Shell({ tenant, profile, membershipRole, justOnboarded, onRefreshTenant, onSignOut, onOpenStorefront, storefrontUrl }) {
  const { segments, navigate } = useDashRoute();
  const notify = useToast();
  const canManage = membershipRole === 'owner' || membershipRole === 'admin';
  const [menuOpen, setMenuOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const overview = useAsync(async () => {
    const data = await fetchOverview(30);
    setUpdatedAt(new Date().toISOString());
    return data;
  }, [tenant.id]);
  const { reload: reloadOverview } = overview;

  const bump = useCallback(() => {
    reloadOverview({ silent: true });
    setRefreshKey((k) => k + 1);
  }, [reloadOverview]);

  // Live updates: a new or changed order refreshes the counts and the open page.
  const bumpRef = useRef(bump);
  bumpRef.current = bump;
  useEffect(() => {
    let timer;
    const unsubscribe = subscribeToOrders(tenant.id, () => {
      clearTimeout(timer);
      timer = setTimeout(() => bumpRef.current(), 400);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [tenant.id]);

  // Fallback for when realtime is unavailable.
  useEffect(() => {
    const id = setInterval(() => bumpRef.current(), 60000);
    return () => clearInterval(id);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await reloadOverview({ silent: true });
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  };

  const attention = overview.data?.attention || {};

  // Tell the owner when a new paid order lands while they have the dashboard open.
  const lastNew = useRef(null);
  const newOrders = overview.data ? Number(attention.newOrders) || 0 : null;
  useEffect(() => {
    if (newOrders === null) return;
    if (lastNew.current !== null && newOrders > lastNew.current) {
      notify(`${newOrders - lastNew.current} new order${newOrders - lastNew.current === 1 ? '' : 's'} to pack`);
    }
    lastNew.current = newOrders;
    document.title = newOrders > 0 ? `(${newOrders}) ${tenant.trading_name || 'Dashboard'}` : tenant.trading_name || 'Dashboard';
  }, [newOrders, notify, tenant.trading_name]);
  const badges = {
    orders: (Number(attention.newOrders) || 0) + (Number(attention.awaitingTransferCount) || 0),
    stock: (Number(attention.outOfStock) || 0) + (Number(attention.lowStock) || 0)
  };

  const [section, id] = segments;
  const ctx = { navigate, notify, refreshKey, canManage, tenant, onChanged: bump };

  let page;
  switch (section) {
    case 'orders': page = id ? <MerchantOrderDetail {...ctx} orderId={id} /> : <MerchantOrders {...ctx} />; break;
    case 'products': page = <MerchantProducts {...ctx} />; break;
    case 'customers': page = <MerchantCustomers {...ctx} />; break;
    case 'analytics': page = <MerchantAnalytics {...ctx} />; break;
    case 'payouts': page = <MerchantPayouts {...ctx} />; break;
    case 'staff': page = <MerchantEmployees {...ctx} />; break;
    case 'settings': page = <MerchantSettings {...ctx} onRefreshTenant={onRefreshTenant} />; break;
    default:
      page = (
        <MerchantOverview
          {...ctx}
          store={tenant}
          overview={overview}
          showWelcome={justOnboarded}
          storefrontUrl={storefrontUrl}
          onOpenStorefront={onOpenStorefront}
        />
      );
  }

  const storeHost = (storefrontUrl || BRAND.domain).replace(/^https?:\/\//, '');
  const goTo = (to) => {
    setMenuOpen(false);
    navigate(to);
  };

  return (
    <div className="mc-root">
      <aside className={`mc-sidebar ${menuOpen ? 'open' : ''}`} aria-label="Store navigation">
        <div className="mc-brand">
          <span className="mc-brand-mark"><Store size={19} /></span>
          <div>
            <strong title={tenant.trading_name}>{tenant.trading_name || 'Your store'}</strong>
            <span className="sub">Merchant dashboard</span>
          </div>
        </div>

        {NAV.map((group) => {
          const items = group.items.filter((item) => canManage || !item.managerOnly);
          if (!items.length) return null;
          return (
            <div className="mc-nav-group" key={group.label || 'top'}>
              {group.label && <div className="mc-nav-label">{group.label}</div>}
              {items.map((item) => {
                const active = (section || '') === item.match;
                const badge = item.badge ? Number(badges[item.badge]) || 0 : 0;
                return (
                  <Link key={item.to} to={item.to} navigate={goTo} className={`mc-nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                    <item.icon size={17} />
                    <span>{item.text}</span>
                    {badge > 0 && <span className="mc-nav-count" aria-label={`${badge} need attention`}>{badge}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}

        <div className="mc-sidebar-foot">
          <div className="mc-me">
            <b>{profile?.full_name || 'Signed in'}</b>
            {membershipRole ? `${membershipRole.charAt(0).toUpperCase()}${membershipRole.slice(1)}` : ''}
          </div>
          <button type="button" className="mc-btn-ghost-dark" onClick={onOpenStorefront}><ExternalLink size={16} /> View storefront</button>
          <a className="mc-btn-ghost-dark" href={appLinks.till()} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}><Store size={16} /> Open the till</a>
          <button type="button" className="mc-btn-ghost-dark danger" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <div className={`mc-scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <div className="mc-main">
        <header className="mc-topbar">
          <button type="button" className="mc-btn mc-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle navigation" aria-expanded={menuOpen}><Menu size={17} /></button>
          <a className="mc-storelink" href={storefrontUrl || '#'} onClick={(e) => { e.preventDefault(); onOpenStorefront(); }} title="Open your public storefront">
            <Store size={14} />
            <span>{storeHost}</span>
          </a>
          <span className="mc-live" title="Orders update live; counts also refresh every minute">
            <span className="mc-live-dot" />
            <span className="txt">{updatedAt ? `Updated ${timeAgo(updatedAt)}` : 'Loading…'}</span>
          </span>
          <button type="button" className="mc-btn mc-btn-sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 size={14} className="mc-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        </header>
        <main className="mc-content">{page}</main>
      </div>
    </div>
  );
}

export default function MerchantApp(props) {
  return (
    <ToastProvider>
      <Shell {...props} />
    </ToastProvider>
  );
}
