import React from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Bike,
  Plus,
  Store,
  Sparkles,
  PartyPopper,
  X,
  ShoppingCart
} from 'lucide-react';
import MerchantSalesChart from './MerchantSalesChart';
import Card from '../../shared/ui/Card';
import KpiTile from '../../shared/ui/KpiTile';
import DataTable from '../../shared/ui/DataTable';
import Badge from '../../shared/ui/Badge';
import { countedOrder, formatNaira, isActiveOrder, isThisMonth, isToday, shortOrderId } from '../../lib/formatMoney';
import { BRAND } from '../../config/brand';

const STATUS_TONE = { delivered: 'success', dispatched: 'info', pending: 'warning', cancelled: 'neutral' };
const STATUS_LABEL = { delivered: 'Delivered', dispatched: 'In transit', pending: 'New order', cancelled: 'Cancelled' };

export default function MerchantOverview({
  storeProfile,
  products = [],
  orders = [],
  loading = false,
  onNavigateTab,
  onOpenAddProduct,
  onOpenStorefront,
  onOpenOrder,
  showWelcome = false,
  onDismissWelcome
}) {
  const liveOrders = orders.filter(countedOrder);
  const todayOrders = liveOrders.filter((order) => isToday(order.createdAt));
  const monthOrders = liveOrders.filter((order) => isThisMonth(order.createdAt));
  const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const activeOrdersCount = liveOrders.filter(isActiveOrder).length;
  const inStockCount = products.filter((product) => product.isActive && product.stock > 0).length;
  const lowStockCount = products.filter((product) => product.stock > 0 && product.stock <= product.lowStockThreshold).length;
  const dispatchedCount = liveOrders.filter((order) => order.status === 'dispatched').length;

  return (
    <div>
      {showWelcome && (
        <div className="merchant-welcome-banner">
          <div className="merchant-welcome-icon">
            <PartyPopper size={18} />
          </div>
          <div className="merchant-welcome-text">
            <strong>
              {storeProfile.name ? `Welcome to Subtech, ${storeProfile.name}!` : 'Welcome to Subtech!'}
            </strong>
            <p>
              {storeProfile.slug
                ? `Your storefront is live at ${storeProfile.slug}.${BRAND.domain}. Add your first products and share the link to start taking orders.`
                : 'Your store is set up. Add your first products and share your storefront link to start taking orders.'}
            </p>
          </div>
          <button
            type="button"
            className="merchant-welcome-dismiss"
            onClick={onDismissWelcome}
            aria-label="Dismiss welcome message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <Card className="merchant-hero-card" noBodyPadding>
        <div className="merchant-hero-row">
          <div>
            <div className="merchant-hero-eyebrow">
              <span className="merchant-hero-pill">
                <Sparkles size={13} />
                Today's sales
              </span>
              <span className="merchant-hero-store-name">{storeProfile.name || 'Your store'}</span>
            </div>
            <h2 className="merchant-hero-value font-mono">{loading ? '…' : formatNaira(todayRevenue)}</h2>
            <p className="merchant-hero-sub">
              {todayOrders.length === 0
                ? 'No checkouts yet today. Share your storefront link to start taking orders.'
                : `${todayOrders.length} checkout${todayOrders.length === 1 ? '' : 's'} today.`}
            </p>
          </div>

          <div className="merchant-hero-actions">
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
      </Card>

      <div className="merchant-kpi-grid">
        <KpiTile
          icon={TrendingUp}
          label="Month-to-Date Volume"
          value={formatNaira(monthRevenue)}
          sub={`${monthOrders.length} order${monthOrders.length === 1 ? '' : 's'} this month`}
        />
        <KpiTile
          icon={ShoppingBag}
          label="Pending Orders"
          value={activeOrdersCount}
          sub={`${activeOrdersCount} requiring fulfillment`}
          tone={activeOrdersCount > 0 ? 'warning' : 'default'}
        />
        <KpiTile
          icon={Package}
          label="Live Shelf Stock"
          value={`${inStockCount} items`}
          sub={lowStockCount > 0 ? `${lowStockCount} items low in stock` : products.length === 0 ? 'Add products to go live' : 'All listed items in stock'}
          tone={lowStockCount > 0 ? 'danger' : 'default'}
        />
        <KpiTile
          icon={Bike}
          label="In Transit"
          value={dispatchedCount}
          sub="Orders currently out for delivery"
        />
      </div>

      <MerchantSalesChart orders={liveOrders} />

      <Card>
        <div className="merchant-storefront-share">
          <div className="merchant-storefront-share-left">
            <div className="merchant-storefront-share-icon">
              <Store size={22} />
            </div>
            <div>
              <h4>Your live storefront URL</h4>
              <p>Share this link on WhatsApp, Instagram, or flyers.</p>
            </div>
          </div>
          <div className="merchant-storefront-share-right">
            <span className="merchant-storefront-url font-mono">
              https://{storeProfile.slug || 'your-store'}.{BRAND.domain}
            </span>
            <button className="merchant-btn-primary" onClick={onOpenStorefront}>
              <span>Visit Webstore</span>
            </button>
          </div>
        </div>
      </Card>

      <Card
        title="Recent Customer Orders"
        action={
          <button className="merchant-btn-secondary" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => onNavigateTab('orders')}>
            View All Orders →
          </button>
        }
        noBodyPadding
      >
        <DataTable
          loading={loading}
          empty={{
            icon: ShoppingCart,
            title: 'No orders yet',
            desc: 'Orders appear here as soon as a shopper checks out on your storefront.'
          }}
          rows={liveOrders.slice(0, 6)}
          onRowClick={(order) => onOpenOrder && onOpenOrder(order.id)}
          columns={[
            { key: 'id', header: 'Order #', render: (o) => <span className="font-mono">{shortOrderId(o.id)}</span> },
            {
              key: 'customer',
              header: 'Customer',
              render: (o) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{o.customerName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mx-text-3)' }}>{o.address}</div>
                </div>
              )
            },
            {
              key: 'items',
              header: 'Items',
              render: (o) => o.lineItems.length
                ? o.lineItems.map((li) => li.productName).join(', ')
                : '—'
            },
            { key: 'total', header: 'Total', render: (o) => <span className="font-mono" style={{ fontWeight: 700 }}>{formatNaira(o.total)}</span> },
            {
              key: 'status',
              header: 'Status',
              render: (o) => <Badge tone={STATUS_TONE[o.status] || 'neutral'}>{STATUS_LABEL[o.status] || o.status}</Badge>
            }
          ]}
        />
      </Card>
    </div>
  );
}
