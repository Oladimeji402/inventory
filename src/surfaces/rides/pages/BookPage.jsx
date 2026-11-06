import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, MapPin, Minus, Plus, Search } from 'lucide-react';
import { ACTIVE_STATUSES, VEHICLES, createRide, fetchMyRides, vehicleById } from '../../../services/rides';
import { naira } from '../../../lib/format';

/** datetime-local value (local time) for `minutes` from now. */
function localInput(minutes) {
  const d = new Date(Date.now() + minutes * 60000);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BookPage({ auth, navigate }) {
  const [vehicleId, setVehicleId] = useState('motorcycle');
  const vehicle = vehicleById(vehicleId);
  const [price, setPrice] = useState(vehicle.startPrice);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [when, setWhen] = useState('now');
  const [scheduledFor, setScheduledFor] = useState(() => localInput(60));
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState(auth.profile?.phone || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);

  useEffect(() => { if (!phone && auth.profile?.phone) setPhone(auth.profile.phone); }, [auth.profile, phone]);

  // a passenger can only have one live ride at a time, so point them at it
  useEffect(() => {
    if (!auth.user) return undefined;
    let alive = true;
    fetchMyRides(10)
      .then((res) => { if (alive) setActive(res.data.find((r) => ACTIVE_STATUSES.includes(r.status) && !r.scheduledFor) || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [auth.user]);

  const pickVehicle = (id) => {
    setVehicleId(id);
    setPrice(vehicleById(id).startPrice);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!auth.user) return navigate('/login?next=/');
    if (pickup.trim().length < 5) return setError('Enter your pickup address.');
    if (dropoff.trim().length < 5) return setError('Enter where you are going.');
    if (price < vehicle.minPrice) return setError(`The lowest offer for ${vehicle.label} is ${naira(vehicle.minPrice)}.`);
    if (!/^[+0-9\s()-]{7,20}$/.test(phone.trim())) return setError('Enter a phone number your rider can call.');
    let scheduledIso = null;
    if (when === 'later') {
      const date = new Date(scheduledFor);
      if (Number.isNaN(date.getTime()) || date.getTime() < Date.now() + 15 * 60000) return setError('Schedule your ride at least 15 minutes from now.');
      scheduledIso = date.toISOString();
    }
    setBusy(true);
    try {
      const res = await createRide({ vehicle: vehicleId, pickup, dropoff, price, note, scheduledFor: scheduledIso, phone });
      navigate(`/trips/${res.data.id}`);
    } catch (err) {
      setError(err.message || 'Could not post your ride. Please try again.');
      setBusy(false);
    }
  };

  const saved = (auth.addresses || []).slice(0, 4);

  return (
    <div className="sh-wrap sh-section" style={{ maxWidth: 560 }}>
      <h1 className="sh-h1">Where to?</h1>
      <p className="sh-sub">Name your price. Nearby verified riders offer, and you pick the one you like.</p>

      {active && (
        <div className="rd-banner">
          <span>You have a ride in progress.</span>
          <button type="button" onClick={() => navigate(`/trips/${active.id}`)}>View it</button>
        </div>
      )}

      <form onSubmit={submit}>
        {error && <div className="sh-alert sh-alert-bad" role="alert"><AlertCircle size={16} />{error}</div>}

        <div className="rd-vehicles" role="radiogroup" aria-label="Vehicle">
          {VEHICLES.map((v) => (
            <button key={v.id} type="button" role="radio" aria-checked={vehicleId === v.id} className={`rd-vehicle ${vehicleId === v.id ? 'active' : ''}`} onClick={() => pickVehicle(v.id)}>
              <span className="emoji" aria-hidden="true">{v.emoji}</span>
              <strong>{v.label}</strong>
              <span>from {naira(v.minPrice)}</span>
            </button>
          ))}
        </div>

        <div className="sh-card">
          <div className="rd-route">
            <div className="sh-field">
              <span className="rd-dot" aria-hidden="true" />
              <label htmlFor="rd-pickup">Pickup address</label>
              <input id="rd-pickup" className="sh-input" value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="House number, street, area" autoComplete="street-address" />
              {saved.length > 0 && (
                <div className="rd-saved" aria-label="Saved addresses for pickup">
                  {saved.map((a) => <button key={a.id} type="button" onClick={() => setPickup(a.address)}><MapPin size={11} style={{ verticalAlign: -1 }} /> {a.label}</button>)}
                </div>
              )}
            </div>
            <div className="sh-field" style={{ marginBottom: 0 }}>
              <span className="rd-dot drop" aria-hidden="true" />
              <label htmlFor="rd-dropoff">Drop-off address</label>
              <input id="rd-dropoff" className="sh-input" value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="Where are you going?" />
              {saved.length > 0 && (
                <div className="rd-saved" aria-label="Saved addresses for drop-off">
                  {saved.map((a) => <button key={a.id} type="button" onClick={() => setDropoff(a.address)}><MapPin size={11} style={{ verticalAlign: -1 }} /> {a.label}</button>)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sh-card">
          <div className="sh-row" style={{ marginBottom: 10 }}>
            <strong>Your offer</strong>
            <span className="sh-muted">Pay the rider in cash</span>
          </div>
          <div className="rd-price">
            <button type="button" aria-label="Lower the offer" disabled={price - vehicle.step < vehicle.minPrice} onClick={() => setPrice((p) => Math.max(vehicle.minPrice, p - vehicle.step))}><Minus size={18} /></button>
            <output aria-live="polite">{naira(price)}</output>
            <button type="button" aria-label="Raise the offer" onClick={() => setPrice((p) => Math.min(1000000, p + vehicle.step))}><Plus size={18} /></button>
          </div>
          <p className="sh-muted" style={{ margin: '10px 0 0', textAlign: 'center' }}>A fair offer gets accepted faster. You can raise it while you wait.</p>
        </div>

        <div className="sh-card">
          <div className="rd-when" role="radiogroup" aria-label="When">
            <button type="button" role="radio" aria-checked={when === 'now'} className={when === 'now' ? 'active' : ''} onClick={() => setWhen('now')}>Ride now</button>
            <button type="button" role="radio" aria-checked={when === 'later'} className={when === 'later' ? 'active' : ''} onClick={() => setWhen('later')}>Schedule</button>
          </div>
          {when === 'later' && (
            <div className="sh-field">
              <label htmlFor="rd-when">Pickup time</label>
              <input id="rd-when" className="sh-input" type="datetime-local" value={scheduledFor} min={localInput(15)} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>
          )}
          <div className="sh-grid-2">
            <div className="sh-field" style={{ marginBottom: 0 }}>
              <label htmlFor="rd-phone">Your phone</label>
              <input id="rd-phone" className="sh-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 000 0000" autoComplete="tel" />
            </div>
            <div className="sh-field" style={{ marginBottom: 0 }}>
              <label htmlFor="rd-note">Note for the rider (optional)</label>
              <input id="rd-note" className="sh-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Blue gate, call on arrival" />
            </div>
          </div>
        </div>

        <button type="submit" className="sh-btn" style={{ width: '100%', minHeight: 54, fontSize: '1rem' }} disabled={busy}>
          {busy ? <><Loader2 size={18} className="ad-spin" /> Posting…</> : <><Search size={18} /> {auth.user ? 'Find riders' : 'Sign in to book'}</>}
        </button>
      </form>
    </div>
  );
}
