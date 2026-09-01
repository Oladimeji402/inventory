import React, { useState } from 'react';
import './Merchant.css';
import MerchantNav from './MerchantNav';
import MerchantOverview from './MerchantOverview';
import MerchantAnalytics from './MerchantAnalytics';
import MerchantProducts from './MerchantProducts';
import MerchantOrders from './MerchantOrders';
import MerchantNotifications from './MerchantNotifications';
import MerchantSettings from './MerchantSettings';
import { 
  Store, 
  Terminal, 
  ArrowLeft, 
  Menu, 
  Bell
} from 'lucide-react';

const initialStoreProfile = {
  name: 'Apex Health Pharmacy',
  slug: 'apex-pharmacy',
  category: 'Pharmacy & Wellness',
  address: 'Plot 12, Isaac John St, Ikeja GRA, Lagos',
  whatsapp: '+234 803 291 0029',
  bankName: 'Guaranty Trust Bank',
  accountNumber: '0192837465',
  accountName: 'Apex Health Ventures LTD',
  hasPhysicalStore: true
};

const initialProducts = [
  { id: 'PROD-101', name: 'Amoxicillin 500mg (20 Caps)', category: 'Pharmacy', price: 3800, cost: 2600, stock: 14, barcode: '6151100010214' },
  { id: 'PROD-102', name: 'Paracetamol Extra (Pack of 10)', category: 'Pharmacy', price: 1200, cost: 800, stock: 45, barcode: '6151100010221' },
  { id: 'PROD-103', name: 'Vitamin C 1000mg Effervescent', category: 'Pharmacy', price: 4500, cost: 3200, stock: 4, barcode: '6151100010238' },
  { id: 'PROD-104', name: 'Baby Care Gentle Lotion (500ml)', category: 'Pharmacy', price: 6200, cost: 4800, stock: 18, barcode: '6151100010245' },
  { id: 'PROD-105', name: 'Digital Blood Pressure Monitor', category: 'Pharmacy', price: 24500, cost: 18000, stock: 2, barcode: '6151100010252' },
  { id: 'PROD-106', name: 'First Aid Antiseptic Liquid (250ml)', category: 'Pharmacy', price: 2100, cost: 1400, stock: 0, barcode: '6151100010269' },
];

const initialOrders = [
  {
    id: 'ORD-9821',
    customerName: 'Amara K.',
    address: 'Apt 4B, Admiralty Way, Lekki Phase 1',
    itemsSummary: '1x Amoxicillin 500mg, 1x Vitamin C 1000mg',
    total: 8300,
    status: 'pending',
    timeAgo: '5 mins ago'
  },
  {
    id: 'ORD-9820',
    customerName: 'Dr. Femi D.',
    address: '14 Joel Ogunnaike St, Ikeja GRA',
    itemsSummary: '2x Paracetamol Extra, 1x First Aid Liquid',
    total: 4500,
    status: 'dispatched',
    timeAgo: '24 mins ago',
    courierInfo: {
      courierName: 'Samuel O. (Rider #284)',
      courierPhone: '+234 802 119 4482',
      etaMinutes: 8,
      otp: '3819'
    }
  },
  {
    id: 'ORD-9819',
    customerName: 'Blessing E.',
    address: 'Plot 8, Victoria Island Close',
    itemsSummary: '1x Digital Blood Pressure Monitor',
    total: 24500,
    status: 'delivered',
    timeAgo: '2 hours ago'
  }
];

function tenantToStoreProfile(tenant) {
  if (!tenant) return initialStoreProfile;
  return {
    name: tenant.trading_name || initialStoreProfile.name,
    slug: tenant.slug || initialStoreProfile.slug,
    category: tenant.category || initialStoreProfile.category,
    address: tenant.address || initialStoreProfile.address,
    whatsapp: tenant.contact_phone || initialStoreProfile.whatsapp,
    bankName: initialStoreProfile.bankName,
    accountNumber: initialStoreProfile.accountNumber,
    accountName: initialStoreProfile.accountName,
    hasPhysicalStore: tenant.has_physical_store ?? true
  };
}

