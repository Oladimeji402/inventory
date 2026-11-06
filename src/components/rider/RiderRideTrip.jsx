import { useState } from 'react';
import { AlertCircle, Banknote, CheckCircle2, ExternalLink, MapPin, Phone, ShieldCheck } from 'lucide-react';
import RiderOtpKeypad from './RiderOtpKeypad';
import { completeRide, handBackRide, rideArrived, startRide } from '../../services/rider';
import { naira } from '../../lib/format';
import './RiderScreens.css';

const mapsLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
const at = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** The rider's current passenger ride: arrive, start with the passenger's code, complete. */
export default function RiderRideTrip({ ride, onUpdated, onFinished }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmHandBack, setConfirmHandBack] = useState(false);

  const stage = done ? 'done' : ride.status;

  const act = async (key, fn, next) => {
    setBusy(key);
    setError('');
    try {
      await fn();
      if (next) onUpdated({ ...ride, ...next });
    } catch (err) {
      setError(err.message || 'That did not work. Try again.');
    } finally {
      setBusy('');
    }
  };

  // Rejects (so the keypad shows the reason) unless the server accepts the passenger's code.
  const confirmCode = async (code) => {
    await startRide(ride.id, code);
    setShowCode(false);
    onUpdated({ ...ride, status: 'in_progress' });
  };

  const finish = async () => {
    setBusy('complete');
    setError('');
    try {
      await completeRide(ride.id);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not complete the trip.');
    } finally {
      setBusy('');
    }
  };

  const steps = ['assigned', 'arrived', 'in_progress'];
  return (
    <div className="rs-page">
      <div className="rs-row">
        <h1 className="rs-title">{stage === 'done' ? 'Trip complete' : 'Current ride'}</h1>
        <span className="rs-badge rs-badge-ok">{naira(ride.agreedPrice)} cash</span>
      </div>
      <p className="rs-sub">{ride.passengerName}{ride.scheduledFor ? ` · scheduled ${at(ride.scheduledFor)}` : ''}</p>

      <div className="rs-steps" aria-hidden="true">
        {steps.map((s, i) => (
          <span key={s} className={`rs-step ${stage === 'done' || steps.indexOf(stage) > i ? 'done' : steps.indexOf(stage) === i ? 'now' : ''}`} />
        ))}
      </div>

      {error && <div className="rs-alert rs-alert-bad" role="alert"><AlertCircle size={16} />{error}</div>}

      {stage === 'done' ? (
        <div className="rs-card rs-empty">
          <div className="rs-empty-icon" style={{ background: 'rgba(16,185,129,.14)', color: '#047857' }}><CheckCircle2 size={30} /></div>
          <h2>Collect {naira(ride.agreedPrice)}</h2>
          <p>The passenger pays you in cash. Thanks for the ride.</p>
          <button type="button" className="rs-btn" onClick={onFinished}>Back to requests</button>
        </div>
      ) : (
        <>
          <section className={`rs-stop-card ${stage === 'assigned' || stage === 'arrived' ? 'active' : 'past'}`}>
            <div className="rs-stop"><span className="rs-stop-dot pickup"><MapPin size={16} /></span>
              <div><div className="rs-label">Pickup</div><strong>{ride.passengerName}</strong><span>{ride.pickup}</span></div></div>
            <div className="rs-actions">
              <a href={`tel:${ride.passengerPhone}`}><Phone size={15} /> Call passenger</a>
              <a href={mapsLink(ride.pickup)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Directions</a>
            </div>
            {ride.note && <p className="rs-muted" style={{ margin: '10px 0 0' }}>Note: {ride.note}</p>}
          </section>

          <section className={`rs-stop-card ${stage === 'in_progress' ? 'active' : ''}`}>
            <div className="rs-stop"><span className="rs-stop-dot drop"><MapPin size={16} /></span>
              <div><div className="rs-label">Drop-off</div><strong>Destination</strong><span>{ride.dropoff}</span></div></div>
            <div className="rs-actions"><a href={mapsLink(ride.dropoff)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Directions</a></div>
          </section>

          {stage === 'assigned' && (
            <button type="button" className="rs-btn" disabled={Boolean(busy)} onClick={() => act('arrive', () => rideArrived(ride.id), { status: 'arrived' })}>
              {busy === 'arrive' ? 'Confirming…' : "I've arrived at the pickup"}
            </button>
          )}
          {stage === 'arrived' && (
            <>
              <div className="rs-alert rs-alert-info"><ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 2 }} /><span>The passenger has a 4-digit code on their screen. Ask for it to start the trip.</span></div>
              <button type="button" className="rs-btn rs-btn-green" onClick={() => setShowCode(true)}>Enter the passenger&apos;s code</button>
            </>
          )}
          {stage === 'in_progress' && (
            <button type="button" className="rs-btn rs-btn-green" disabled={Boolean(busy)} onClick={finish}>
              <Banknote size={18} /> {busy === 'complete' ? 'Completing…' : `Complete trip · collect ${naira(ride.agreedPrice)}`}
            </button>
          )}

          {(stage === 'assigned' || stage === 'arrived') && (
            confirmHandBack ? (
              <div className="rs-card" style={{ marginTop: 12 }}>
                <p style={{ margin: '0 0 10px', fontWeight: 700 }}>Hand this ride back? It returns to the passenger&apos;s list.</p>
                <div className="rs-actions" style={{ marginTop: 0 }}>
                  <button type="button" className="rs-btn rs-btn-ghost" disabled={Boolean(busy)} onClick={async () => { await act('back', () => handBackRide(ride.id, 'Rider could not make it')); onFinished(); }}>Yes, hand back</button>
                  <button type="button" className="rs-btn rs-btn-ghost" onClick={() => setConfirmHandBack(false)}>Keep it</button>
                </div>
              </div>
            ) : (
              <button type="button" className="rs-btn rs-btn-ghost" style={{ marginTop: 12 }} onClick={() => setConfirmHandBack(true)}>I can&apos;t make this ride</button>
            )
          )}
        </>
      )}

      {showCode && (
        <div className="rider-otp-backdrop" role="dialog" aria-modal="true">
          <div className="rider-otp-sheet"><RiderOtpKeypad onVerified={confirmCode} onCancel={() => setShowCode(false)} /></div>
        </div>
      )}
    </div>
  );
}
