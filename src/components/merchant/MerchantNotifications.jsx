import React, { useState } from 'react';
import { Bell, ShoppingBag, Bike, AlertTriangle, Check } from 'lucide-react';
import Tabs from '../../shared/ui/Tabs';

const ICONS = { order: ShoppingBag, rider: Bike, stock: AlertTriangle };
const ICON_TONE = { order: 'info', rider: 'info', stock: 'warning' };

export default function MerchantNotifications({ notifications = [], onMarkAllRead, onNavigateTab }) {
  const [filter, setFilter] = useState('all');
  const unreadCount = notifications.filter((item) => item.unread).length;
  const filtered = notifications.filter((item) => {
    if (filter === 'unread') return item.unread;
    if (filter === 'orders') return item.type === 'order' || item.type === 'rider';
    if (filter === 'stock') return item.type === 'stock';
    return true;
  });

  return (
    <div>
      <div className="merchant-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ marginBottom: 0 }}>Notifications</h1>
            {unreadCount > 0 && <span className="merchant-nav-badge">{unreadCount} unread</span>}
          </div>
          <p>Generated live from your orders and stock levels.</p>
        </div>
        {unreadCount > 0 && (
          <button className="merchant-btn-secondary" onClick={onMarkAllRead}>
            <Check size={14} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All Activity' },
          { value: 'unread', label: `Unread (${unreadCount})` },
          { value: 'orders', label: 'Orders' },
          { value: 'stock', label: 'Stock Warnings' }
        ]}
      />

      <div className="mx-card" style={{ marginTop: 20 }}>
        {filtered.length === 0 ? (
          <div className="mx-empty">
            <span className="mx-empty-icon"><Bell size={20} /></span>
            <div className="mx-empty-title">No notifications yet</div>
            <div className="mx-empty-desc">Low stock and new orders will show up here.</div>
          </div>
        ) : (
          filtered.map((item, index) => {
            const Icon = ICONS[item.type] || Bell;
            return (
              <div
                key={item.id}
                className="merchant-notif-row"
                style={{
                  borderBottom: index === filtered.length - 1 ? 'none' : '1px solid var(--mx-border)',
                  background: item.unread ? 'var(--mx-primary-light)' : 'transparent'
                }}
              >
                <div className="merchant-notif-left">
                  <span className={`merchant-notif-icon ${ICON_TONE[item.type] || 'neutral'}`}>
                    <Icon size={16} />
                  </span>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                    {item.time && <span className="merchant-notif-time">{item.time}</span>}
                  </div>
                </div>
                {item.action === 'view_order' && (
                  <button className="merchant-btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => onNavigateTab('orders')}>
                    View Order
                  </button>
                )}
                {item.action === 'restock' && (
                  <button className="merchant-btn-secondary" style={{ fontSize: 12, padding: '6px 12px', color: 'var(--mx-warning)' }} onClick={() => onNavigateTab('products')}>
                    Restock
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
