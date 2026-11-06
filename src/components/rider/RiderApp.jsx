import { useCallback, useEffect, useState } from 'react';
import './Rider.css';
import './RiderScreens.css';
import { History, Inbox, Navigation, ShoppingBag, Sun, User, Wallet } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { VEHICLE_TYPES } from '../../lib/riderConstants';
import { acceptDispatch, fetchActiveOrder, fetchActiveRide, setRiderOnline } from '../../services/rider';
import RiderRequests from './RiderRequests';
import RiderRides from './RiderRides';
import RiderRideTrip from './RiderRideTrip';
import RiderDelivery from './RiderDelivery';
import RiderHistory from './RiderHistory';
import RiderEarnings from './RiderEarnings';
import RiderProfile from './RiderProfile';

const TABS = [
  { id: 'requests', label: 'Requests', icon: Inbox },
  { id: 'delivery', label: 'Trip', icon: Navigation },
  { id: 'history', label: 'History', icon: History },
  { id: 'earnings', label: 'Earnings', icon: Wallet },
  { id: 'profile', label: 'Profile', icon: User }
];

export default function RiderApp({ rider, profile, onSwitchToShop, onExitToLanding }) {
  const [tab, setTab] = useState('requests');
  const [online, setOnline] = useState(Boolean(rider?.is_online));
  const [sunlight, setSunlight] = useState(false);
  const [trip, setTrip] = useState(null);
  const [ride, setRide] = useState(null);
  const [mode, setMode] = useState('deliveries');
  const [notice, setNotice] = useState('');
  const [togglingDuty, setTogglingDuty] = useState(false);

  // Resume a job that is already in progress (page refresh, new device, …).
  useEffect(() => {
    let alive = true;
    fetchActiveOrder()
      .then((res) => {
        if (alive && res.data) {
          setTrip(res.data);
          setTab('delivery');
        }
      })
      .catch(() => { /* the requests screen reports connection problems itself */ });
    fetchActiveRide()
      .then((res) => {
        if (alive && res.data) {
          setRide(res.data);
          setTab('delivery');
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // A passenger can choose this rider at any moment, so look for a new ride while online.
  useEffect(() => {
    if (!online || trip || ride) return undefined;
    let alive = true;
    const id = setInterval(() => {
      fetchActiveRide()
        .then((res) => {
          if (alive && res.data) {
            setRide(res.data);
            setTab('delivery');
            setNotice('');
          }
        })
        .catch(() => {});
    }, 6000);
    return () => { alive = false; clearInterval(id); };
  }, [online, trip, ride]);

  const changeDuty = useCallback(async (next) => {
    setNotice('');
    setTogglingDuty(true);
    try {
      await setRiderOnline(next);
      setOnline(next);
    } catch (err) {
      setNotice(err.message || 'Could not change your status.');
    } finally {
      setTogglingDuty(false);
    }
  }, []);

  const accept = async (request) => {
    const res = await acceptDispatch(request.orderId);
    setTrip({ ...request, ...res.data, pickedUp: false });
    setTab('delivery');
  };

  const vehicle = VEHICLE_TYPES.find((v) => v.value === rider?.vehicle_type);
  const firstName = (profile?.full_name || 'Rider').split(' ')[0];

  return (
    <div className={`rider-root ${sunlight ? 'sunlight-mode' : ''}`}>
      <header className="rider-top-bar" role="banner">
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--rider-text)' }}>{BRAND.name} Rider</h1>
          <span style={{ fontSize: 11.5, color: 'var(--rider-text-muted)' }}>
            {firstName} · {[vehicle?.label, rider?.corridor].filter(Boolean).join(' · ')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="rs-switch" onClick={onSwitchToShop} aria-label="Switch to shopping">
            <ShoppingBag size={14} /> Shop
          </button>
          <button
            type="button"
            className={`rider-sunlight-toggle ${sunlight ? 'active' : ''}`}
            onClick={() => setSunlight(!sunlight)}
            aria-label="Toggle high-contrast sunlight mode"
            aria-pressed={sunlight}
          >
            <Sun size={15} color={sunlight ? '#F59E0B' : '#737373'} />
          </button>
          <button
            type="button"
            className={`rider-duty-toggle ${online ? 'online' : ''}`}
            onClick={() => changeDuty(!online)}
            disabled={togglingDuty}
            aria-label={online ? 'Go offline' : 'Go online'}
            aria-pressed={online}
          >
            <span className="rider-duty-dot" />
            <span style={{ fontSize: 12, fontWeight: 800, color: online ? '#2B7CFF' : 'var(--rider-text-muted)' }}>
              {online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </button>
        </div>
      </header>

      <main id="rider-main-content">
        {notice && <div className="rs-page" style={{ paddingBottom: 0 }}><div className="rs-alert rs-alert-bad" role="alert">{notice}</div></div>}

        {tab === 'requests' && (
          <>
            <div className="rs-page" style={{ paddingBottom: 0 }}>
              <div className="rs-stat-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 0 }} role="tablist" aria-label="Request type">
                <button type="button" role="tab" aria-selected={mode === 'deliveries'} className={`rs-btn ${mode === 'deliveries' ? '' : 'rs-btn-ghost'}`} style={{ minHeight: 44 }} onClick={() => setMode('deliveries')}>Deliveries</button>
                <button type="button" role="tab" aria-selected={mode === 'rides'} className={`rs-btn ${mode === 'rides' ? '' : 'rs-btn-ghost'}`} style={{ minHeight: 44 }} onClick={() => setMode('rides')}>Rides</button>
              </div>
            </div>
            {mode === 'deliveries' ? (
              <RiderRequests
                online={online}
                hasActiveTrip={Boolean(trip || ride)}
                onGoOnline={() => changeDuty(true)}
                onAccepted={accept}
                onOpenDelivery={() => setTab('delivery')}
              />
            ) : (
              <RiderRides
                online={online}
                hasActiveJob={Boolean(trip || ride)}
                onGoOnline={() => changeDuty(true)}
                onOpenJob={() => setTab('delivery')}
              />
            )}
          </>
        )}

        {tab === 'delivery' && (
          ride ? (
            <RiderRideTrip ride={ride} onUpdated={setRide} onFinished={() => { setRide(null); setMode('rides'); setTab('requests'); }} />
          ) : trip ? (
            <RiderDelivery trip={trip} onTripUpdated={setTrip} onFinished={() => { setTrip(null); setTab('requests'); }} />
          ) : (
            <div className="rs-page rs-empty">
              <div className="rs-empty-icon"><Navigation size={28} /></div>
              <h2>No job in progress</h2>
              <p>Accept a delivery, or win a passenger ride, and it will appear here with the pickup and drop-off details.</p>
              <button type="button" className="rs-btn" onClick={() => setTab('requests')}>See requests</button>
            </div>
          )
        )}

        {tab === 'history' && <RiderHistory />}
        {tab === 'earnings' && <RiderEarnings />}
        {tab === 'profile' && (
          <RiderProfile profile={profile} rider={rider} onSwitchToShop={onSwitchToShop} onSignOut={onExitToLanding} />
        )}
      </main>

      <nav className="rider-bottom-nav" role="tablist" aria-label="Rider navigation">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`rider-nav-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <div style={{ position: 'relative' }}>
              <Icon size={20} />
              {id === 'delivery' && (trip || ride) && <span className="rider-nav-active-pip" />}
            </div>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
