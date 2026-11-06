import { useState } from 'react';
import { Percent, Repeat, ShoppingBag, Wallet } from 'lucide-react';
import { fetchAnalytics } from '../../services/merchant';
import {
  AreaChart,
  BarList,
  ColumnChart,
  EmptyState,
  ErrorBanner,
  FilterChips,
  Notice,
  PageHeader,
  Panel,
  SegmentBar,
  Skeleton,
  StatCard,
  useAsync
} from './ui';
import { count, hourLabel, longDay, money, shortDay } from './format';

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' }
];
const CHANNEL_LABEL = { online: 'Online storefront', counter: 'Counter / till' };

export default function MerchantAnalytics() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useAsync(() => fetchAnalytics(days), [days]);
  const a = data || {};
  const kpis = a.kpis || {};
  const customers = a.customers || {};
  const statusCounts = a.statusCounts || {};
  const repeatRate = customers.identified ? (customers.repeat / customers.identified) * 100 : null;
  const totalOrdersInRange = Object.values(statusCounts).reduce((sum, n) => sum + Number(n), 0);
  const cancelledRate = totalOrdersInRange ? ((Number(statusCounts.cancelled) || 0) / totalOrdersInRange) * 100 : null;
  const series = (a.series || []).map((d) => ({
    value: Number(d.sales) || 0,
    label: shortDay(d.date),
    full: longDay(d.date),
    sub: `${d.orders} order${Number(d.orders) === 1 ? '' : 's'}`
  }));
  const hasSales = Number(kpis.orders) > 0;
  const bootstrapping = loading && !data;
  const channelColors = { online: '#2B7CFF', counter: '#0f766e' };

  if (error && !data) {
    return (
      <>
        <PageHeader title="Analytics" />
        <ErrorBanner message={error} onRetry={reload} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Paid orders only, without delivery fees; cancelled and refunded orders are left out. Days are Lagos time."
        actions={<FilterChips label="Date range" value={days} onChange={setDays} options={RANGES} />}
      />
      <ErrorBanner message={error} onRetry={reload} />

      <div className="mc-grid mc-grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Sales" icon={Wallet} value={kpis.sales} format={money} loading={bootstrapping} hint={`last ${days} days`} />
        <StatCard label="Paid orders" icon={ShoppingBag} tint="#ede9fe" color="#7c3aed" value={kpis.orders} loading={bootstrapping} hint={`last ${days} days`} delay={60} />
        <StatCard label="Average order" icon={Percent} tint="#fef3c7" color="#d97706" value={kpis.averageOrderValue} format={money} loading={bootstrapping} hint="sales ÷ paid orders" delay={120} />
        <StatCard
          label="Repeat customers"
          icon={Repeat}
          tint="#dcfce7"
          color="#16a34a"
          value={repeatRate}
          format={(n) => `${n.toFixed(0)}%`}
          loading={bootstrapping}
          hint={customers.identified ? `${customers.repeat} of ${customers.identified} known customers` : 'needs customers with a phone number'}
          delay={180}
        />
      </div>

      <Panel title="Sales per day" subtitle={`Last ${days} days`}>
        {bootstrapping ? <Skeleton height={240} /> : <AreaChart data={series} />}
      </Panel>

      <div className="mc-grid mc-grid-2" style={{ margin: '16px 0' }}>
        <Panel title="Best sellers" subtitle="By sales value">
          {bootstrapping ? <Skeleton height={160} /> : (a.topProducts || []).length ? (
            <BarList items={a.topProducts.map((p) => ({ key: p.name, label: `${p.name} · ${count(p.units)} sold`, value: Number(p.sales) }))} />
          ) : (
            <EmptyState title="No product sales yet" text="Your best sellers show here once paid orders come in." />
          )}
        </Panel>

        <Panel title="Where sales come from" subtitle="Online storefront vs the counter">
          {bootstrapping ? <Skeleton height={160} /> : hasSales ? (
            <>
              <SegmentBar
                format={money}
                segments={(a.channels || []).map((c) => ({ label: CHANNEL_LABEL[c.channel] || c.channel, value: Number(c.sales), color: channelColors[c.channel] || '#94a3b8' }))}
              />
              <p className="mc-note">{(a.channels || []).map((c) => `${CHANNEL_LABEL[c.channel] || c.channel}: ${c.orders} order${Number(c.orders) === 1 ? '' : 's'}`).join(' · ')}</p>
              {a.fulfilment && (Number(a.fulfilment.delivery) + Number(a.fulfilment.pickup)) > 0 && (
                <p className="mc-note">Online orders: {a.fulfilment.delivery} for delivery, {a.fulfilment.pickup} for pickup.</p>
              )}
            </>
          ) : <EmptyState title="No sales yet" text="Channel split appears after your first paid order." />}
        </Panel>

        <Panel title="How customers pay" subtitle="Share of sales by payment method">
          {bootstrapping ? <Skeleton height={120} /> : (a.paymentMethods || []).length ? (
            <BarList items={a.paymentMethods.map((m) => ({ key: m.method, label: `${m.method} · ${m.orders} order${Number(m.orders) === 1 ? '' : 's'}`, value: Number(m.sales) }))} color="#0f766e" />
          ) : <EmptyState title="No payments yet" />}
        </Panel>

        <Panel title="Busiest hours" subtitle="Paid orders by hour of day (Lagos time)">
          {bootstrapping ? <Skeleton height={150} /> : hasSales ? (
            <ColumnChart items={(a.byHour || []).map((h) => ({ key: h.hour, label: hourLabel(h.hour), value: Number(h.orders), title: `${hourLabel(h.hour)}: ${h.orders} orders` }))} />
          ) : <EmptyState title="No orders yet" />}
        </Panel>
      </div>

      <Panel title="Order outcomes" subtitle={`All orders placed in the last ${days} days, including unpaid and cancelled`}>
        {bootstrapping ? <Skeleton height={40} /> : totalOrdersInRange ? (
          <>
            <SegmentBar
              segments={[
                { label: 'Completed', value: Number(statusCounts.delivered) || 0, color: '#16a34a' },
                { label: 'Out for delivery', value: Number(statusCounts.dispatched) || 0, color: '#2563eb' },
                { label: 'Open', value: Number(statusCounts.pending) || 0, color: '#d97706' },
                { label: 'Cancelled', value: Number(statusCounts.cancelled) || 0, color: '#dc2626' }
              ]}
            />
            <p className="mc-note">{cancelledRate != null ? `${cancelledRate.toFixed(1)}% of orders were cancelled. ` : ''}Unpaid card orders that the shopper abandons are cancelled automatically and their stock is released.</p>
          </>
        ) : <p className="mc-note" style={{ margin: 0 }}>No orders in this period.</p>}
      </Panel>

      <div style={{ marginTop: 16 }}>
        <Notice>
          Profit is not shown. Orders do not record what each item cost you at the time, so any margin figure would be a guess.
        </Notice>
      </div>
    </>
  );
}
