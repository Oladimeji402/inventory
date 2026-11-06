import { History } from 'lucide-react';
import { useState } from 'react';
import { fetchHistory, fetchRideHistory } from '../../services/rider';
import { useAsync } from '../../hooks/useAsync';
import { naira } from '../../lib/format';
import './RiderScreens.css';

function when(iso) {
  return iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
}

function RideHistory() {
  const { data, error, loading } = useAsync(fetchRideHistory, []);
  const rides = data || [];
  const total = rides.reduce((sum, r) => sum + Number(r.price), 0);
  return (
    <>
      <p className="rs-sub">Completed passenger rides. Fares are paid to you in cash.</p>
      {error && <div className="rs-alert rs-alert-bad" role="alert">{error}</div>}
      {loading && !data ? <div className="rs-skel" style={{ height: 160 }} /> : rides.length === 0 ? (
        <div className="rs-card rs-empty"><div className="rs-empty-icon"><History size={28} /></div><h2>No rides yet</h2><p>Completed passenger rides will show up here.</p></div>
      ) : (
        <>
          <div className="rs-stat-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="rs-stat"><span className="rs-label">Rides</span><b>{rides.length}</b></div>
            <div className="rs-stat"><span className="rs-label">Fares collected</span><b>{naira(total)}</b></div>
          </div>
          <div className="rs-card" style={{ padding: '4px 16px' }}>
            {rides.map((r) => (
              <div className="rs-list-item" key={r.id}>
                <div>
                  <div className="rs-strong">{r.passengerName}</div>
                  <div className="rs-muted">{r.pickup} → {r.dropoff}</div>
                  <div className="rs-muted">{when(r.completedAt)}{r.rating ? ` · ${'★'.repeat(r.rating)}` : ''}</div>
                </div>
                <div className="rs-money" style={{ textAlign: 'right' }}>{naira(r.price)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function RiderHistory() {
  const [kind, setKind] = useState('deliveries');
  const { data, error, loading } = useAsync(fetchHistory, []);
  const trips = data || [];
  const total = trips.reduce((sum, t) => sum + Number(t.fare) + Number(t.tip), 0);

  return (
    <div className="rs-page">
      <h1 className="rs-title">History</h1>
      <div className="rs-stat-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }} role="tablist" aria-label="History type">
        <button type="button" role="tab" aria-selected={kind === 'deliveries'} className={`rs-btn ${kind === 'deliveries' ? '' : 'rs-btn-ghost'}`} style={{ minHeight: 44 }} onClick={() => setKind('deliveries')}>Deliveries</button>
        <button type="button" role="tab" aria-selected={kind === 'rides'} className={`rs-btn ${kind === 'rides' ? '' : 'rs-btn-ghost'}`} style={{ minHeight: 44 }} onClick={() => setKind('rides')}>Rides</button>
      </div>
      {kind === 'rides' ? <RideHistory /> : <>
      <p className="rs-sub">Your completed deliveries, newest first.</p>
      {error && <div className="rs-alert rs-alert-bad" role="alert">{error}</div>}

      {loading && !data ? (
        <div className="rs-skel" style={{ height: 200 }} />
      ) : trips.length === 0 ? (
        <div className="rs-card rs-empty">
          <div className="rs-empty-icon"><History size={28} /></div>
          <h2>No deliveries yet</h2>
          <p>Your first completed delivery will show up here.</p>
        </div>
      ) : (
        <>
          <div className="rs-stat-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="rs-stat"><span className="rs-label">Deliveries</span><b>{trips.length}</b></div>
            <div className="rs-stat"><span className="rs-label">Earned</span><b>{naira(total)}</b></div>
          </div>
          <div className="rs-card" style={{ padding: '4px 16px' }}>
            {trips.map((t) => (
              <div className="rs-list-item" key={t.id}>
                <div>
                  <div className="rs-strong">{t.storeName}</div>
                  <div className="rs-muted">To {t.customerName} · {t.address}</div>
                  <div className="rs-muted">{when(t.deliveredAt)}</div>
                </div>
                <div className="rs-money" style={{ textAlign: 'right' }}>
                  {naira(Number(t.fare) + Number(t.tip))}
                  {Number(t.tip) > 0 && <div className="rs-muted">incl. {naira(t.tip)} tip</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      </>}
    </div>
  );
}
