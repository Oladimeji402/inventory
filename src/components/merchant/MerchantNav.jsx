import React from 'react';
import { BRAND } from '../../config/brand';
import BrandMark from '../../shared/components/BrandMark';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  ShoppingBag,
  Users,
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
    { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'orders', label: 'Orders', icon: ShoppingBag, badge: orderCount > 0 ? String(orderCount) : null },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount > 0 ? String(unreadNotifsCount) : null, danger: true },
    { key: 'settings', label: 'Store Settings', icon: Settings }
  ];

  return (
    <aside className="merchant-sidebar">
      <div className="merchant-sidebar-header">
        <BrandMark href={undefined} showTagline={false} />
      </div>

      <div className="merchant-sidebar-store">
        <h3 className="merchant-store-name">{storeProfile.name || `${BRAND.name} store`}</h3>
        <span className="merchant-store-subdomain font-mono">
          {storeProfile.slug ? `${storeProfile.slug}.${BRAND.domain}` : BRAND.domain}
        </span>
      </div>

      <nav className="merchant-nav-list">
        {mainLinks.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`merchant-nav-item${isActive ? ' active' : ''}`}
              onClick={() => onSelectTab(item.key)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {item.badge && (
                <span className={`merchant-nav-badge${item.danger ? ' danger' : ''}`}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="merchant-sidebar-footer">
        <button className="merchant-btn-secondary" onClick={onExitToLanding} style={{ width: '100%', justifyContent: 'center' }}>
          <ArrowLeft size={14} />
          <span>Exit to Main Site</span>
        </button>
      </div>
    </aside>
  );
}
