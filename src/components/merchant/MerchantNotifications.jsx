import React, { useState } from 'react';
import { Bell, ShoppingBag, Bike, AlertTriangle, Check, Trash2 } from 'lucide-react';

export default function MerchantNotifications({
  notifications = [],
  onClear,
  onNavigateTab
}) {
  const [filter, setFilter] = useState('all');
  const [hiddenUnread, setHiddenUnread] = useState(false);
  const visible = hiddenUnread
    ? notifications.map((item) => ({ ...item, unread: false }))
    : notifications;
  const unreadCount = visible.filter((item) => item.unread).length;
  const filtered = visible.filter((item) => {
    if (filter === 'unread') return item.unread;
    if (filter === 'orders') return item.type === 'order' || item.type === 'rider';
    if (filter === 'stock') return item.type === 'stock';
    return true;
  });

  const getIcon = (type) => {
    if (type === 'order') return <ShoppingBag size={16} color="#2B7CFF" />;
    if (type === 'rider') return <Bike size={16} color="#2563eb" />;
    if (type === 'stock') return <AlertTriangle size={16} color="#d97706" />;
    return <Bell size={16} color="#2B7CFF" />;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: 0, letterSpacing: '-0.02em' }}>
              Notifications & Activity Feed
            </h1>
            {unreadCount > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', background: '#2B7CFF', padding: '2px 8px', borderRadius: '100px' }}>
                {unreadCount} unread
              </span>
            )}
          </div>
          <p style={{ fontSize: '14px', color: '#737373', margin: '4px 0 0' }}>
            Generated from your orders and stock. No demo payouts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button className="merchant-btn-secondary" style={{ fontSize: '13px' }} onClick={() => setHiddenUnread(true)}>
              <Check size={14} />
              <span>Mark all as read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button className="merchant-btn-secondary" style={{ fontSize: '13px', color: '#e11d48' }} onClick={onClear}>
              <Trash2 size={14} />
              <span>Clear Feed</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Activity' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'orders', label: 'Orders' },
          { key: 'stock', label: 'Stock Warnings' }
        ].map((tab) => (
          <button
            key={tab.key}
            className="merchant-btn-secondary"
            style={{
              fontSize: '12.5px',
              padding: '6px 14px',
              background: filter === tab.key ? 'rgba(43, 124, 255, 0.08)' : '#ffffff',
              borderColor: filter === tab.key ? '#2B7CFF' : '#e5e5e5',
              color: filter === tab.key ? '#2B7CFF' : '#525252'
            }}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="merchant-card">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: '#737373' }}>
            <Bell size={36} color="#d4d4d4" style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#0a0a0a' }}>No notifications yet</p>
            <p style={{ fontSize: '13px', margin: 0 }}>Low stock and new orders will show up here.</p>
          </div>
        ) : (
          filtered.map((item, index) => (
            <div
              key={item.id}
              style={{
                padding: '20px 24px',
                borderBottom: index === filtered.length - 1 ? 'none' : '1px solid #f0f0f0',
                background: item.unread ? 'rgba(43, 124, 255, 0.03)' : '#ffffff',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px'
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
                  flexShrink: 0
                }}>
                  {getIcon(item.type)}
                </div>
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0a0a0a', margin: 0 }}>{item.title}</h4>
                  <p style={{ fontSize: '13.5px', color: '#525252', margin: '4px 0 0', lineHeight: 1.5 }}>{item.desc}</p>
                  {item.time && (
                    <span style={{ fontSize: '11.5px', color: '#a3a3a3', marginTop: '6px', display: 'block' }}>{item.time}</span>
                  )}
                </div>
              </div>
              {item.action === 'view_order' && (
                <button className="merchant-btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => onNavigateTab('orders')}>
                  View Order
                </button>
              )}
              {item.action === 'restock' && (
                <button className="merchant-btn-secondary" style={{ fontSize: '12px', padding: '6px 12px', color: '#d97706', borderColor: '#fcd34d' }} onClick={() => onNavigateTab('products')}>
                  Restock
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
