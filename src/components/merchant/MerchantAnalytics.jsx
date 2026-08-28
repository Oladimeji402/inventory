import React from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Clock, 
  CreditCard, 
  ArrowUpRight, 
  Package,
  CheckCircle2,
  PieChart
} from 'lucide-react';

export default function MerchantAnalytics({ products = [], orders = [] }) {
  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  const topSellingItems = [
    { name: 'Amoxicillin 500mg (20 Caps)', category: 'Pharmacy', salesCount: 68, revenue: 258400, margin: '31.5%' },
    { name: 'Paracetamol Extra (Pack of 10)', category: 'Pharmacy', salesCount: 142, revenue: 170400, margin: '33.3%' },
    { name: 'Vitamin C 1000mg Effervescent', category: 'Pharmacy', salesCount: 34, revenue: 153000, margin: '28.8%' },
    { name: 'Baby Care Gentle Lotion (500ml)', category: 'Pharmacy', salesCount: 22, revenue: 136400, margin: '22.5%' },
    { name: 'Digital Blood Pressure Monitor', category: 'Pharmacy', salesCount: 5, revenue: 122500, margin: '26.5%' },
  ];

  const hourlyVolume = [
    { hour: '8 AM', volume: '15%' },
    { hour: '10 AM', volume: '35%' },
    { hour: '12 PM', volume: '70%' },
    { hour: '2 PM', volume: '95%', isPeak: true },
    { hour: '4 PM', volume: '80%' },
    { hour: '6 PM', volume: '85%', isPeak: true },
    { hour: '8 PM', volume: '40%' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Sales Intelligence & Analytics
        </h1>
        <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
          Deep unit economics, customer acquisition trends, and inventory profit margins.
        </p>
      </div>

      {/* Analytics High-Level Metrics */}
      <div className="merchant-kpi-grid">
        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Gross Margin Retention</span>
            <div className="merchant-kpi-icon">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">96.5%</div>
          <div className="merchant-kpi-sub">vs 70% on Jumia / aggregators</div>
        </div>

        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Average Order Value (AOV)</span>
            <div className="merchant-kpi-icon">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">₦6,450</div>
          <div className="merchant-kpi-sub">+14% month-over-month</div>
        </div>

        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Repeat Shoppers</span>
            <div className="merchant-kpi-icon">
              <Users size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">48.2%</div>
          <div className="merchant-kpi-sub">High neighborhood loyalty</div>
        </div>

        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Avg. Fulfillment Speed</span>
            <div className="merchant-kpi-icon">
              <Clock size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">18 mins</div>
          <div className="merchant-kpi-sub">Counter to doorstep</div>
        </div>
      </div>

      {/* 2-Column Analytics Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Top Selling Products */}
        <div className="merchant-card" style={{ marginBottom: 0 }}>
          <div className="merchant-card-header">
            <h3 className="merchant-card-title">Top Grossing Products</h3>
            <span style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>Last 30 Days</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="merchant-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units Sold</th>
                  <th>Total Revenue</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {topSellingItems.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#737373' }}>{item.category}</div>
                    </td>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{item.salesCount}</td>
                    <td className="font-mono" style={{ fontWeight: 700, color: '#0a0a0a' }}>{formatNaira(item.revenue)}</td>
                    <td className="font-mono" style={{ fontWeight: 700, color: '#27BBAD' }}>{item.margin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Peak Hours Heatmap & Payment Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Peak Hours */}
          <div className="merchant-card" style={{ padding: '24px', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Peak Order Hours</h4>
              <span style={{ fontSize: '11.5px', color: '#27BBAD', fontWeight: 700 }}>Peak: 2PM - 6PM</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '110px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
              {hourlyVolume.map((h, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <div 
                    style={{ 
                      width: '20px', 
                      height: h.volume, 
                      background: h.isPeak ? '#27BBAD' : '#e5e5e5', 
                      borderRadius: '4px',
                      transition: 'all 0.3s ease'
                    }} 
                    title={`${h.hour}: ${h.volume} relative traffic`}
                  />
                  <span style={{ fontSize: '10.5px', color: '#737373', fontFamily: 'monospace' }}>{h.hour.split(' ')[0]}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#737373', margin: '10px 0 0', lineHeight: 1.4 }}>
              Schedule pre-packaging staff during afternoon rush hours for under 15-min dispatches.
            </p>
          </div>

          {/* Payment Gateways */}
          <div className="merchant-card" style={{ padding: '24px', marginBottom: 0 }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700 }}>Payment Channels</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>Direct Debit / Card (Paystack)</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>64%</span>
                </div>
                <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '64%', height: '100%', background: '#27BBAD' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>Bank Instant Transfer</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>28%</span>
                </div>
                <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '28%', height: '100%', background: '#0a0a0a' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>Cash at Counter (POS)</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>8%</span>
                </div>
                <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '8%', height: '100%', background: '#d4d4d4' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
