import React, { useMemo, useState } from 'react';
import './Merchant.css';
import MerchantNav from './MerchantNav';
import MerchantOverview from './MerchantOverview';
import MerchantAnalytics from './MerchantAnalytics';
import MerchantProducts from './MerchantProducts';
import MerchantOrders from './MerchantOrders';
import MerchantNotifications from './MerchantNotifications';
import MerchantSettings from './MerchantSettings';
import { useMerchantStore } from '../../hooks/useMerchantStore';
import { isActiveOrder } from '../../lib/formatMoney';
import { BRAND } from '../../config/brand';
import {
  Store,
  Menu,
  Bell,
  ArrowLeft
} from 'lucide-react';

function buildNotifications(products, orders) {
  const items = [];
  orders.filter((order) => order.status === 'pending').forEach((order) => {
    items.push({
      id: `order-${order.id}`,
      type: 'order',
      title: `New storefront order (${order.customerName})`,
      desc: `${order.itemsSummary || 'Items pending packaging'} · ₦${Math.round(order.total).toLocaleString()}`,
      time: order.timeAgo,
      unread: true,
      action: 'view_order'
    });
  });
  orders.filter((order) => order.status === 'dispatched').forEach((order) => {
    items.push({
      id: `dispatch-${order.id}`,
      type: 'rider',
      title: `Order in transit (${order.customerName})`,
      desc: order.courierInfo?.courierName
        ? `${order.courierInfo.courierName} is on the way.`
        : 'Marked for dispatch. A courier will be assigned when the rider network is live.',
      time: order.timeAgo,
      unread: false,
      action: 'view_order'
    });
  });
  products.filter((product) => product.stock <= 5).forEach((product) => {
    items.push({
      id: `stock-${product.id}`,
      type: 'stock',
      title: product.stock === 0 ? `Out of stock: ${product.name}` : `Low stock: ${product.name}`,
      desc: product.stock === 0
        ? 'This item will not appear as available on the storefront.'
        : `Only ${product.stock} unit${product.stock === 1 ? '' : 's'} left.`,
      time: '',
      unread: product.stock === 0,
      action: 'restock'
    });
  });
  return items;
}

export default function MerchantApp({
  tenant,
  profile,
  membershipRole,
  onRefreshTenant,
  onSignOut,
  onOpenStorefront,
  onExitToLanding
}) {
  const canManage = membershipRole === 'owner' || membershipRole === 'admin';
  const store = useMerchantStore(tenant, { onTenantUpdated: onRefreshTenant });
  const [currentTab, setCurrentTab] = useState('overview');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clearedNotifs, setClearedNotifs] = useState(false);

  const notifications = useMemo(
    () => (clearedNotifs ? [] : buildNotifications(store.products, store.orders)),
    [store.products, store.orders, clearedNotifs]
  );
  const unreadNotifsCount = notifications.filter((item) => item.unread).length;
  const pendingOrdersCount = store.orders.filter(isActiveOrder).length;

  return (
    <div className="merchant-root">
      <MerchantNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setMobileMenuOpen(false);
        }}
        storeProfile={store.storeProfile}
        orderCount={pendingOrdersCount}
        unreadNotifsCount={unreadNotifsCount}
        onExitToLanding={onExitToLanding}
      />

      <div className="merchant-main">
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
              title="Open public storefront"
              style={{ cursor: 'pointer', background: '#fafafa', border: '1px solid #e5e5e5' }}
            >
              <Store size={14} color="#2B7CFF" />
              <span>
                {store.storeProfile.slug
                  ? `https://${store.storeProfile.slug}.${BRAND.domain}`
                  : BRAND.domain}
              </span>
            </button>
          </div>

          <div className="merchant-header-right">
            <button
              className="merchant-btn-secondary"
              style={{ padding: '8px', position: 'relative', borderRadius: '8px' }}
              onClick={() => setCurrentTab('notifications')}
              title="View notifications"
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

        <main className="merchant-content">
          {store.error && (
            <div className="merchant-card" style={{ padding: '14px 18px', marginBottom: '16px', color: '#b91c1c' }}>
              {store.error}
            </div>
          )}

          {currentTab === 'overview' && (
            <MerchantOverview
              storeProfile={store.storeProfile}
              products={store.products}
              orders={store.orders}
              loading={store.loading}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onOpenAddProduct={() => {
                setCurrentTab('products');
                setIsAddProductOpen(true);
              }}
              onOpenStorefront={onOpenStorefront}
            />
          )}

          {currentTab === 'analytics' && (
            <MerchantAnalytics
              products={store.products}
              orders={store.orders}
              loading={store.loading}
            />
          )}

          {currentTab === 'products' && (
            <MerchantProducts
              products={store.products}
              loading={store.loading}
              canManage={canManage}
              onSaveProduct={store.saveProduct}
              onDeleteProduct={store.deleteProduct}
              onSetProductActive={store.setProductActive}
              isAddModalOpen={isAddProductOpen}
              onCloseAddModal={() => setIsAddProductOpen(false)}
              onOpenAddModal={() => setIsAddProductOpen(true)}
            />
          )}

          {currentTab === 'orders' && (
            <MerchantOrders
              orders={store.orders}
              loading={store.loading}
              canManage={canManage}
              onUpdateOrderStatus={store.updateOrderStatus}
            />
          )}

          {currentTab === 'notifications' && (
            <MerchantNotifications
              notifications={notifications}
              onClear={() => setClearedNotifs(true)}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'settings' && (
            <MerchantSettings
              storeProfile={store.storeProfile}
              canManage={canManage}
              onSaveSettings={store.saveSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
}
