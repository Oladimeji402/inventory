import React, { useState } from 'react';
import { 
  Bell, 
  ShoppingBag, 
  Bike, 
  AlertTriangle, 
  CreditCard, 
  Check, 
  Trash2,
  Filter
} from 'lucide-react';

const initialNotifications = [
  {
    id: 'NOTIF-1',
    type: 'order',
    title: 'New Webstore Order Received (#ORD-9821)',
    desc: 'Amara K. paid ₦8,300 for 2 items. Delivery address: Admiralty Way, Lekki.',
    time: '5 mins ago',
    unread: true,
    action: 'view_order',
    orderId: 'ORD-9821'
  },
  {
    id: 'NOTIF-2',
    type: 'rider',
    title: 'Courier Assigned & En Route (#ORD-9820)',
    desc: 'Samuel O. (Yamaha 125cc) accepted pickup for Joel Ogunnaike St. ETA ~8 mins.',
    time: '24 mins ago',
    unread: true,
    action: 'track_rider',
    orderId: 'ORD-9820'
  },
  {
    id: 'NOTIF-3',
    type: 'stock',
    title: 'Low Stock Alert: Vitamin C 1000mg Effervescent',
    desc: 'Only 4 units remaining in inventory. Restock soon to prevent online out-of-stock.',
    time: '1 hour ago',
    unread: false,
    action: 'restock'
  },
  {
    id: 'NOTIF-4',
    type: 'payout',
    title: 'Daily Automated Payout Completed',
    desc: '₦142,500 successfully deposited to Guaranty Trust Bank account ending in 7465.',
    time: 'Yesterday at 6:00 PM',
    unread: false,
    action: 'payout_receipt'
  },
  {
    id: 'NOTIF-5',
    type: 'order',
    title: 'Order Delivered & Settled (#ORD-9819)',
    desc: 'Digital Blood Pressure Monitor (₦24,500) confirmed with doorstep OTP 9204.',
    time: 'Yesterday at 3:15 PM',
    unread: false,
    action: 'view_order'
  }
];

export default function MerchantNotifications({ onNavigateTab }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState('all');

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return n.unread;
    if (filter === 'orders') return n.type === 'order' || n.type === 'rider';
    if (filter === 'stock') return n.type === 'stock';
    if (filter === 'payouts') return n.type === 'payout';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'order': return <ShoppingBag size={16} color="#27BBAD" />;
      case 'rider': return <Bike size={16} color="#2563eb" />;
      case 'stock': return <AlertTriangle size={16} color="#d97706" />;
      case 'payout': return <CreditCard size={16} color="#16a34a" />;
      default: return <Bell size={16} color="#27BBAD" />;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: 0, letterSpacing: '-0.02em' }}>
              Notifications & Activity Feed
            </h1>
            {unreadCount > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', background: '#27BBAD', padding: '2px 8px', borderRadius: '100px' }}>
                {unreadCount} unread
              </span>
            )}
          </div>
          <p style={{ fontSize: '14px', color: '#737373', margin: '4px 0 0' }}>
            Real-time telemetry on incoming orders, courier dispatches, stock alerts, and payouts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button className="merchant-btn-secondary" style={{ fontSize: '13px' }} onClick={markAllRead}>
              <Check size={14} />
              <span>Mark all as read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button className="merchant-btn-secondary" style={{ fontSize: '13px', color: '#e11d48' }} onClick={clearAll}>
              <Trash2 size={14} />
              <span>Clear Feed</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Activity' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'orders', label: 'Orders & Couriers' },
          { key: 'stock', label: 'Stock Warnings' },
          { key: 'payouts', label: 'Bank Payouts' }
        ].map(tab => (
          <button
            key={tab.key}
            className="merchant-btn-secondary"
            style={{
              fontSize: '12.5px',
              padding: '6px 14px',
              background: filter === tab.key ? 'rgba(39, 187, 173, 0.08)' : '#ffffff',
              borderColor: filter === tab.key ? '#27BBAD' : '#e5e5e5',
              color: filter === tab.key ? '#27BBAD' : '#525252'
            }}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List Card */}
      <div className="merchant-card">
        {filteredNotifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: '#737373' }}>
            <Bell size={36} color="#d4d4d4" style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#0a0a0a' }}>No notifications here</p>
            <p style={{ fontSize: '13px', margin: 0 }}>You are completely caught up with all store activities.</p>
          </div>
        ) : (
          <div>
            {filteredNotifs.map((n, idx) => (
              <div 
                key={n.id}
                style={{
                  padding: '20px 24px',
                  borderBottom: idx === filteredNotifs.length - 1 ? 'none' : '1px solid #f0f0f0',
                  background: n.unread ? 'rgba(39, 187, 173, 0.03)' : '#ffffff',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '10px', 
                    background: '#fafafa', 
                    border: '1px solid #e5e5e5',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {getIcon(n.type)}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0a0a0a', margin: 0 }}>
                        {n.title}
                      </h4>
                      {n.unread && (
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#27BBAD', display: 'inline-block' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '13.5px', color: '#525252', margin: '4px 0 0', lineHeight: 1.5 }}>
                      {n.desc}
                    </p>
                    <span style={{ fontSize: '11.5px', color: '#a3a3a3', marginTop: '6px', display: 'block', fontWeight: 500 }}>
                      {n.time}
                    </span>
                  </div>
                </div>

                {n.action === 'view_order' && (
                  <button 
                    className="merchant-btn-secondary" 
                    style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
                    onClick={() => onNavigateTab('orders')}
                  >
                    View Order
                  </button>
                )}
                {n.action === 'restock' && (
                  <button 
                    className="merchant-btn-secondary" 
                    style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0, color: '#d97706', borderColor: '#fcd34d' }}
                    onClick={() => onNavigateTab('products')}
                  >
                    Restock
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
