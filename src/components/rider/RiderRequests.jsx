import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bike, Loader2, MapPin, PowerOff, RefreshCw, Store } from 'lucide-react';
import { acceptDispatch, fetchAvailableDispatches } from '../../services/rider';
import { naira } from '../../lib/format';
import './RiderScreens.css';

const POLL_MS = 15000;

function ago(iso) {
  if (!iso) return '';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

/** Open delivery requests near the rider. Refreshes on its own while online. */
export default function RiderRequests({ online, hasActiveTrip, onGoOnline, onAccepted, onOpenDelivery }) {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetchAvailableDispatches();
      if (!alive.current) return;
      setRequests(res.data);
      setError('');
    } catch (err) {
      if (alive.current) setError(err.message || 'Could not load delivery requests.');
    } finally {
      if (alive.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!online || hasActiveTrip) return undefined;
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
  }, [online, hasActiveTrip, load]);

  const accept = async (request) => {
    setBusyId(request.orderId);
    setActionError('');
    try {
      await onAccepted(request);
    } catch (err) {
      setActionError(err.message || 'Could not accept this delivery. It may have been taken.');
      load();
    } finally {
      setBusyId('');
    }
  };

  if (hasActiveTrip) {
    return (
      <div className="rs-page rs-empty">
        <div className="rs-empty-icon"><Bike size={28} /></div>
        <h2>You are on a job</h2>
        <p>Finish your current job before taking another one.</p>
        <button type="button" className="rs-btn" onClick={onOpenDelivery}>Open my job</button>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="rs-page rs-empty">
        <div className="rs-empty-icon"><PowerOff size={28} /></div>
        <h2>You are offline</h2>
        <p>Go online to see delivery requests from stores in your area.</p>
        <button type="button" className="rs-btn" onClick={onGoOnline}>Go online</button>
      </div>
    );
  }

  return (
    <div className="rs-page">
      <div className="rs-row">
        <h1 className="rs-title"><span className="rs-pulse" />Delivery requests</h1>
        <button type="button" className="rs-switch" onClick={() => load(true)} disabled={refreshing} aria-label="Refresh requests">
          <RefreshCw size={14} className={refreshing ? 'rs-spin' : ''} /> Refresh
        </button>
      </div>
      <p className="rs-sub">Paid orders waiting for a rider. Updates every few seconds.</p>

      {(actionError || error) && <div className="rs-alert rs-alert-bad" role="alert"><AlertCircle size={16} />{actionError || error}</div>}

      {requests === null ? (
        <>
          <div className="rs-skel" style={{ height: 170, marginBottom: 12 }} />
          <div className="rs-skel" style={{ height: 170 }} />
        </>
      ) : requests.length === 0 ? (
        <div className="rs-card rs-empty">
          <div className="rs-empty-icon"><Bike size={28} /></div>
          <h2>No requests right now</h2>
          <p>Stay online. New deliveries appear here as soon as customers pay.</p>
        </div>
      ) : (
        requests.map((request) => (
          <article key={request.orderId} className="rs-card">
            <div className="rs-req-head">
              <div>
                <div className="rs-label">Placed {ago(request.createdAt)}</div>
                <div className="rs-strong" style={{ marginTop: 2 }}>{request.itemsSummary}</div>
              </div>
              <div className="rs-req-earn">
                <div className="rs-label">You earn</div>
                <b className="rs-money">{naira(Number(request.fare) + Number(request.tip || 0))}</b>
              </div>
            </div>
            <div className="rs-route">
              <div className="rs-stop">
                <span className="rs-stop-dot pickup"><Store size={16} /></span>
                <div><strong>{request.storeName}</strong><span>{request.storeAddress}</span></div>
              </div>
              <div className="rs-stop">
                <span className="rs-stop-dot drop"><MapPin size={16} /></span>
                <div><strong>Deliver to {request.customerName}</strong><span>{request.customerAddress}</span></div>
              </div>
            </div>
            <button type="button" className="rs-btn" disabled={Boolean(busyId)} onClick={() => accept(request)}>
              {busyId === request.orderId ? <><Loader2 size={18} className="rs-spin" /> Accepting…</> : 'Accept delivery'}
            </button>
          </article>
        ))
      )}
    </div>
  );
}
