import { useMemo, useState } from 'react';
import { Ban, Bike, CheckCircle2, Clock, Route } from 'lucide-react';
import { cancelRideAsAdmin, fetchRide, fetchRides } from '../../../services/admin';
import {
  ActionDialog, Badge, DataTable, ErrorBanner, FilterChips, KeyValues, Link, PageHeader, Panel, SearchBox, StatCard, useAsync
} from '../ui';
import { dateTime, money, shortId, statusLabel } from '../format';

const VEHICLE = { motorcycle: 'Okada', tricycle: 'Keke / Maruwa', car: 'Car' };
const STATUS_FILTERS = ['all', 'open', 'assigned', 'arrived', 'in_progress', 'completed', 'cancelled', 'expired'];
const tone = (status) => ({ open: 'warn', assigned: 'info', arrived: 'info', in_progress: 'info', completed: 'ok', cancelled: 'bad', expired: 'idle' }[status] || 'idle');

export function RidesPage({ navigate, refreshKey }) {
  const rides = useAsync(() => fetchRides(300), [refreshKey]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const all = rides.data || [];

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((r) => (status === 'all' || r.status === status)
      && (!term || `${r.id} ${r.passengerName} ${r.passengerPhone} ${r.pickup} ${r.dropoff} ${r.riderName || ''}`.toLowerCase().includes(term)));
  }, [all, status, search]);

  const count = (...s) => all.filter((r) => s.includes(r.status)).length;
  const paid = all.filter((r) => r.status === 'completed').reduce((t, r) => t + Number(r.agreedPrice || 0), 0);

  return (
    <>
      <PageHeader title="Rides" subtitle="Passenger rides: requests, offers and trips. Fares are paid in cash to riders." />
      <ErrorBanner message={rides.error} onRetry={rides.reload} />
      <div className="ad-grid ad-grid-4" style={{ marginBottom: 18 }}>
        <StatCard label="Waiting for riders" icon={Clock} tint="#fef3c7" color="#b45309" value={count('open')} delay={0} />
        <StatCard label="On the road" icon={Bike} value={count('assigned', 'arrived', 'in_progress')} delay={60} />
        <StatCard label="Completed" icon={CheckCircle2} tint="#dcfce7" color="#15803d" value={count('completed')} hint={`${money(paid)} in fares`} delay={120} />
        <StatCard label="Cancelled / expired" icon={Route} tint="#fee2e2" color="#b91c1c" value={count('cancelled', 'expired')} delay={180} />
      </div>
      <div className="ad-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search id, passenger, address, rider" />
      </div>
      <div className="ad-toolbar">
        <FilterChips value={status} onChange={setStatus} options={STATUS_FILTERS.map((s) => ({ value: s, label: s === 'all' ? 'All' : statusLabel(s), count: s === 'all' ? all.length : count(s) }))} />
      </div>
      <Panel flush>
        <DataTable
          loading={rides.loading && !rides.data}
          rows={rows}
          onRowClick={(r) => navigate(`/rides/${r.id}`)}
          empty={{ title: 'No rides match', text: 'Passenger ride requests appear here.' }}
          columns={[
            { key: 'id', header: 'Ride', render: (r) => <><span className="ad-mono ad-cell-main">#{shortId(r.id)}</span><div className="ad-cell-sub">{VEHICLE[r.vehicleType]}</div></> },
            { key: 'p', header: 'Passenger', render: (r) => <><div>{r.passengerName}</div><div className="ad-cell-sub">{r.passengerPhone}</div></> },
            { key: 'route', header: 'Route', render: (r) => <span className="ad-cell-sub" style={{ maxWidth: 260, display: 'block' }}>{r.pickup} → {r.dropoff}</span> },
            { key: 'st', header: 'Status', render: (r) => <Badge tone={tone(r.status)}>{statusLabel(r.status)}</Badge> },
            { key: 'rider', header: 'Rider', render: (r) => (r.riderId ? <Link to={`/riders/${r.riderId}`} navigate={navigate} style={{ color: 'inherit' }}>{r.riderName}</Link> : <span className="ad-cell-sub">{r.bidCount} offer{r.bidCount === 1 ? '' : 's'}</span>) },
            { key: 'price', header: 'Fare', align: 'right', render: (r) => <span className="ad-mono ad-cell-main">{money(r.agreedPrice ?? r.offeredPrice)}</span> },
            { key: 'time', header: 'Requested', render: (r) => dateTime(r.createdAt) }
          ]}
        />
      </Panel>
    </>
  );
}

