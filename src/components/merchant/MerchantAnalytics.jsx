import React, { useMemo } from 'react';
import { TrendingUp, ShoppingBag, Users, Clock, PackageSearch } from 'lucide-react';
import Card from '../../shared/ui/Card';
import KpiTile from '../../shared/ui/KpiTile';
import DataTable from '../../shared/ui/DataTable';
import { countedOrder, formatNaira } from '../../lib/formatMoney';

export default function MerchantAnalytics({ products = [], orders = [], customers = [] }) {
  const liveOrders = orders.filter(countedOrder);
  const revenue = liveOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const aov = liveOrders.length ? revenue / liveOrders.length : 0;

  const uniqueCustomerKeys = new Set(
    liveOrders
      .map((order) => order.customerId || order.customerName.trim().toLowerCase())
      .filter(Boolean)
  );
  const repeatRate = uniqueCustomerKeys.size
    ? Math.round(((liveOrders.length - uniqueCustomerKeys.size) / liveOrders.length) * 1000) / 10
    : 0;

  const delivered = liveOrders.filter((order) => order.status === 'delivered');
  const deliveredWithEta = delivered.filter((order) => order.courierInfo?.etaMinutes);
  const avgEta = deliveredWithEta.length
    ? Math.round(deliveredWithEta.reduce((sum, order) => sum + order.courierInfo.etaMinutes, 0) / deliveredWithEta.length)
    : null;

  const topProducts = useMemo(() => {
    const byProduct = new Map();
    liveOrders.forEach((order) => {
      order.lineItems.forEach((line) => {
        if (line.legacy) return; // free-text legacy line — no reliable qty/revenue
        const key = line.productId || line.productName;
        const existing = byProduct.get(key) || { name: line.productName, unitsSold: 0, revenue: 0 };
        existing.unitsSold += line.quantity;
        existing.revenue += line.lineTotal;
        byProduct.set(key, existing);
      });
    });
    return Array.from(byProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [liveOrders]);

  const hourlyVolume = useMemo(() => {
    const buckets = [
      { hour: '8 AM', start: 8 },
      { hour: '10 AM', start: 10 },
      { hour: '12 PM', start: 12 },
      { hour: '2 PM', start: 14 },
      { hour: '4 PM', start: 16 },
      { hour: '6 PM', start: 18 },
      { hour: '8 PM', start: 20 }
    ];
    const counts = buckets.map((bucket) => liveOrders.filter((order) => {
      const hour = new Date(order.createdAt).getHours();
      return hour >= bucket.start && hour < bucket.start + 2;
    }).length);
    const max = Math.max(1, ...counts);
    return buckets.map((bucket, index) => ({
      hour: bucket.hour,
      heightPct: Math.round((counts[index] / max) * 100),
      count: counts[index],
      isPeak: counts[index] === Math.max(...counts) && counts[index] > 0
    }));
  }, [liveOrders]);

  return (
    <div>
      <div className="merchant-page-header">
        <h1>Sales Intelligence &amp; Analytics</h1>
        <p>Built from your catalog and storefront orders. Empty until the first checkout.</p>
      </div>

      <div className="merchant-kpi-grid">
        <KpiTile icon={TrendingUp} label="Gross sales" value={formatNaira(revenue)} sub="All non-cancelled orders" />
        <KpiTile icon={ShoppingBag} label="Average Order Value (AOV)" value={formatNaira(aov)} sub={`${liveOrders.length} orders recorded`} />
        <KpiTile
          icon={Users}
          label="Repeat shoppers"
          value={uniqueCustomerKeys.size ? `${repeatRate}%` : '—'}
          sub={`${uniqueCustomerKeys.size} unique customers`}
        />
        <KpiTile icon={Clock} label="Avg. fulfillment ETA" value={avgEta ? `${avgEta} mins` : '—'} sub="From assigned courier ETAs" />
      </div>

      <div className="merchant-analytics-grid">
        <Card
          title="Top Products"
          subtitle={`${products.length} products in catalog`}
          noBodyPadding
        >
          <DataTable
            rows={topProducts}
            empty={{
              icon: PackageSearch,
              title: 'No sales yet',
              desc: 'Once orders come in, your best-selling products will rank here by revenue.'
            }}
            columns={[
              { key: 'name', header: 'Product', render: (p) => <span style={{ fontWeight: 700 }}>{p.name}</span> },
              { key: 'units', header: 'Units sold', render: (p) => <span className="font-mono">{p.unitsSold}</span> },
              { key: 'revenue', header: 'Revenue', render: (p) => <span className="font-mono" style={{ fontWeight: 700 }}>{formatNaira(p.revenue)}</span> }
            ]}
          />
        </Card>

        <Card title="Order hours" subtitle={liveOrders.length ? 'From recorded checkouts' : 'Waiting on first order'}>
          <div className="merchant-hourly-chart">
            {hourlyVolume.map((hour) => (
              <div key={hour.hour} className="merchant-hourly-bar-col">
                <div
                  className={`merchant-hourly-bar${hour.isPeak ? ' peak' : ''}`}
                  style={{ height: `${Math.max(4, hour.heightPct)}%` }}
                  title={`${hour.hour}: ${hour.count} orders`}
                />
                <span className="font-mono">{hour.hour.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