export default function MerchantApp({
  tenant,
  profile,
  onSignOut,
  onLaunchPOS,
  onOpenStorefront,
  onExitToLanding
}) {
  const [currentTab, setCurrentTab] = useState('overview');
  const [storeProfile, setStoreProfile] = useState(() => tenantToStoreProfile(tenant));
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(2);

  // Handlers
  const handleSaveProduct = (newOrUpdated) => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === newOrUpdated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newOrUpdated;
        return next;
      }
      return [newOrUpdated, ...prev];
    });
  };

  const handleDeleteProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateOrderStatus = (orderId, newStatus, courierData = null) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: newStatus,
          courierInfo: courierData ? courierData : o.courierInfo
        };
      }
      return o;
    }));
  };

  const handleSaveSettings = (newSettings) => {
    setStoreProfile(newSettings);
  };

  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="merchant-root">
      {/* Desktop Sidebar Nav */}
      <MerchantNav
        currentTab={currentTab}
        onSelectTab={(tab) => { 
          setCurrentTab(tab); 
          setMobileMenuOpen(false); 
          if (tab === 'notifications') setUnreadNotifsCount(0);
        }}
        storeProfile={storeProfile}
        orderCount={pendingOrdersCount}
        unreadNotifsCount={unreadNotifsCount}
        onLaunchPOS={onLaunchPOS}
        onExitToLanding={onExitToLanding}
      />

      {/* Main Panel */}
      <div className="merchant-main">
        {/* Top Header */}
        <header className="merchant-header">
          <div className="merchant-header-left">
            <button 
              className="merchant-btn-secondary"
              style={{ padding: '6px 10px', display: 'none' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={18} />
            </button>

            <button 
              className="merchant-store-link-pill font-mono"
              onClick={onOpenStorefront}
              title="Open Public Customer Storefront"
              style={{ cursor: 'pointer', background: '#fafafa', border: '1px solid #e5e5e5' }}
            >
              <Store size={14} color="#2B7CFF" />
              <span>https://{storeProfile.slug}.stv.com</span>
              <span style={{ fontSize: '11px', color: '#2B7CFF', fontWeight: 700, marginLeft: '4px' }}>[Preview]</span>
            </button>
          </div>

          <div className="merchant-header-right">
            {/* Notifications Bell */}
            <button 
              className="merchant-btn-secondary"
              style={{ padding: '8px', position: 'relative', borderRadius: '8px' }}
              onClick={() => {
                setCurrentTab('notifications');
                setUnreadNotifsCount(0);
              }}
              title="View Notifications"
            >
              <Bell size={16} color={currentTab === 'notifications' ? '#2B7CFF' : '#525252'} />
              {unreadNotifsCount > 0 && (
                <span style={{ 
                  position: 'absolute', 
                  top: '5px', 
                  right: '5px', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#2563eb',
                  boxShadow: '0 0 0 2px #ffffff'
                }} />
              )}
            </button>

            {storeProfile.hasPhysicalStore && (
              <button className="merchant-btn-pos" onClick={onLaunchPOS}>
                <Terminal size={14} color="#2B7CFF" />
                <span>POS Till</span>
              </button>
            )}

            {onSignOut && (
              <button
                className="merchant-btn-secondary"
                onClick={onSignOut}
                style={{ fontSize: '13px' }}
                title={profile?.full_name || 'Sign out'}
              >
                Sign out
              </button>
            )}

            <button 
              className="merchant-btn-secondary"
              onClick={onExitToLanding}
              style={{ fontSize: '13px' }}
            >
              <ArrowLeft size={14} />
              <span>Exit</span>
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <main className="merchant-content">
          {currentTab === 'overview' && (
            <MerchantOverview
              storeProfile={storeProfile}
              products={products}
              orders={orders}
              onNavigateTab={(t) => {
                setCurrentTab(t);
                if (t === 'notifications') setUnreadNotifsCount(0);
              }}
              onOpenAddProduct={() => setIsAddProductOpen(true)}
              onOpenStorefront={onOpenStorefront}
            />
          )}

          {currentTab === 'analytics' && (
            <MerchantAnalytics
              products={products}
              orders={orders}
            />
          )}

          {currentTab === 'products' && (
            <MerchantProducts
              products={products}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              isAddModalOpen={isAddProductOpen}
              onCloseAddModal={() => setIsAddProductOpen(false)}
              onOpenAddModal={() => setIsAddProductOpen(true)}
            />
          )}

          {currentTab === 'orders' && (
            <MerchantOrders
              orders={orders}
              onUpdateOrderStatus={handleUpdateOrderStatus}
            />
          )}

          {currentTab === 'notifications' && (
            <MerchantNotifications
              onNavigateTab={(t) => setCurrentTab(t)}
            />
          )}

          {currentTab === 'settings' && (
            <MerchantSettings
              storeProfile={storeProfile}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
}
