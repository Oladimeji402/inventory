import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bike, Clock, Loader2, MapPin, Minus, Plus, PowerOff, RefreshCw } from 'lucide-react';
import { bidOnRide, fetchOpenRides, withdrawRideBid } from '../../services/rider';
import { naira } from '../../lib/format';
import './RiderScreens.css';

const POLL_MS = 8000;
const ETAS = [5, 10, 15, 20, 30];

const ago = (iso) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  return mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)}h ago`;
};
const at = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function RideCard({ ride, busy, onBid, onWithdraw }) {
  const [price, setPrice] = useState(ride.myBid?.price ?? ride.offeredPrice);
  const [eta, setEta] = useState(ride.myBid?.etaMinutes ?? 10);
  const [open, setOpen] = useState(false);
  const step = ride.minPrice >= 800 ? 200 : 100;
  const pending = ride.myBid?.status === 'pending';
  const lost = ride.myBid?.status === 'rejected';

  return (
    <article className="rs-card">
      <div className="rs-req-head">
        <div>
          <div className="rs-label">{ride.scheduledFor ? `Scheduled ${at(ride.scheduledFor)}` : `Posted ${ago(ride.createdAt)}`}</div>
          <div className="rs-strong" style={{ marginTop: 2 }}>{ride.passengerName}</div>
        </div>
        <div className="rs-req-earn">
          <div className="rs-label">Offer</div>
          <b className="rs-money">{naira(ride.offeredPrice)}</b>
        </div>
      </div>
      <div className="rs-route">
        <div className="rs-stop"><span className="rs-stop-dot pickup"><MapPin size={16} /></span><div><strong>Pickup</strong><span>{ride.pickup}</span></div></div>
        <div className="rs-stop"><span className="rs-stop-dot drop"><MapPin size={16} /></span><div><strong>Drop-off</strong><span>{ride.dropoff}</span></div></div>
      </div>
      {ride.note && <p className="rs-muted" style={{ margin: '0 0 12px' }}>Note: {ride.note}</p>}
      <div className="rs-muted" style={{ marginBottom: 12 }}>{ride.bidCount} offer{ride.bidCount === 1 ? '' : 's'} so far · cash payment</div>

      {lost && <div className="rs-alert rs-alert-info">The passenger chose another rider.</div>}
      {pending && !open && (
        <div className="rs-alert rs-alert-ok" role="status">Your offer of {naira(ride.myBid.price)} ({ride.myBid.etaMinutes} min away) is waiting for the passenger.</div>
      )}

      {!open ? (
        <div className="rs-actions" style={{ marginTop: 0 }}>
          {!pending && !lost && (
            <button type="button" className="rs-btn" style={{ minHeight: 50 }} disabled={busy} onClick={() => onBid(ride, ride.offeredPrice, 10)}>
              {busy ? 'Sending…' : `Accept ${naira(ride.offeredPrice)}`}
            </button>
          )}
          <button type="button" className="rs-btn rs-btn-ghost" style={{ minHeight: 50 }} onClick={() => setOpen(true)}>{pending ? 'Change offer' : 'Counter-offer'}</button>
          {pending && <button type="button" className="rs-btn rs-btn-ghost" style={{ minHeight: 50 }} disabled={busy} onClick={() => onWithdraw(ride)}>Withdraw</button>}
        </div>
      ) : (
        <div>
          <div className="rs-field"><label>Your price</label>
            <div className="rs-row" style={{ justifyContent: 'center', gap: 16 }}>
              <button type="button" className="rs-switch" aria-label="Lower price" disabled={price - step < ride.minPrice} onClick={() => setPrice((p) => Math.max(ride.minPrice, p - step))}><Minus size={16} /></button>
              <span className="rs-money" style={{ fontSize: '1.7rem' }}>{naira(price)}</span>
              <button type="button" className="rs-switch" aria-label="Raise price" onClick={() => setPrice((p) => p + step)}><Plus size={16} /></button>
            </div>
          </div>
          <div className="rs-field"><label htmlFor={`eta-${ride.id}`}>How soon can you reach the pickup?</label>
            <select id={`eta-${ride.id}`} value={eta} onChange={(e) => setEta(Number(e.target.value))}>{ETAS.map((m) => <option key={m} value={m}>{m} minutes</option>)}</select>
          </div>
          <div className="rs-actions">
            <button type="button" className="rs-btn" style={{ minHeight: 50 }} disabled={busy} onClick={async () => { await onBid(ride, price, eta); setOpen(false); }}>{busy ? 'Sending…' : `Send ${naira(price)}`}</button>
            <button type="button" className="rs-btn rs-btn-ghost" style={{ minHeight: 50 }} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </article>
  );
}

/** Open passenger ride requests for the rider's vehicle. Accept the offered price or counter. */
export default function RiderRides({ online, hasActiveJob, onGoOnline, onOpenJob }) {
  const [rides, setRides] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetchOpenRides();
      if (alive.current) { setRides(res.data); setError(''); }
    } catch (err) {
      if (alive.current) setError(err.message || 'Could not load ride requests.');
    } finally {
      if (alive.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!online || hasActiveJob) return undefined;
    load();
    const id = setInterval(load, POLL_MS);
    return () => { alive.current = false; clearInterval(id); };
  }, [online, hasActiveJob, load]);

  const run = async (ride, fn) => {
    setBusyId(ride.id);
    setActionError('');
    try { await fn(); await load(); } catch (err) { setActionError(err.message || 'That did not work.'); load(); } finally { setBusyId(''); }
  };

  if (hasActiveJob) {
    return (
      <div className="rs-page rs-empty">
        <div className="rs-empty-icon"><Bike size={28} /></div>
        <h2>You are on a job</h2>
        <p>Finish your current job before taking another.</p>
        <button type="button" className="rs-btn" onClick={onOpenJob}>Open my job</button>
      </div>
    );
  }
  if (!online) {
    return (
      <div className="rs-page rs-empty">
        <div className="rs-empty-icon"><PowerOff size={28} /></div>
        <h2>You are offline</h2>
        <p>Go online to see passengers looking for a ride.</p>
        <button type="button" className="rs-btn" onClick={onGoOnline}>Go online</button>
      </div>
    );
  }

  return (
    <div className="rs-page" style={{ paddingTop: 0 }}>
      <div className="rs-row">
        <p className="rs-sub" style={{ margin: 0 }}>Passengers near you. Accept their price or name your own.</p>
        <button type="button" className="rs-switch" onClick={() => load(true)} disabled={refreshing} aria-label="Refresh ride requests"><RefreshCw size={14} className={refreshing ? 'rs-spin' : ''} /></button>
      </div>
      <div style={{ height: 12 }} />
      {(actionError || error) && <div className="rs-alert rs-alert-bad" role="alert"><AlertCircle size={16} />{actionError || error}</div>}
      {rides === null ? (
        <div className="rs-skel" style={{ height: 200 }} />
      ) : rides.length === 0 ? (
        <div className="rs-card rs-empty">
          <div className="rs-empty-icon"><Clock size={28} /></div>
          <h2>No ride requests right now</h2>
          <p>Only passengers asking for your type of vehicle appear here. Stay online.</p>
        </div>
      ) : rides.map((ride) => (
        <RideCard
          key={ride.id}
          ride={ride}
          busy={busyId === ride.id}
          onBid={(r, price, eta) => run(r, () => bidOnRide(r.id, price, eta))}
          onWithdraw={(r) => run(r, () => withdrawRideBid(r.id))}
        />
      ))}
      {busyId && <Loader2 className="rs-spin" size={0} />}
    </div>
  );
}
