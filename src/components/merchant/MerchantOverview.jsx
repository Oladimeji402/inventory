import { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Bike,
  Check,
  PackageX,
  PartyPopper,
  ShoppingBag,
  TrendingUp,
  Wallet,
  X
} from 'lucide-react';
import { AreaChart, ErrorBanner, Link, Notice, PageHeader, Panel, Skeleton, StatCard } from './ui';
import { count, longDay, money, percentChange, shortDay } from './format';

function Attention({ overview, navigate }) {
  const a = overview.attention || {};
  const items = [
    {
      key: 'new',
      icon: ShoppingBag,
      n: a.newOrders,
      title: 'Paid orders to pack',
      sub: 'Customers are waiting for these',
      to: '/orders?view=new',
      tone: '#2563eb',
      tint: '#dbeafe'
    },
    {
      key: 'transfer',
      icon: Banknote,
      n: a.awaitingTransferCount,
      title: 'Bank transfers to confirm',
      sub: a.awaitingTransferCount ? `${money(a.awaitingTransferAmount)} waiting on you` : 'Nothing waiting',
      to: '/orders?view=awaiting_payment',
      tone: '#d97706',
      tint: '#fef3c7'
    },
    {
      key: 'transit',
      icon: Bike,
      n: a.inTransit,
      title: 'Out for delivery',
      sub: 'On their way to customers',
      to: '/orders?view=in_transit',
      tone: '#0f766e',
      tint: '#ccfbf1'
    },
    {
      key: 'out',
      icon: PackageX,
      n: a.outOfStock,
      title: 'Out of stock',
      sub: 'Hidden from shoppers until restocked',
      to: '/products?view=out',
      tone: '#dc2626',
      tint: '#fee2e2'
    },
    {
      key: 'low',
      icon: AlertTriangle,
      n: a.lowStock,
      title: 'Running low',
      sub: 'At or below the alert level',
      to: '/products?view=low',
      tone: '#d97706',
      tint: '#fef3c7'
    }
  ];
  const open = items.filter((item) => Number(item.n) > 0);

  if (!open.length) {
    return (
      <div className="mc-empty" style={{ padding: '28px 12px' }}>
        <span className="mc-empty-icon"><Check size={20} /></span>
        <strong>You&apos;re all caught up</strong>
        No orders to pack, no transfers to confirm and nothing low on stock.
      </div>
    );
  }

  return (
    <div className="mc-stack" style={{ gap: 10 }}>
      {open.map((item) => (
        <Link key={item.key} to={item.to} navigate={navigate} className="mc-queue-item">
          <span className="mc-stat-icon" style={{ background: item.tint, color: item.tone }}><item.icon size={17} /></span>
          <b>{count(item.n)}</b>
          <span style={{ minWidth: 0 }}>
            {item.title}
            <small>{item.sub}</small>
          </span>
        </Link>
      ))}
      {Array.isArray(a.lowStockItems) && a.lowStockItems.length > 0 && (
        <ul className="mc-note" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          {a.lowStockItems.map((item) => (
            <li key={item.id}>{item.name}: <b className="mc-mono">{item.stock}</b> left</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function buildChecklist(overview, store, storefrontUrl) {
  const c = overview.checklist || {};
  const active = c.tenantStatus === 'active';
  return [
    { key: 'product', done: c.productCount > 0, title: 'Add your first product', text: 'Shoppers can only buy what is in your catalogue.', to: '/products' },
    { key: 'contact', done: Boolean(c.hasAddress && c.hasPhone), title: 'Add your address and phone number', text: 'Customers and riders use these to find and reach you.', to: '/settings' },
    { key: 'area', done: Boolean(c.hasCorridor), title: 'Choose your delivery area', text: 'The marketplace lists stores by the area they deliver in.', to: '/settings' },
    { key: 'bank', done: Boolean(c.hasSettlementAccount), title: 'Add your settlement bank account', text: 'Where your sales will be paid once payouts are switched on.', to: '/payouts' },
    {
      key: 'live',
      done: active,
      info: !active,
      title: active ? 'Your store is live on Subtech' : 'Waiting for Subtech to activate your store',
      text: active
        ? `Shoppers can find you at ${(storefrontUrl || '').replace(/^https?:\/\//, '') || 'your storefront link'}.`
        : `Current status: ${c.tenantStatus || 'unknown'}. You don't need to do anything for this step.`
    },
    { key: 'order', done: c.orderCount > 0, title: 'Receive your first order', text: 'Share your storefront link on WhatsApp or Instagram.' },
    { key: 'staff', done: c.staffCount > 0, optional: true, title: 'Add a cashier or online sales rep (optional)', text: 'Give your team PIN logins instead of sharing yours.', to: '/staff' }
  ];
}

function SetupChecklist({ overview, store, storefrontUrl, navigate }) {
  const steps = buildChecklist(overview, store, storefrontUrl);
  const required = steps.filter((s) => !s.optional);
  const doneCount = required.filter((s) => s.done).length;
  const allDone = doneCount === required.length;
  return (
    <Panel title="Store setup" subtitle={allDone ? 'Everything required is done.' : `${doneCount} of ${required.length} steps done`}>
      <div className="mc-progress" aria-hidden="true"><div style={{ width: `${(doneCount / required.length) * 100}%` }} /></div>
      <ul className="mc-checklist">
        {steps.map((step) => (
          <li key={step.key} className={`${step.done ? 'done' : ''} ${step.info ? 'info' : ''}`}>
            <span className="mc-check-mark">{step.done && <Check size={13} />}</span>
            <span>
              <b>{step.title}</b>
              <small>{step.text}</small>
            </span>
            {!step.done && step.to && <Link to={step.to} navigate={navigate}>Do this</Link>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function MerchantOverview({ navigate, overview: query, store, showWelcome, storefrontUrl, onOpenStorefront }) {
  const [welcomeOpen, setWelcomeOpen] = useState(Boolean(showWelcome));
  const { data, loading, error, reload } = query;
  const o = data || {};
  const period = o.period || {};
  const series = (o.series || []).map((d) => ({
    value: Number(d.sales) || 0,
    label: shortDay(d.date),
    full: longDay(d.date),
    sub: `${d.orders} order${Number(d.orders) === 1 ? '' : 's'}`
  }));
  const aov = period.orders ? period.sales / period.orders : 0;
  const prevAov = period.previousOrders ? period.previousSales / period.previousOrders : 0;
  const checklist = o.checklist || {};

  return (
    <>
      <PageHeader
        title={`Welcome back${store?.trading_name ? `, ${store.trading_name}` : ''}`}
        subtitle="Sales are paid orders, excluding delivery fees. Cancelled and refunded orders are left out."
      />

      {welcomeOpen && (
        <div className="mc-notice mc-notice-info" style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PartyPopper size={20} color="#2563eb" />
          <span style={{ flex: 1 }}>
            <strong>Your store is set up.</strong>{' '}
            Add your first products, then share your storefront link to start taking orders.
          </span>
          <button type="button" className="mc-btn mc-btn-sm" onClick={() => setWelcomeOpen(false)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      <ErrorBanner message={error} onRetry={reload} />

      {checklist.acceptingOrders === false && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="warn" title="Online orders are paused">
            Shoppers cannot place new orders until you turn them back on in{' '}
            <Link to="/settings" navigate={navigate} style={{ color: 'inherit', fontWeight: 700 }}>Settings</Link>.
          </Notice>
        </div>
      )}

      <div className="mc-grid mc-grid-4" style={{ marginBottom: 16 }}>
        <StatCard
          label="Today's sales"
          icon={Wallet}
          value={o.today?.sales}
          format={(n) => money(n)}
          loading={loading && !data}
          hint={data ? `${o.today?.orders || 0} paid order${o.today?.orders === 1 ? '' : 's'} today` : undefined}
          delay={0}
        />
        <StatCard
          label="Sales · 30 days"
          icon={TrendingUp}
          tint="#dcfce7"
          color="#16a34a"
          value={period.sales}
          format={(n) => money(n)}
          delta={data ? percentChange(period.sales, period.previousSales) : undefined}
          hint="vs previous 30 days"
          loading={loading && !data}
          delay={60}
        />
        <StatCard
          label="Orders · 30 days"
          icon={ShoppingBag}
          tint="#ede9fe"
          color="#7c3aed"
          value={period.orders}
          delta={data ? percentChange(period.orders, period.previousOrders) : undefined}
          hint="vs previous 30 days"
          loading={loading && !data}
          delay={120}
        />
        <StatCard
          label="Average order"
          icon={Banknote}
          tint="#fef3c7"
          color="#d97706"
          value={aov}
          format={(n) => money(n)}
          delta={data ? percentChange(aov, prevAov) : undefined}
          hint="per paid order"
          loading={loading && !data}
          delay={180}
        />
      </div>

      <div className="mc-grid mc-grid-main" style={{ marginBottom: 16 }}>
        <Panel title="Sales, last 30 days" subtitle="Paid orders per day (Lagos time)">
          {loading && !data ? <Skeleton height={240} /> : data ? <AreaChart data={series} /> : <p className="mc-note" style={{ margin: 0 }}>Sales could not be loaded.</p>}
        </Panel>
        <Panel title="Needs your attention" subtitle="Live from your orders and stock">
          {loading && !data ? (
            <div className="mc-stack"><Skeleton height={54} /><Skeleton height={54} /><Skeleton height={54} /></div>
          ) : data ? (
            <Attention overview={o} navigate={navigate} />
          ) : (
            <p className="mc-note">Attention items could not be loaded.</p>
          )}
        </Panel>
      </div>

      {data && <SetupChecklist overview={o} store={store} storefrontUrl={storefrontUrl} navigate={navigate} />}

      <p className="mc-note" style={{ marginTop: 14 }}>
        Your storefront:{' '}
        <button type="button" className="mc-btn mc-btn-sm" style={{ marginLeft: 6 }} onClick={onOpenStorefront}>
          {(storefrontUrl || '').replace(/^https?:\/\//, '') || 'Not available yet'}
        </button>
      </p>
    </>
  );
}
