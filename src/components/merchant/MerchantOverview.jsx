import React from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Bike,
  Plus,
  Store,
  Sparkles
} from 'lucide-react';
import MerchantSalesChart from './MerchantSalesChart';
import { countedOrder, formatNaira, isActiveOrder, isThisMonth, isToday, shortOrderId } from '../../lib/formatMoney';
import { BRAND } from '../../config/brand';

export default function MerchantOverview({
  storeProfile,
  products = [],
  orders = [],
  loading = false,
  onNavigateTab,
  onOpenAddProduct,
  onOpenStorefront
}) {
  const liveOrders = orders.filter(countedOrder);
  const todayOrders = liveOrders.filter((order) => isToday(order.createdAt));
  const monthOrders = liveOrders.filter((order) => isThisMonth(order.createdAt));
  const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const activeOrdersCount = liveOrders.filter(isActiveOrder).length;
  const inStockCount = products.filter((product) => product.isActive && product.stock > 0).length;
  const lowStockCount = products.filter((product) => product.stock > 0 && product.stock <= 5).length;
  const dispatchedCount = liveOrders.filter((order) => order.status === 'dispatched').length;

  return (
    <div>
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#2B7CFF', background: 'rgba(43, 124, 255, 0.1)', padding: '3px 10px', borderRadius: '100px' }}>
              <Sparkles size={13} />
              Today’s sales
            </span>
            <span style={{ fontSize: '12.5px', color: '#737373', fontWeight: 500 }}>
              {storeProfile.name || 'Your store'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h2 className="font-mono" style={{ fontSize: '36px', fontWeight: 800, color: '#0a0a0a', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {loading ? '…' : formatNaira(todayRevenue)}
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#737373', margin: '6px 0 0' }}>
            {todayOrders.length === 0
              ? 'No checkouts yet today. Share your storefront link to start taking orders.'
              : `${todayOrders.length} checkout${todayOrders.length === 1 ? '' : 's'} today.`}
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

      <div className="merchant-kpi-grid">
        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Month-to-Date Volume</span>
            <div className="merchant-kpi-icon">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">{formatNaira(monthRevenue)}</div>
          <div className="merchant-kpi-sub">
            {monthOrders.length} order{monthOrders.length === 1 ? '' : 's'} this month
          </div>
        </div>

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

        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">Live Shelf Stock</span>
            <div className="merchant-kpi-icon">
              <Package size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">{inStockCount} items</div>
          <div className="merchant-kpi-sub">
            {lowStockCount > 0 ? `${lowStockCount} items low in stock` : products.length === 0 ? 'Add products to go live' : 'All listed items in stock'}
          </div>
        </div>

        <div className="merchant-kpi-card">
          <div className="merchant-kpi-top">
            <span className="merchant-kpi-label">In Transit</span>
            <div className="merchant-kpi-icon">
              <Bike size={16} />
            </div>
          </div>
          <div className="merchant-kpi-val font-mono">{dispatchedCount}</div>
          <div className="merchant-kpi-sub">Orders currently out for delivery</div>
        </div>
      </div>

      <MerchantSalesChart orders={liveOrders} />

      <div className="merchant-card" style={{ padding: '24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(43, 124, 255, 0.1)', color: '#2B7CFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={22} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700 }}>Your live storefront URL</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#737373' }}>
              Share this link on WhatsApp, Instagram, or flyers. Shopper checkout is next.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="font-mono" style={{ padding: '8px 14px', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13.5px', fontWeight: 600, color: '#0a0a0a' }}>
            https://{storeProfile.slug}.{BRAND.domain}
          </span>
          <button className="merchant-btn-primary" onClick={onOpenStorefront}>
            <span>Visit Webstore</span>
          </button>
        </div>
      </div>

      <div className="merchant-card">
        <div className="merchant-card-header">
          <h3 className="merchant-card-title">Recent Customer Orders</h3>
          <button className="merchant-btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }} onClick={() => onNavigateTab('orders')}>
            View All Orders →
          </button>
        </div>

        {liveOrders.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
            Orders appear here when a shopper checks out. Nothing is seeded for demo.
          </p>
        ) : (
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
                {liveOrders.slice(0, 6).map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{shortOrderId(order.id)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                      <div style={{ fontSize: '11.5px', color: '#737373' }}>{order.address}</div>
                    </td>
                    <td style={{ color: '#525252' }}>{order.itemsSummary || '—'}</td>
                    <td className="font-mono" style={{ fontWeight: 700, color: '#0a0a0a' }}>{formatNaira(order.total)}</td>
                    <td>
                      <span className={`merchant-badge ${order.status === 'delivered' ? 'live' : order.status === 'dispatched' ? 'dispatched' : 'pending'}`}>
                        {order.status === 'delivered' ? 'Delivered' : order.status === 'dispatched' ? 'In transit' : 'New order'}
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
        )}
      </div>
    </div>
  );
}