export function RideDetailPage({ navigate, notify, rideId, refreshKey, onChanged }) {
  const ride = useAsync(() => fetchRide(rideId), [rideId, refreshKey]);
  const [dialog, setDialog] = useState(false);
  const r = ride.data;
  const cancellable = r && ['open', 'assigned', 'arrived', 'in_progress'].includes(r.status);

  return (
    <>
      <PageHeader
        back={{ to: '/rides', label: 'All rides' }} navigate={navigate}
        title={r ? `Ride #${shortId(r.id)}` : 'Ride'}
        subtitle={r ? `${VEHICLE[r.vehicleType]} · requested ${dateTime(r.createdAt)}` : undefined}
        actions={r && (
          <>
            <Badge tone={tone(r.status)}>{statusLabel(r.status)}</Badge>
            {cancellable && <button type="button" className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => setDialog(true)}><Ban size={14} /> Cancel ride</button>}
          </>
        )}
      />
      <ErrorBanner message={ride.error} onRetry={ride.reload} />

      {r && (
        <div className="ad-grid ad-grid-main">
          <div className="ad-stack">
            <Panel title="Trip">
              <KeyValues items={[
                ['Pickup', r.pickup, true], ['Drop-off', r.dropoff, true],
                ['Offered', money(r.offeredPrice)], ['Agreed fare', r.agreedPrice ? money(r.agreedPrice) : null],
                ['Payment', 'Cash to rider'], ['Scheduled for', r.scheduledFor ? dateTime(r.scheduledFor) : 'Now'],
                ['Note', r.note, true],
                ['Rating', r.rating ? `${'★'.repeat(r.rating)}${r.ratingComment ? ` — ${r.ratingComment}` : ''}` : null, true],
                ['Cancelled', r.status === 'cancelled' ? `By ${r.cancelledBy}${r.cancelReason ? `: ${r.cancelReason}` : ''}` : null, true]
              ]} />
            </Panel>
            <Panel flush title="Offers from riders" subtitle={`${r.bids.length} in total`}>
              <DataTable rows={r.bids} empty={{ title: 'No offers yet' }} columns={[
                { key: 'rider', header: 'Rider', render: (b) => <Link to={`/riders/${b.riderId}`} navigate={navigate} className="ad-cell-main" style={{ color: 'inherit' }}>{b.riderName}</Link> },
                { key: 'price', header: 'Price', align: 'right', render: (b) => <span className="ad-mono">{money(b.price)}</span> },
                { key: 'eta', header: 'ETA', render: (b) => `${b.etaMinutes} min` },
                { key: 'st', header: 'Status', render: (b) => <Badge status={b.status} tone={b.status === 'accepted' ? 'ok' : b.status === 'pending' ? 'warn' : 'idle'} /> },
                { key: 'at', header: 'Sent', render: (b) => dateTime(b.createdAt) }
              ]} />
            </Panel>
            <Panel title="Timeline">
              <ul className="ad-timeline">
                {r.events.map((e, i) => (
                  <li key={i} className="done"><i /><div><div className="ad-cell-main">{statusLabel(e.event)} <span className="ad-cell-sub">· {e.actor}</span></div><div className="ad-cell-sub">{dateTime(e.at)}</div></div></li>
                ))}
              </ul>
            </Panel>
          </div>
          <div className="ad-stack">
            <Panel title="Passenger"><KeyValues items={[['Name', r.passenger.name], ['Phone', r.passenger.phone], ['Email', r.passenger.email, true]]} /></Panel>
            <Panel title="Rider">
              {r.rider ? (
                <KeyValues items={[
                  ['Name', <Link key="n" to={`/riders/${r.rider.id}`} navigate={navigate} style={{ color: 'var(--primary)' }}>{r.rider.name}</Link>],
                  ['Phone', r.rider.phone], ['Vehicle', VEHICLE[r.rider.vehicleType] || r.rider.vehicleType], ['Plate', r.rider.plate]
                ]} />
              ) : <p className="ad-note" style={{ margin: 0 }}>No rider is assigned.</p>}
            </Panel>
          </div>
        </div>
      )}

      {dialog && r && (
        <ActionDialog title="Cancel this ride?" description="The passenger and rider will see it as cancelled by support. Nothing is charged (rides are paid in cash)." tone="danger" confirmLabel="Cancel ride"
          inputLabel="Reason" inputRequired inputPlaceholder="e.g. Safety concern reported"
          onClose={() => setDialog(false)}
          onConfirm={async (reason) => { await cancelRideAsAdmin(r.id, reason); notify('Ride cancelled.'); ride.reload({ silent: true }); onChanged?.(); }} />
      )}
    </>
  );
}
