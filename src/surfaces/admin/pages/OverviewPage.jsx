import { useState } from 'react';
import { AlertTriangle, Banknote, Bike, CheckCircle2, Landmark, Package, Receipt, Store, TrendingUp, Wallet } from 'lucide-react';
import { fetchPlatformMetrics, fetchPlatformOrders, fetchTrends } from '../../../services/admin';
import {
  AreaChart, Badge, BarList, DataTable, ErrorBanner, FilterChips, Link, PageHeader, Panel, SegmentBar, StatCard, useAsync
} from '../ui';
import { count, dateTime, money, percentChange, shortId } from '../format';

const STATUS_COLORS = { delivered: '#16a34a', pending: '#f59e0b', dispatched: '#2563eb', cancelled: '#ef4444' };

function shortDay(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function OverviewPage({ navigate, refreshKey }) {
  const [days, setDays] = useState(14);
  const metrics = useAsync(fetchPlatformMetrics, [refreshKey]);
  const trends = useAsync(() => fetchTrends(days), [days, refreshKey]);
  const orders = useAsync(() => fetchPlatformOrders(8), [refreshKey]);

  const m = metrics.data;
  const t = trends.data;
  const q = t?.queue || {};
  const cmp = t?.compare || {};

  const chartData = (t?.series || []).map((point) => ({
    label: shortDay(point.day),
    full: new Date(`${point.day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    value: Number(point.gmv) || 0,
    sub: `${point.orders} order${point.orders === 1 ? '' : 's'}`
  }));

  const statusSegments = Object.entries(t?.statusBreakdown || {}).map(([label, value]) => ({
    label: label[0].toUpperCase() + label.slice(1),
    value: Number(value),
    color: STATUS_COLORS[label] || '#94a3b8'
  }));
  const channelItems = Object.entries(t?.channelGmv || {}).map(([label, value]) => ({
    label: label === 'online' ? 'Online storefront' : 'Counter till',
    value: Number(value),
    key: label
  }));
  const topStores = (t?.topStores || []).map((s) => ({ label: s.name, value: Number(s.gmv), key: s.id }));

  const queueItems = [
    { to: '/riders', n: q.ridersPendingReview, label: 'Riders waiting for document review', icon: Bike },
    { to: '/payouts', n: q.payoutsPending, label: `Rider payouts to settle${q.payoutsPendingAmount ? ` (${money(q.payoutsPendingAmount)})` : ''}`, icon: Banknote },
    { to: '/orders', n: q.unpaidTransfers, label: 'Bank-transfer orders not yet confirmed', icon: Receipt },
    { to: '/stores', n: q.storesPendingKyc, label: 'Stores waiting for KYC review', icon: Landmark },
    { to: '/stores', n: q.suspendedStores, label: 'Suspended stores', icon: AlertTriangle }
  ];
  const attention = queueItems.filter((item) => Number(item.n) > 0);

  return (
    <>
      <PageHeader title="Overview" subtitle="Live view of sales, stores, riders and what needs your attention." />
      <ErrorBanner message={metrics.error || trends.error} onRetry={() => { metrics.reload(); trends.reload(); }} />

      <div className="ad-grid ad-grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Paid sales · 7 days" icon={TrendingUp} value={cmp.gmv7d} format={money} delta={percentChange(cmp.gmv7d, cmp.gmvPrev7d)} hint="vs previous 7 days" loading={trends.loading && !t} delay={0} />
        <StatCard label="Orders · 7 days" icon={Package} tint="#fef3c7" color="#b45309" value={cmp.orders7d} delta={percentChange(cmp.orders7d, cmp.ordersPrev7d)} hint="vs previous 7 days" loading={trends.loading && !t} delay={60} />
        <StatCard label="Active stores" icon={Store} tint="#dcfce7" color="#15803d" value={m?.activeTenants} hint={q.newStores7d !== undefined ? `${count(q.newStores7d)} new this week` : undefined} loading={metrics.loading && !m} delay={120} />
        <StatCard label="Verified riders" icon={Bike} tint="#ede9fe" color="#6d28d9" value={m?.verifiedRiders} hint={m ? `${count(m.activeRiders)} onboarded · ${count(q.ridersPendingReview)} in review` : undefined} loading={metrics.loading && !m} delay={180} />
      </div>
      <div className="ad-grid ad-grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="All-time paid sales" icon={Wallet} value={m?.totalGmv} format={money} loading={metrics.loading && !m} delay={240} />
        <StatCard label="Sales · 30 days" icon={TrendingUp} value={m?.gmv30d} format={money} loading={metrics.loading && !m} delay={300} />
        <StatCard label="All-time paid orders" icon={Package} tint="#fef3c7" color="#b45309" value={m?.totalOrders} loading={metrics.loading && !m} delay={360} />
        <StatCard label="Rider payouts due" icon={Banknote} tint="#fee2e2" color="#b91c1c" value={q.payoutsPendingAmount} format={money} hint={q.payoutsPending ? `${q.payoutsPending} request${q.payoutsPending === 1 ? '' : 's'}` : 'Nothing waiting'} loading={trends.loading && !t} delay={420} />
      </div>

      <div className="ad-grid ad-grid-main" style={{ marginBottom: 16 }}>
        <Panel
          title="Paid sales per day"
          subtitle="Counts paid, non-cancelled orders (Lagos time)"
          action={<FilterChips value={days} onChange={setDays} options={[{ value: 7, label: '7d' }, { value: 14, label: '14d' }, { value: 30, label: '30d' }, { value: 90, label: '90d' }]} />}
        >
          {trends.loading && !t ? <div className="ad-skel" style={{ height: 240 }} /> : <AreaChart data={chartData} />}
        </Panel>

        <Panel title="Needs attention" subtitle="Work only an admin can unblock">
          {trends.loading && !t ? (
            <div className="ad-skel" style={{ height: 180 }} />
          ) : attention.length === 0 ? (
            <div className="ad-empty" style={{ padding: '36px 10px' }}>
              <CheckCircle2 size={28} color="#16a34a" style={{ marginBottom: 8 }} />
              <strong>All clear</strong>
              Nothing is waiting on you right now.
            </div>
          ) : (
            <div className="ad-stack" style={{ gap: 10 }}>
              {attention.map((item) => (
                <Link key={item.label} to={item.to} navigate={navigate} className="ad-queue-item">
                  <item.icon size={18} color="#2563eb" />
                  <b>{count(item.n)}</b>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="ad-grid ad-grid-3" style={{ marginBottom: 16 }}>
        <Panel title="Orders by status" subtitle="Last 30 days">
          {statusSegments.length ? <SegmentBar segments={statusSegments} /> : <p className="ad-note">No orders in the last 30 days.</p>}
        </Panel>
        <Panel title="Sales by channel" subtitle="Paid, last 30 days">
          {channelItems.length ? <BarList items={channelItems} /> : <p className="ad-note">No paid sales in the last 30 days.</p>}
        </Panel>
        <Panel title="Top stores" subtitle="Paid sales, last 30 days">
          {topStores.length ? <BarList items={topStores} color="#16a34a" /> : <p className="ad-note">No store has paid sales in the last 30 days.</p>}
        </Panel>
      </div>

      <Panel flush title="Latest orders" action={<Link to="/orders" navigate={navigate} className="ad-btn ad-btn-sm">View all</Link>}>
        <DataTable
          loading={orders.loading && !orders.data}
          rows={orders.data || []}
          onRowClick={(row) => navigate(`/orders/${row.id}`)}
          empty={{ title: 'No orders yet', text: 'Orders from storefronts and tills appear here.' }}
          columns={[
            { key: 'id', header: 'Order', render: (o) => <span className="ad-mono ad-cell-main">#{shortId(o.id)}</span> },
            { key: 'store', header: 'Store', render: (o) => <><div className="ad-cell-main">{o.storeName}</div><div className="ad-cell-sub">{o.channel === 'counter' ? 'Counter till' : 'Online'}</div></> },
            { key: 'customer', header: 'Customer', render: (o) => o.customerName || '—' },
            { key: 'status', header: 'Status', render: (o) => <Badge status={o.status} /> },
            { key: 'pay', header: 'Payment', render: (o) => <Badge status={o.paymentStatus} /> },
            { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="ad-mono">{money(o.total)}</span> },
            { key: 'time', header: 'Placed', render: (o) => dateTime(o.createdAt) }
          ]}
        />
      </Panel>
    </>
  );
}
