import { Bike } from 'lucide-react';
import { fetchMyRides, vehicleById } from '../../../services/rides';
import { useAsync } from '../../../hooks/useAsync';
import { naira } from '../../../lib/format';

export const RIDE_STATUS = {
  open: { label: 'Finding a rider', tone: 'warn' },
  assigned: { label: 'Rider on the way', tone: 'info' },
  arrived: { label: 'Rider has arrived', tone: 'info' },
  in_progress: { label: 'On your trip', tone: 'info' },
  completed: { label: 'Completed', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
  expired: { label: 'No rider found', tone: 'idle' }
};

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export default function TripsPage({ auth, navigate }) {
  const rides = useAsync(() => (auth.user ? fetchMyRides() : Promise.resolve({ data: [] })), [auth.user?.id]);

  if (!auth.user) {
    return (
      <div className="sh-wrap sh-section"><div className="sh-empty"><Bike size={34} /><strong>Sign in to see your trips</strong>
        Your bookings and receipts are saved to your account.
        <div><button type="button" className="sh-btn" style={{ marginTop: 16 }} onClick={() => navigate('/login?next=/trips')}>Sign in</button></div></div></div>
    );
  }

  const list = rides.data || [];
  return (
    <div className="sh-wrap sh-section" style={{ maxWidth: 640 }}>
      <h1 className="sh-h1">My trips</h1>
      <p className="sh-sub">Tap a trip to see its details.</p>
      {rides.error && <div className="sh-alert sh-alert-bad" role="alert">{rides.error}</div>}
      {rides.loading && !rides.data ? (
        <div className="sh-skel" style={{ height: 120 }} />
      ) : list.length === 0 ? (
        <div className="sh-empty"><Bike size={34} /><strong>No trips yet</strong>Book your first ride.
          <div><button type="button" className="sh-btn" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Book a ride</button></div></div>
      ) : list.map((r) => {
        const st = RIDE_STATUS[r.status] || { label: r.status, tone: 'idle' };
        const v = vehicleById(r.vehicleType);
        return (
          <button key={r.id} type="button" className="sh-order" onClick={() => navigate(`/trips/${r.id}`)}>
            <div className="sh-row"><strong>{v.emoji} {v.label}</strong><span className={`sh-badge sh-badge-${st.tone}`}>{st.label}</span></div>
            <div className="sh-muted" style={{ margin: '6px 0' }}>{r.pickup} → {r.dropoff}</div>
            <div className="sh-row">
              <span className="sh-muted">{r.scheduledFor ? `Scheduled ${when(r.scheduledFor)}` : when(r.createdAt)}{r.riderName ? ` · ${r.riderName}` : ''}</span>
              <span className="sh-money">{naira(r.agreedPrice ?? r.offeredPrice)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
