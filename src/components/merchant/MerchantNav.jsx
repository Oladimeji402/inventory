import React from 'react';
import { BRAND } from '../../config/brand';
import BrandMark from '../../shared/components/BrandMark';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  ShoppingBag,
  Bell,
  Settings,
  ArrowLeft
} from 'lucide-react';

export default function MerchantNav({
  currentTab,
  onSelectTab,
  storeProfile,
  orderCount = 0,
  unreadNotifsCount = 0,
  onExitToLanding
}) {
  const mainLinks = [
    { key: 'overview', label: 'Performance', icon: LayoutDashboard },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'orders', label: 'Orders', icon: ShoppingBag, badge: orderCount > 0 ? String(orderCount) : null },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount > 0 ? String(unreadNotifsCount) : null, badgeColor: '#ef4444' },
    { key: 'settings', label: 'Store Settings', icon: Settings }
  ];

  return (
    <aside className="merchant-sidebar" style={{ width: '270px', padding: '16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px 18px', borderBottom: '1px solid #f0f0f0' }}>
        <BrandMark href={undefined} showTagline={false} />
      </div>
      <div style={{ padding: '14px 10px 8px' }}>
        <h3 style={{ fontSize: '14.5px', fontWeight: 800, margin: 0, color: '#0a0a0a' }}>
          {storeProfile.name || `${BRAND.name} store`}
        </h3>
        <span className="font-mono" style={{ fontSize: '11px', color: '#737373', display: 'block' }}>
          {storeProfile.slug ? `${storeProfile.slug}.${BRAND.domain}` : BRAND.domain}
        </span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {mainLinks.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;
          return (
            <button
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                fontSize: '13.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0a0a0a' : '#525252',
                borderRadius: '10px',
                background: isActive ? '#f5f5f5' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left'
              }}
              onClick={() => onSelectTab(item.key)}
            >
              <Icon size={17} color={isActive ? '#0a0a0a' : '#737373'} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: item.badgeColor || '#f5f5f5',
                    color: item.badgeColor ? '#ffffff' : '#525252',
                    padding: '2px 7px',
                    borderRadius: '100px'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ paddingTop: '14px', borderTop: '1px solid #f0f0f0' }}>
        <button
          className="merchant-btn-secondary"
          onClick={onExitToLanding}
          style={{ width: '100%', justifyContent: 'center', fontSize: '12.5px', padding: '8px' }}
        >
          <ArrowLeft size={14} />
          <span>Exit to Main Site</span>
        </button>
      </div>
    </aside>
  );
}
