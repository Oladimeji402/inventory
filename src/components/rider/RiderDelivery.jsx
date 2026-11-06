import { useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, MapPin, Package, Phone, ShieldCheck, Store } from 'lucide-react';
import RiderOtpKeypad from './RiderOtpKeypad';
import { pickUpOrder, verifyDelivery } from '../../services/rider';
import { naira } from '../../lib/format';
import './RiderScreens.css';

const mapsLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;

/**
 * The rider's current delivery: go to the store, confirm pickup, deliver and enter the
 * customer's 4-digit code. Every step is confirmed by the server.
 */
export default function RiderDelivery({ trip, onTripUpdated, onFinished }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [delivered, setDelivered] = useState(false);

  const stage = delivered ? 'done' : trip.pickedUp ? 'deliver' : 'pickup';
  const earn = Number(trip.fare || 0) + Number(trip.tip || 0);

  const confirmPickup = async () => {
    setBusy(true);
    setError('');
    try {
      await pickUpOrder(trip.orderId);
      onTripUpdated({ ...trip, pickedUp: true });
    } catch (err) {
      setError(err.message || 'Could not confirm pickup. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Rejects (so the keypad shows the reason) unless the server accepts the code.
  const confirmCode = async (code) => {
    await verifyDelivery(trip.orderId, code);
    setShowCode(false);
    setDelivered(true);
  };

  return (
    <div className="rs-page">
      <div className="rs-row">
        <h1 className="rs-title">{stage === 'done' ? 'Delivered' : 'Current delivery'}</h1>
        <span className="rs-badge rs-badge-ok">{naira(earn)}</span>
      </div>
      <p className="rs-sub">{trip.itemsSummary}</p>

      <div className="rs-steps" aria-hidden="true">
        <span className={`rs-step ${stage === 'pickup' ? 'now' : 'done'}`} />
        <span className={`rs-step ${stage === 'deliver' ? 'now' : stage === 'done' ? 'done' : ''}`} />
        <span className={`rs-step ${stage === 'done' ? 'done' : ''}`} />
      </div>

      {error && <div className="rs-alert rs-alert-bad" role="alert"><AlertCircle size={16} />{error}</div>}

      {stage === 'done' ? (
        <div className="rs-card rs-empty">
          <div className="rs-empty-icon" style={{ background: 'rgba(16,185,129,.14)', color: '#047857' }}><CheckCircle2 size={30} /></div>
          <h2>Delivery complete</h2>
          <p>{naira(earn)} was added to your available balance.</p>
          <button type="button" className="rs-btn" onClick={onFinished}>Back to requests</button>
        </div>
      ) : (
        <>
          <section className={`rs-stop-card ${stage === 'pickup' ? 'active' : 'past'}`}>
            <div className="rs-stop">
              <span className="rs-stop-dot pickup"><Store size={16} /></span>
              <div>
                <div className="rs-label">1 · Pick up</div>
                <strong>{trip.storeName}</strong>
                <span>{trip.storeAddress}</span>
              </div>
            </div>
            <div className="rs-actions">
              {trip.storePhone && <a href={`tel:${trip.storePhone}`}><Phone size={15} /> Call store</a>}
              <a href={mapsLink(trip.storeAddress)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Directions</a>
            </div>
          </section>

          <section className={`rs-stop-card ${stage === 'deliver' ? 'active' : ''}`}>
            <div className="rs-stop">
              <span className="rs-stop-dot drop"><MapPin size={16} /></span>
              <div>
                <div className="rs-label">2 · Deliver</div>
                <strong>{trip.customerName}</strong>
                <span>{trip.customerAddress}</span>
              </div>
            </div>
            <div className="rs-actions">
              {trip.customerPhone && <a href={`tel:${trip.customerPhone}`}><Phone size={15} /> Call customer</a>}
              <a href={mapsLink(trip.customerAddress)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Directions</a>
            </div>
          </section>

          <div className="rs-alert rs-alert-info">
            <Package size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{trip.itemsSummary}</span>
          </div>

          {stage === 'pickup' ? (
            <button type="button" className="rs-btn" disabled={busy} onClick={confirmPickup}>
              {busy ? 'Confirming…' : "I've picked up the order"}
            </button>
          ) : (
            <>
              <div className="rs-alert rs-alert-info">
                <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>The customer has a 4-digit code on their order page. Ask for it when you hand over the order.</span>
              </div>
              <button type="button" className="rs-btn rs-btn-green" onClick={() => setShowCode(true)}>
                Enter the customer&apos;s code
              </button>
            </>
          )}
        </>
      )}

      {showCode && (
        <div className="rider-otp-backdrop" role="dialog" aria-modal="true">
          <div className="rider-otp-sheet">
            <RiderOtpKeypad onVerified={confirmCode} onCancel={() => setShowCode(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
