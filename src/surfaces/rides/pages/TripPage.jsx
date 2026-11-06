import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, Clock, Loader2, Minus, Phone, Plus, ShieldCheck, Star, X } from 'lucide-react';
import { acceptRideBid, cancelRide, fetchMyRide, rateRide, updateRideOffer, vehicleById } from '../../../services/rides';
import { naira } from '../../../lib/format';
import { RIDE_STATUS } from './TripsPage';

const POLL_MS = 4000;
const LIVE = ['open', 'assigned', 'arrived', 'in_progress'];

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function Stars({ value, onChange, readOnly }) {
  return (
    <span className="rd-stars" role={readOnly ? 'img' : 'radiogroup'} aria-label={readOnly ? `${value} out of 5` : 'Rating'}>
      {[1, 2, 3, 4, 5].map((n) => (
        readOnly
          ? <span key={n} style={{ color: n <= value ? '#f59e0b' : '#cbd5e1', fontSize: '1.4rem' }}>★</span>
          : <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} className={n <= value ? 'on' : ''} onClick={() => onChange(n)}>★</button>
      ))}
    </span>
  );
}

function Steps({ ride }) {
  const steps = [
    { label: 'Ride requested', at: ride.createdAt, done: true },
    { label: ride.rider ? `${ride.rider.name} accepted` : 'Choose a rider', at: ride.acceptedAt, done: Boolean(ride.acceptedAt) },
    { label: 'Rider arrived at pickup', at: ride.arrivedAt, done: Boolean(ride.arrivedAt) },
    { label: 'Trip started', at: ride.startedAt, done: Boolean(ride.startedAt) },
    { label: 'Arrived at destination', at: ride.completedAt, done: ride.status === 'completed' }
  ];
  const firstOpen = steps.findIndex((s) => !s.done);
  return (
    <ul className="sh-track">
      {steps.map((s, i) => (
        <li key={s.label} className={s.done ? 'done' : i === firstOpen ? 'now' : ''}>
          <span className="dot">{s.done ? <Check size={13} /> : null}</span>
          <div><strong>{s.label}</strong>{s.at && <span className="sh-muted">{when(s.at)}</span>}</div>
        </li>
      ))}
    </ul>
  );
}

function RiderCard({ rider, vehicleLabel, showCall }) {
  if (!rider) return null;
  return (
    <div className="sh-card">
      <h2>Your rider</h2>
      <div className="sh-row">
        <div>
          <strong>{rider.name}</strong>
          <div className="sh-muted">{[vehicleLabel, rider.makeModel].filter(Boolean).join(' · ')}</div>
          {rider.plate && <div className="sh-mono" style={{ fontWeight: 700, marginTop: 2 }}>{rider.plate}</div>}
        </div>
        {showCall && rider.phone && <a className="sh-btn sh-btn-ghost sh-btn-sm" href={`tel:${rider.phone}`}><Phone size={14} /> Call</a>}
      </div>
    </div>
  );
}

