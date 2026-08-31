import React from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  Bike, 
  ArrowUpRight, 
  Plus, 
  ExternalLink,
  Store,
  CheckCircle2,
  Bell,
  Sparkles,
  Zap
} from 'lucide-react';
import MerchantSalesChart from './MerchantSalesChart';

export default function MerchantOverview({ 
  storeProfile, 
  products = [], 
  orders = [], 
  onNavigateTab,
  onOpenAddProduct,
  onOpenStorefront 
}) {
  const formatNaira = (num) => '₦' + Math.round(num || 0).toLocaleString();

  // Calculated Stats
  const totalGrossRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const activeOrdersCount = orders.filter(o => o.status !== 'delivered').length;
  const inStockCount = products.filter(p => p.stock > 0).length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;

  return (
    <div>
      {/* Top Welcome & Daily Profit Highlight Banner */}
      <div style={{ 
        background: '#ffffff', 
        border: '1.5px solid #e5e5e5', 
        borderRadius: '16px', 
        padding: '24px 28px', 
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#27BBAD', background: 'rgba(39, 187, 173, 0.1)', padding: '3px 10px', borderRadius: '100px' }}>
              <Sparkles size={13} />
              Today's Net Sales
            </span>
            <span style={{ fontSize: '12.5px', color: '#737373', fontWeight: 500 }}>
              Live Storefront + Offline Till
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h2 className="font-mono" style={{ fontSize: '36px', fontWeight: 800, color: '#0a0a0a', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
              ₦148,500
            </h2>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13.5px', fontWeight: 700, color: '#27BBAD' }}>
              <ArrowUpRight size={15} />
              +28.4% vs yesterday
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#737373', margin: '6px 0 0' }}>
            23 completed customer checkouts across <strong>{storeProfile.name}</strong> today.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="merchant-btn-secondary" onClick={() => onNavigateTab('analytics')}>
            <TrendingUp size={15} />
            <span>View Full Analytics</span>
          </button>
          <button className="merchant-btn-primary" onClick={onOpenAddProduct}>
            <Plus size={15} />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="merchant-kpi-grid">
        {/* Total Gross Revenue */}
        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Month-to-Date Volume</span>
            <div className="merchant-kpi-icon">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">₦3,850,000</div>
          <div className="merchant-kpi-sub">+34.6% vs last month</div>
        </div>

        {/* Active Orders */}
        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Pending Orders</span>
            <div className="merchant-kpi-icon">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">{activeOrdersCount}</div>
          <div className="merchant-kpi-sub" style={{ color: activeOrdersCount > 0 ? '#2563eb' : '#737373' }}>
            {activeOrdersCount} requiring fulfillment
          </div>
        </div>

        {/* Live Catalog Items */}
        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Live Shelf Stock</span>
            <div className="merchant-kpi-icon">
              <Package size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">{inStockCount} items</div>
          <div className="merchant-kpi-sub">
            {lowStockCount > 0 ? `${lowStockCount} items low in stock` : 'All items in stock'}
          </div>
        </div>

        {/* Courier Dispatch */}
        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Courier Radar</span>
            <div className="merchant-kpi-icon">
              <Bike size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">100%</div>
          <div className="merchant-kpi-sub">Avg. 18 min dropoff</div>
        </div>
      </div>

      {/* Interactive Sales Chart */}
      <MerchantSalesChart />

      {/* Subdomain Share Box */}
      <div className="merchant-card" style={{ padding: '24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(39, 187, 173, 0.1)', color: '#27BBAD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={22} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700 }}>Your Live Digital Storefront</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#737373' }}>
              Share your dedicated link on Instagram bio, WhatsApp status, or marketing flyers:
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="font-mono" style={{ padding: '8px 14px', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13.5px', fontWeight: 600, color: '#0a0a0a' }}>
            https://{storeProfile.slug}.stv.com
          </span>
          <button 
            className="merchant-btn-primary"
            onClick={onOpenStorefront ? onOpenStorefront : () => window.open(`https://${storeProfile.slug}.stv.com`, '_blank')}
          >
            <span>Visit Webstore</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="merchant-card">
        <div className="merchant-card-header">
          <h3 className="merchant-card-title">Recent Customer Orders</h3>
          <button className="merchant-btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }} onClick={() => onNavigateTab('orders')}>
            View All Orders →
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="merchant-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 4).map((order) => (
                <tr key={order.id}>
                  <td className="font-mono" style={{ fontWeight: 600 }}>{order.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                    <div style={{ fontSize: '11.5px', color: '#737373' }}>{order.address}</div>
                  </td>
                  <td style={{ color: '#525252' }}>{order.itemsSummary}</td>
                  <td className="font-mono" style={{ fontWeight: 700, color: '#0a0a0a' }}>{formatNaira(order.total)}</td>
                  <td>
                    <span className={`merchant-badge ${order.status === 'delivered' ? 'live' : order.status === 'dispatched' ? 'dispatched' : 'pending'}`}>
                      {order.status === 'delivered' ? '✓ Delivered' : order.status === 'dispatched' ? 'Courier In Transit' : 'New Order'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="merchant-btn-secondary" 
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                      onClick={() => onNavigateTab('orders')}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
