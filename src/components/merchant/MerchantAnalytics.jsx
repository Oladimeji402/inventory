import React, { useMemo } from 'react';
import { TrendingUp, ShoppingBag, Users, Clock } from 'lucide-react';
import { countedOrder, formatNaira } from '../../lib/formatMoney';

export default function MerchantAnalytics({ products = [], orders = [] }) {
  const liveOrders = orders.filter(countedOrder);
  const revenue = liveOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const aov = liveOrders.length ? revenue / liveOrders.length : 0;
  const uniqueCustomers = new Set(liveOrders.map((order) => order.customerName.trim().toLowerCase()).filter(Boolean));
  const repeatRate = uniqueCustomers.size
    ? Math.round(((liveOrders.length - uniqueCustomers.size) / liveOrders.length) * 1000) / 10
    : 0;
  const delivered = liveOrders.filter((order) => order.status === 'delivered');
  const avgEta = delivered.filter((order) => order.courierInfo?.etaMinutes).length
    ? Math.round(
      delivered
        .filter((order) => order.courierInfo?.etaMinutes)
        .reduce((sum, order) => sum + order.courierInfo.etaMinutes, 0)
        / delivered.filter((order) => order.courierInfo?.etaMinutes).length
    )
    : null;

  const topProducts = useMemo(() => {
    return products
      .map((product) => {
        const salesCount = liveOrders.filter((order) =>
          (order.itemsSummary || '').toLowerCase().includes(product.name.toLowerCase().slice(0, 18))
        ).length;
        const margin = product.price > 0 ? ((product.price - product.cost) / product.price) * 100 : 0;
        return {
          name: product.name,
          category: product.category,
          salesCount,
          revenue: salesCount * product.price,
          margin: `${Math.max(0, margin).toFixed(1)}%`
        };
      })
      .sort((a, b) => b.salesCount - a.salesCount || b.revenue - a.revenue)
      .slice(0, 5);
  }, [products, liveOrders]);

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
      volume: `${Math.round((counts[index] / max) * 100)}%`,
      count: counts[index],
      isPeak: counts[index] === Math.max(...counts) && counts[index] > 0
    }));
  }, [liveOrders]);

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Sales Intelligence & Analytics
        </h1>
        <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
          Built from your catalog and storefront orders. Empty until the first checkout.
        </p>
      </div>

      <div className="merchant-kpi-grid">
        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Gross sales</span>
            <div className="merchant-kpi-icon">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">{formatNaira(revenue)}</div>
          <div className="merchant-kpi-sub">All non-cancelled orders</div>
        </div>

        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Average Order Value (AOV)</span>
            <div className="merchant-kpi-icon">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">{formatNaira(aov)}</div>
          <div className="merchant-kpi-sub">{liveOrders.length} orders recorded</div>
        </div>

        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Repeat shoppers</span>
            <div className="merchant-kpi-icon">
              <Users size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">{uniqueCustomers.size ? `${repeatRate}%` : '—'}</div>
          <div className="merchant-kpi-sub">{uniqueCustomers.size} unique customer names</div>
        </div>

        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Avg. fulfillment ETA</span>
            <div className="merchant-kpi-icon">
              <Clock size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">{avgEta ? `${avgEta} mins` : '—'}</div>
          <div className="merchant-kpi-sub">From assigned courier ETAs</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', marginBottom: '28px' }}>
        <div className="merchant-card" style={{ marginBottom: 0 }}>
          <div className="merchant-card-header">
            <h3 className="merchant-card-title">Catalog snapshot</h3>
            <span style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>{products.length} products</span>
          </div>
          {topProducts.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
              Add products, then orders will rank the ones that sell.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="merchant-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Matched orders</th>
                    <th>Est. revenue</th>
                    <th>Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((item) => (
                    <tr key={item.name}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{item.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#737373' }}>{item.category}</div>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 600 }}>{item.salesCount}</td>
                      <td className="font-mono" style={{ fontWeight: 700, color: '#0a0a0a' }}>{formatNaira(item.revenue)}</td>
                      <td className="font-mono" style={{ fontWeight: 700, color: '#2B7CFF' }}>{item.margin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="merchant-card" style={{ padding: '24px', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Order hours</h4>
              <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 700 }}>
                {liveOrders.length ? 'From recorded checkouts' : 'Waiting on first order'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '110px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
              {hourlyVolume.map((hour) => (
                <div key={hour.hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <div
                    style={{
                      width: '20px',
                      height: hour.volume,
                      background: hour.isPeak ? '#2B7CFF' : '#e5e5e5',
                      borderRadius: '4px'
                    }}
                    title={`${hour.hour}: ${hour.count} orders`}
                  />
                  <span style={{ fontSize: '10.5px', color: '#737373', fontFamily: 'monospace' }}>{hour.hour.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="merchant-card" style={{ padding: '24px', marginBottom: 0 }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700 }}>Payment channels</h4>
            <p style={{ fontSize: '13px', color: '#737373', margin: 0 }}>
              Payment mix appears after licensed checkout (Paystack / Flutterwave) is connected. Nothing is estimated here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
