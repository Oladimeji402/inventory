import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp,
  Package, 
  ShoppingBag, 
  Bell,
  Settings, 
  Truck,
  Megaphone,
  Boxes,
  ChevronDown,
  ChevronUp,
  Wallet,
  Users,
  Terminal,
  ArrowLeft,
  Store,
  ShieldCheck
} from 'lucide-react';

export default function MerchantNav({ 
  currentTab, 
  onSelectTab, 
  storeProfile, 
  orderCount = 120,
  unreadNotifsCount = 99,
  onLaunchPOS,
  onExitToLanding 
}) {
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  const mainLinks = [
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'notifications', label: 'Notification', icon: Bell, badge: `${unreadNotifsCount}+`, badgeColor: '#ef4444' },
    { key: 'overview', label: 'Performance', icon: LayoutDashboard },
    { key: 'orders', label: 'Orders', icon: ShoppingBag, badge: `${orderCount}`, badgeColor: '#f5f5f5', badgeTextColor: '#525252' },
  ];

  const productLinks = [
    { key: 'products', label: 'All Product', icon: Package },
    { key: 'shipping', label: 'Shipping', icon: Truck },
    { key: 'campaign', label: 'Campaign', icon: Megaphone },
    { key: 'catalog', label: 'Catalog', icon: Boxes },
  ];

  const storeCategories = [
    { name: 'Pharmacy & Health', count: 120, color: '#ef4444' },
    { name: 'Groceries & Mart', count: 85, color: '#3b82f6' },
    { name: 'Consumer Tech', count: 42, color: '#10b981' },
  ];

  return (
    <aside className="merchant-sidebar" style={{ width: '270px', padding: '16px 14px' }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px 18px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0a0a0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={18} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: '14.5px', fontWeight: 800, margin: 0, color: '#0a0a0a' }}>
            {storeProfile.name || 'Subtech Retail'}
          </h3>
          <span className="font-mono" style={{ fontSize: '11px', color: '#737373', display: 'block' }}>
            {storeProfile.slug}.subtech.app
          </span>
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Section 1: Main Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
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
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
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
                      background: item.badgeColor || '#0a0a0a', 
                      color: item.badgeTextColor || '#ffffff', 
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

        {/* Section 2: PRODUCT */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#a3a3a3', letterSpacing: '0.06em', padding: '0 12px 6px', textTransform: 'uppercase' }}>
            Product
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {productLinks.map((item) => {
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
                    background: isActive ? '#f0f0f0' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => onSelectTab(item.key)}
                >
                  <Icon size={17} color={isActive ? '#0a0a0a' : '#737373'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: MY STORE */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#a3a3a3', letterSpacing: '0.06em', padding: '0 12px 6px', textTransform: 'uppercase' }}>
            My Store
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {/* Product Category dropdown */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#525252',
                borderRadius: '10px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%'
              }}
              onClick={() => setCategoriesOpen(!categoriesOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Store size={17} color="#737373" />
                <span>Product Category</span>
              </div>
              {categoriesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {categoriesOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '28px', marginTop: '2px' }}>
                {storeCategories.map(cat => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', fontSize: '12.5px', color: '#525252', cursor: 'pointer', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.color }} />
                      <span>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#a3a3a3', background: '#f5f5f5', padding: '1px 6px', borderRadius: '100px' }}>
                      {cat.count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                fontSize: '13.5px',
                fontWeight: currentTab === 'finance' ? 700 : 500,
                color: currentTab === 'finance' ? '#0a0a0a' : '#525252',
                borderRadius: '10px',
                background: currentTab === 'finance' ? '#f0f0f0' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left'
              }}
              onClick={() => onSelectTab('analytics')}
            >
              <Wallet size={17} color="#737373" />
              <span>Finance</span>
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                fontSize: '13.5px',
                fontWeight: currentTab === 'customer' ? 700 : 500,
                color: currentTab === 'customer' ? '#0a0a0a' : '#525252',
                borderRadius: '10px',
                background: currentTab === 'customer' ? '#f0f0f0' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left'
              }}
              onClick={() => onSelectTab('overview')}
            >
              <Users size={17} color="#737373" />
              <span>Customer</span>
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                fontSize: '13.5px',
                fontWeight: currentTab === 'settings' ? 700 : 500,
                color: currentTab === 'settings' ? '#0a0a0a' : '#525252',
                borderRadius: '10px',
                background: currentTab === 'settings' ? '#f0f0f0' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left'
              }}
              onClick={() => onSelectTab('settings')}
            >
              <Settings size={17} color="#737373" />
              <span>Store Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer quick tools */}
      <div style={{ paddingTop: '14px', borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {storeProfile.hasPhysicalStore && (
          <button className="merchant-btn-pos" onClick={onLaunchPOS} style={{ width: '100%', justifyContent: 'center' }}>
            <Terminal size={14} color="#27BBAD" />
            <span>Launch POS Till</span>
          </button>
        )}

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