export default function TripPage({ auth, navigate, rideId }) {
  const [ride, setRide] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState('');
  const [offer, setOffer] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchMyRide(rideId);
      if (!alive.current) return;
      setRide(res.data);
      setOffer((current) => current ?? res.data.offeredPrice);
      setError('');
    } catch (err) {
      if (alive.current) setError(err.message);
    }
  }, [rideId]);

  useEffect(() => {
    alive.current = true;
    if (!auth.user) return undefined;
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    return () => { alive.current = false; clearInterval(id); };
  }, [auth.user, load]);

  useEffect(() => { if (ride?.offeredPrice) setOffer(ride.offeredPrice); }, [ride?.offeredPrice]);

  const run = async (key, fn) => {
    setBusy(key);
    setActionError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setActionError(err.message || 'That did not work. Please try again.');
    } finally {
      setBusy('');
    }
  };

  if (!auth.user) {
    return <div className="sh-wrap sh-section"><div className="sh-empty"><strong>Sign in to see this trip</strong>
      <div><button type="button" className="sh-btn" style={{ marginTop: 14 }} onClick={() => navigate(`/login?next=/trips/${rideId}`)}>Sign in</button></div></div></div>;
  }

  const vehicle = ride ? vehicleById(ride.vehicleType) : null;
  const st = ride ? RIDE_STATUS[ride.status] || { label: ride.status, tone: 'idle' } : null;
  const live = ride && LIVE.includes(ride.status);
  const step = vehicle?.step || 100;

  return (
    <div className="sh-wrap sh-section" style={{ maxWidth: 560 }}>
      <button type="button" className="sh-nav-link" onClick={() => navigate('/trips')} style={{ paddingLeft: 0 }}><ArrowLeft size={15} /> All trips</button>
      {error && <div className="sh-alert sh-alert-bad" role="alert"><AlertCircle size={16} />{error}</div>}
      {!ride && !error && <div className="sh-skel" style={{ height: 260, marginTop: 10 }} />}

      {ride && (
        <>
          <div className="sh-row" style={{ margin: '8px 0 16px' }}>
            <h1 className="sh-h1" style={{ margin: 0 }}>{vehicle.emoji} {vehicle.label}</h1>
            <span className={`sh-badge sh-badge-${st.tone}`}>{st.label}</span>
          </div>
          {actionError && <div className="sh-alert sh-alert-bad" role="alert"><AlertCircle size={16} />{actionError}</div>}

          {ride.startOtp && (
            <div className="sh-otp"><span>Show this code to your rider at pickup</span><b>{ride.startOtp}</b><span><ShieldCheck size={13} style={{ verticalAlign: -2 }} /> The trip starts once they enter it</span></div>
          )}

          <div className="sh-card">
            <div className="rd-stop"><span className="rd-dot" style={{ position: 'static', marginTop: 4, flexShrink: 0 }} /><div><b>Pickup</b>{ride.pickup}</div></div>
            <div className="rd-stop"><span className="rd-dot drop" style={{ position: 'static', marginTop: 4, flexShrink: 0 }} /><div><b>Drop-off</b>{ride.dropoff}</div></div>
            {ride.note && <p className="sh-muted" style={{ margin: '8px 0 0' }}>Note: {ride.note}</p>}
            {ride.scheduledFor && ride.status === 'open' && <p className="sh-muted" style={{ margin: '8px 0 0' }}><Clock size={13} style={{ verticalAlign: -2 }} /> Scheduled for {when(ride.scheduledFor)}</p>}
          </div>

          {ride.status === 'open' && (
            <>
              <div className="sh-card">
                <div className="rd-radar"><div className="rd-radar-ring" aria-hidden="true">{vehicle.emoji}</div></div>
                <h2 style={{ textAlign: 'center' }}>{ride.bids.length === 0 ? 'Waiting for riders…' : `${ride.bids.length} offer${ride.bids.length === 1 ? '' : 's'} so far`}</h2>
                <p className="sh-muted" style={{ textAlign: 'center', margin: '0 0 12px' }}>
                  {ride.bids.length === 0 ? 'Nearby riders can see your request. Offers appear here as they come in.' : 'Pick the offer you like. Cheaper offers are listed first.'}
                </p>
                {ride.bids.map((bid) => (
                  <div key={bid.id} className="rd-bid">
                    <div>
                      <strong>{bid.rider.name}</strong>
                      {bid.rider.ratingCount > 0 && <span className="rd-star-mini"> ★ {bid.rider.rating}</span>}
                      <div className="sh-muted">{[bid.rider.makeModel, bid.rider.plate].filter(Boolean).join(' · ') || vehicle.label}</div>
                      <div className="sh-muted">{bid.etaMinutes} min away · {bid.rider.trips} trip{bid.rider.trips === 1 ? '' : 's'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="sh-money" style={{ fontSize: '1.15rem' }}>{naira(bid.price)}</div>
                      <button type="button" className="sh-btn sh-btn-sm" style={{ marginTop: 6 }} disabled={Boolean(busy)} onClick={() => run(`bid-${bid.id}`, () => acceptRideBid(bid.id))}>
                        {busy === `bid-${bid.id}` ? <Loader2 size={14} className="ad-spin" /> : 'Accept'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sh-card">
                <h2>Not getting offers?</h2>
                <div className="rd-price" style={{ marginBottom: 10 }}>
                  <button type="button" aria-label="Lower the offer" disabled={offer - step < ride.minPrice} onClick={() => setOffer((p) => Math.max(ride.minPrice, p - step))}><Minus size={18} /></button>
                  <output>{naira(offer)}</output>
                  <button type="button" aria-label="Raise the offer" onClick={() => setOffer((p) => p + step)}><Plus size={18} /></button>
                </div>
                <button type="button" className="sh-btn sh-btn-ghost" style={{ width: '100%' }} disabled={Boolean(busy) || offer === ride.offeredPrice} onClick={() => run('offer', () => updateRideOffer(ride.id, offer))}>
                  {busy === 'offer' ? 'Updating…' : offer === ride.offeredPrice ? 'Your current offer' : 'Update my offer'}
                </button>
              </div>
            </>
          )}

          {['assigned', 'arrived', 'in_progress'].includes(ride.status) && (
            <>
              <div className="sh-alert sh-alert-info">
                {ride.status === 'assigned' && `${ride.rider?.name || 'Your rider'} is on the way to your pickup.`}
                {ride.status === 'arrived' && `${ride.rider?.name || 'Your rider'} has arrived. Give them the code above to start.`}
                {ride.status === 'in_progress' && 'You are on your trip. Enjoy the ride.'}
              </div>
              <RiderCard rider={ride.rider} vehicleLabel={vehicle.label} showCall={ride.status !== 'completed'} />
              <div className="sh-card"><div className="sh-row"><div><h2 style={{ margin: 0 }}>Fare</h2><span className="sh-muted">Pay the rider in cash at the end of the trip</span></div><span className="sh-money" style={{ fontSize: '1.4rem' }}>{naira(ride.agreedPrice)}</span></div></div>
            </>
          )}

          {ride.status === 'completed' && (
            <>
              <div className="sh-alert sh-alert-ok">Trip complete. Please pay {naira(ride.agreedPrice)} in cash to {ride.rider?.name || 'your rider'} if you have not already.</div>
              <RiderCard rider={ride.rider} vehicleLabel={vehicle.label} showCall={false} />
              <div className="sh-card">
                <h2>{ride.rating ? 'Your rating' : 'How was your ride?'}</h2>
                {ride.rating ? (
                  <><Stars value={ride.rating} readOnly />{ride.ratingComment && <p className="sh-muted" style={{ margin: '8px 0 0' }}>{ride.ratingComment}</p>}</>
                ) : (
                  <>
                    <Stars value={rating} onChange={setRating} />
                    <div className="sh-field" style={{ marginTop: 12 }}>
                      <label htmlFor="rd-comment">Comment (optional)</label>
                      <input id="rd-comment" className="sh-input" value={comment} maxLength={400} onChange={(e) => setComment(e.target.value)} placeholder="Anything we should know?" />
                    </div>
                    <button type="button" className="sh-btn" disabled={!rating || Boolean(busy)} onClick={() => run('rate', () => rateRide(ride.id, rating, comment))}>{busy === 'rate' ? 'Saving…' : 'Submit rating'}</button>
                  </>
                )}
              </div>
            </>
          )}

          {ride.status === 'cancelled' && (
            <div className="sh-alert sh-alert-bad"><X size={16} style={{ flexShrink: 0 }} />
              <span>This ride was cancelled{ride.cancelledBy === 'admin' ? ' by Subtech support' : ride.cancelledBy === 'rider' ? ' by the rider' : ''}.{ride.cancelReason ? ` Reason: ${ride.cancelReason}` : ''}</span></div>
          )}

          {ride.status === 'expired' && (
            <div className="sh-empty" style={{ padding: '30px 10px' }}>
              <Star size={30} /><strong>No rider accepted in time</strong>
              Try again with a slightly higher offer, or a different vehicle.
              <div><button type="button" className="sh-btn" style={{ marginTop: 14 }} onClick={() => navigate('/')}>Book again</button></div>
            </div>
          )}

          {ride.status !== 'cancelled' && ride.status !== 'expired' && (
            <div className="sh-card"><h2>Progress {live && <span className="sh-live" style={{ marginLeft: 8 }}><i />Live</span>}</h2><Steps ride={ride} /></div>
          )}

          {['open', 'assigned', 'arrived'].includes(ride.status) && (
            confirmCancel ? (
              <div className="sh-card">
                <p style={{ margin: '0 0 12px', fontWeight: 600 }}>Cancel this ride?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="sh-btn sh-btn-danger sh-btn-sm" disabled={Boolean(busy)} onClick={() => run('cancel', async () => { await cancelRide(ride.id); setConfirmCancel(false); })}>{busy === 'cancel' ? 'Cancelling…' : 'Yes, cancel'}</button>
                  <button type="button" className="sh-btn sh-btn-ghost sh-btn-sm" onClick={() => setConfirmCancel(false)}>Keep my ride</button>
                </div>
              </div>
            ) : (
              <button type="button" className="sh-btn sh-btn-danger" style={{ width: '100%' }} onClick={() => setConfirmCancel(true)}>Cancel ride</button>
            )
          )}
          {live && <p className="sh-live" style={{ marginTop: 14 }}><i /> This page updates automatically.</p>}
        </>
      )}
    </div>
  );
}
