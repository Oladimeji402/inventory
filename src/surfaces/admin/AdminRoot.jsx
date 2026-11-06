import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  Bike,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Package,
  Route,
  RefreshCw,
  ShieldCheck,
  Store,
  UserCog,
  Users
} from 'lucide-react';
import { BRAND } from '../../config/brand';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { fetchTrends, isPlatformAdmin } from '../../services/admin';
import { useAdminRoute } from './router';
import { Link, ToastProvider, useToast } from './ui';
import { timeAgo } from './format';
import OverviewPage from './pages/OverviewPage';
import { StoreDetailPage, StoresPage } from './pages/StoresPage';
import { RiderDetailPage, RidersPage } from './pages/RidersPage';
import { OrderDetailPage, OrdersPage } from './pages/OrdersPage';
import PayoutsPage from './pages/PayoutsPage';
import { RideDetailPage, RidesPage } from './pages/RidesPage';
import StaffPage from './pages/StaffPage';
import CorridorsPage from './pages/CorridorsPage';
import { AdminsPage, AuditPage } from './pages/PlatformPages';
import './admin.css';

const NAV = [
  { label: null, items: [{ to: '/', text: 'Overview', icon: LayoutDashboard, match: '' }] },
  {
    label: 'Operations',
    items: [
      { to: '/stores', text: 'Stores', icon: Store, match: 'stores' },
      { to: '/riders', text: 'Riders', icon: Bike, match: 'riders', badge: 'ridersPendingReview' },
      { to: '/orders', text: 'Orders', icon: Package, match: 'orders', badge: 'unpaidTransfers' },
      { to: '/rides', text: 'Rides', icon: Route, match: 'rides' },
      { to: '/payouts', text: 'Payouts', icon: Banknote, match: 'payouts', badge: 'payoutsPending' }
    ]
  },
  { label: 'People', items: [{ to: '/staff', text: 'Store staff', icon: Users, match: 'staff' }] },
  {
    label: 'Platform',
    items: [
      { to: '/corridors', text: 'Corridors & plans', icon: MapPin, match: 'corridors' },
      { to: '/audit', text: 'Audit log', icon: ClipboardList, match: 'audit' },
      { to: '/admins', text: 'Admins', icon: UserCog, match: 'admins' }
    ]
  }
];

function LoginScreen({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!isSupabaseConfigured) {
      setError('Admin sign-in is not available: Supabase is not configured.');
      return;
    }
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setBusy(false);
      setError('Sign-in failed. Check your email and password.');
      return;
    }
    // The database, not the browser, decides who is an admin.
    if (!(await isPlatformAdmin())) {
      await supabase.auth.signOut();
      setBusy(false);
      setError('This account does not have platform admin access.');
      return;
    }
    setBusy(false);
    onSignedIn();
  };

  return (
    <div className="ad-login">
      <form className="ad-login-card" onSubmit={submit}>
        <div className="ad-brand-mark" style={{ width: 48, height: 48, borderRadius: 14 }}><ShieldCheck size={26} /></div>
        <h1>Platform admin</h1>
        <p>Sign in with your administrator account to manage stores, riders, orders and payouts.</p>
        {error && <div className="ad-login-error" role="alert">{error}</div>}
        <label htmlFor="ad-email">Administrator email</label>
        <input id="ad-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        <label htmlFor="ad-password">Password</label>
        <input id="ad-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" />
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

function Shell({ onSignOut, email }) {
  const { segments, navigate } = useAdminRoute();
  const notify = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [queue, setQueue] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const { data } = await fetchTrends(7);
      setQueue(data?.queue || {});
      setUpdatedAt(new Date().toISOString());
    } catch {
      /* page-level error banners explain failures; the badges just stay as they were */
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const id = setInterval(() => { loadQueue(); setRefreshKey((k) => k + 1); }, 60000);
    return () => clearInterval(id);
  }, [loadQueue]);

  const refresh = async () => {
    setRefreshing(true);
    await loadQueue();
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  };

  const [section, id] = segments;
  const ctx = { navigate, notify, refreshKey, onChanged: loadQueue };

  let page;
  switch (section) {
    case 'stores': page = id ? <StoreDetailPage {...ctx} storeId={id} /> : <StoresPage {...ctx} />; break;
    case 'riders': page = id ? <RiderDetailPage {...ctx} riderId={id} /> : <RidersPage {...ctx} />; break;
    case 'orders': page = id ? <OrderDetailPage {...ctx} orderId={id} /> : <OrdersPage {...ctx} />; break;
    case 'rides': page = id ? <RideDetailPage {...ctx} rideId={id} /> : <RidesPage {...ctx} />; break;
    case 'payouts': page = <PayoutsPage {...ctx} />; break;
    case 'staff': page = <StaffPage {...ctx} />; break;
    case 'corridors': page = <CorridorsPage {...ctx} />; break;
    case 'audit': page = <AuditPage {...ctx} />; break;
    case 'admins': page = <AdminsPage {...ctx} />; break;
    default: page = <OverviewPage {...ctx} queue={queue} />;
  }

  return (
    <div className="ad-root">
      <aside className={`ad-sidebar ${menuOpen ? 'open' : ''}`} aria-label="Admin navigation">
        <div className="ad-brand">
          <span className="ad-brand-mark"><ShieldCheck size={19} /></span>
          <div><strong>{BRAND.name}</strong><span>Platform admin</span></div>
        </div>

        {NAV.map((group) => (
          <div className="ad-nav-group" key={group.label || 'top'}>
            {group.label && <div className="ad-nav-label">{group.label}</div>}
            {group.items.map((item) => {
              const active = (section || '') === item.match;
              const badge = item.badge ? Number(queue[item.badge]) || 0 : 0;
              return (
                <Link key={item.to} to={item.to} navigate={(to) => { setMenuOpen(false); navigate(to); }} className={`ad-nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                  <item.icon size={17} />
                  <span>{item.text}</span>
                  {badge > 0 && <span className="ad-nav-count" aria-label={`${badge} need attention`}>{badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="ad-sidebar-foot">
          <div className="ad-me">{email}</div>
          <button type="button" className="ad-btn-ghost-dark" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <div className="ad-main">
        <header className="ad-topbar">
          <button type="button" className="ad-btn ad-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle navigation"><Menu size={17} /></button>
          <span className="ad-live" title="Counts refresh every minute">
            <span className="ad-live-dot" />
            {updatedAt ? `Updated ${timeAgo(updatedAt)}` : 'Loading…'}
          </span>
          <button type="button" className="ad-btn ad-btn-sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 size={14} className="ad-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        </header>
        <main className="ad-content">{page}</main>
      </div>
    </div>
  );
}

export default function AdminRoot() {
  const [phase, setPhase] = useState(isSupabaseConfigured ? 'checking' : 'signed-out');
  const [email, setEmail] = useState('');

  const adopt = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setEmail(data?.user?.email || '');
    setPhase('ready');
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data?.session && (await isPlatformAdmin())) await adopt();
      else setPhase('signed-out');
    })();
    return () => { alive = false; };
  }, [adopt]);

  const signOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setPhase('signed-out');
  };

  if (phase === 'checking') return <div className="ad-login" aria-busy="true" />;
  if (phase === 'signed-out') return <LoginScreen onSignedIn={adopt} />;
  return (
    <ToastProvider>
      <Shell onSignOut={signOut} email={email} />
    </ToastProvider>
  );
}
