import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Merchant.css';
import MerchantNav from './MerchantNav';
import MerchantOverview from './MerchantOverview';
import MerchantAnalytics from './MerchantAnalytics';
import MerchantProducts from './MerchantProducts';
import MerchantOrders from './MerchantOrders';
import MerchantCustomers from './MerchantCustomers';
import MerchantNotifications from './MerchantNotifications';
import MerchantSettings from './MerchantSettings';
import { useMerchantStore } from '../../hooks/useMerchantStore';
import { isActiveOrder } from '../../lib/formatMoney';
import { BRAND } from '../../config/brand';
import { ToastProvider } from '../../shared/ui/Toast';
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
  products.filter((product) => product.stock <= product.lowStockThreshold).forEach((product) => {
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

function readNotifStorageKey(tenantId) {
  return `subtech.merchant.notifs.read.${tenantId}`;
}

function loadReadIds(tenantId) {
  if (!tenantId) return new Set();
  try {
    const raw = window.localStorage.getItem(readNotifStorageKey(tenantId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(tenantId, ids) {
  if (!tenantId) return;
  try {
    window.localStorage.setItem(readNotifStorageKey(tenantId), JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage unavailable (private mode, etc.) — read state just won't persist
  }
}

function MerchantAppInner({
  tenant,
  profile,
  membershipRole,
  justOnboarded = false,
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
  const [showWelcome, setShowWelcome] = useState(justOnboarded);
  const [readIds, setReadIds] = useState(() => new Set());
  const [openOrderId, setOpenOrderId] = useState(null);

  useEffect(() => {
    setReadIds(loadReadIds(tenant?.id));
  }, [tenant?.id]);

  const notifications = useMemo(() => {
    return buildNotifications(store.products, store.orders).map((item) => ({
      ...item,
      unread: item.unread && !readIds.has(item.id)
    }));
  }, [store.products, store.orders, readIds]);

  const markAllNotifsRead = useCallback(() => {
    setReadIds((current) => {
      const next = new Set(current);
      notifications.forEach((item) => next.add(item.id));
      saveReadIds(tenant?.id, next);
      return next;
    });
  }, [notifications, tenant?.id]);

  const unreadNotifsCount = notifications.filter((item) => item.unread).length;
  const pendingOrdersCount = store.orders.filter(isActiveOrder).length;

  const goToTab = (tab) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="merchant-root">
      <MerchantNav
        currentTab={currentTab}
        onSelectTab={goToTab}
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
              onClick={() => goToTab('notifications')}
              title="View notifications"
            >
              <Bell size={16} color={currentTab === 'notifications' ? '#2B7CFF' : '#525252'} />
              {unreadNotifsCount > 0 && <span className="merchant-header-bell-dot" />}
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

            <button className="merchant-btn-secondary" onClick={onExitToLanding} style={{ fontSize: '13px' }}>
              <ArrowLeft size={14} />
              <span>Exit</span>
            </button>
          </div>
        </header>

        <main className="merchant-content">
          {store.error && <div className="merchant-form-error" style={{ marginBottom: 16 }}>{store.error}</div>}

          {currentTab === 'overview' && (
            <MerchantOverview
              storeProfile={store.storeProfile}
              products={store.products}
              orders={store.orders}
              loading={store.loading}
              onNavigateTab={goToTab}
              onOpenAddProduct={() => {
                goToTab('products');
                setIsAddProductOpen(true);
              }}
              onOpenOrder={(orderId) => {
                setOpenOrderId(orderId);
                goToTab('orders');
              }}
              onOpenStorefront={onOpenStorefront}
              showWelcome={showWelcome}
              onDismissWelcome={() => setShowWelcome(false)}
            />
          )}

          {currentTab === 'analytics' && (
            <MerchantAnalytics
              products={store.products}
              orders={store.orders}
              customers={store.customers}
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
              onUploadImage={store.uploadProductImage}
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
              openOrderId={openOrderId}
              onOrderOpened={() => setOpenOrderId(null)}
            />
          )}

          {currentTab === 'customers' && (
            <MerchantCustomers
              customers={store.customers}
              orders={store.orders}
              loading={store.loading}
              canManage={canManage}
              onSaveCustomer={store.saveCustomer}
            />
          )}

          {currentTab === 'notifications' && (
            <MerchantNotifications
              notifications={notifications}
              onMarkAllRead={markAllNotifsRead}
              onNavigateTab={goToTab}
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

export default function MerchantApp(props) {
  return (
    <ToastProvider>
      <MerchantAppInner {...props} />
    </ToastProvider>
  );
}
