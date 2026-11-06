import { useMemo, useState } from 'react';
import { Ban, CheckCircle2 } from 'lucide-react';
import { cancelOrder, fetchOrder, fetchPlatformOrders, markOrderPaid } from '../../../services/admin';
import {
  ActionDialog, Badge, DataTable, ErrorBanner, FilterChips, KeyValues, Link, PageHeader, Panel, SearchBox, useAsync
} from '../ui';
import { dateTime, money, shortId, statusLabel } from '../format';

const STATUS_FILTERS = ['all', 'pending', 'dispatched', 'delivered', 'cancelled'];

export function OrdersPage({ navigate, refreshKey }) {
  const orders = useAsync(() => fetchPlatformOrders(300), [refreshKey]);
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [payment, setPayment] = useState('all');
  const [search, setSearch] = useState('');

  const all = orders.data || [];
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((o) => {
      if (status !== 'all' && o.status !== status) return false;
      if (channel !== 'all' && o.channel !== channel) return false;
      if (payment !== 'all' && o.paymentStatus !== payment) return false;
      return !term || `${o.id} ${o.storeName} ${o.customerName} ${o.customerPhone} ${o.itemsSummary}`.toLowerCase().includes(term);
    });
  }, [all, status, channel, payment, search]);

  return (
    <>
      <PageHeader title="Orders" subtitle={`Latest ${all.length} orders across every store and till.`} />
      <ErrorBanner message={orders.error} onRetry={orders.reload} />
      <div className="ad-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search order id, store, customer, phone, items" />
        <select className="ad-select" style={{ width: 170 }} value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Channel">
          <option value="all">All channels</option><option value="online">Online storefront</option><option value="counter">Counter till</option>
        </select>
        <select className="ad-select" style={{ width: 170 }} value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Payment status">
          <option value="all">Any payment</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="failed">Failed</option>
        </select>
      </div>
      <div className="ad-toolbar">
        <FilterChips value={status} onChange={setStatus} options={STATUS_FILTERS.map((s) => ({ value: s, label: s === 'all' ? 'All' : statusLabel(s), count: s === 'all' ? all.length : all.filter((o) => o.status === s).length }))} />
      </div>
      <Panel flush>
        <DataTable
          loading={orders.loading && !orders.data}
          rows={rows}
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
          empty={{ title: 'No orders match', text: 'Try clearing a filter.' }}
          columns={[
            { key: 'id', header: 'Order', render: (o) => <span className="ad-mono ad-cell-main">#{shortId(o.id)}</span> },
            { key: 'store', header: 'Store', render: (o) => <><div className="ad-cell-main">{o.storeName}</div><div className="ad-cell-sub">{o.channel === 'counter' ? 'Counter till' : o.fulfillmentType === 'pickup' ? 'Online · pickup' : 'Online · delivery'}</div></> },
            { key: 'customer', header: 'Customer', render: (o) => <><div>{o.customerName || '—'}</div><div className="ad-cell-sub">{o.customerPhone || ''}</div></> },
            { key: 'items', header: 'Items', render: (o) => <span className="ad-cell-sub" style={{ maxWidth: 220, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.itemsSummary || '—'}</span> },
            { key: 'status', header: 'Status', render: (o) => <Badge status={o.status} /> },
            { key: 'pay', header: 'Payment', render: (o) => <><Badge status={o.paymentStatus} /><div className="ad-cell-sub">{o.paymentMethod}</div></> },
            { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="ad-mono ad-cell-main">{money(o.total)}</span> },
            { key: 'time', header: 'Placed', render: (o) => dateTime(o.createdAt) }
          ]}
        />
      </Panel>
    </>
  );
}

function OrderTimeline({ order }) {
  const cancelled = order.status === 'cancelled';
  const steps = [
    { label: 'Order placed', at: order.createdAt, done: true },
    { label: order.paymentStatus === 'paid' ? `Payment received (${order.paymentMethod})` : `Awaiting payment (${order.paymentMethod})`, done: order.paymentStatus === 'paid' },
    ...(order.channel === 'online' && order.fulfillmentType === 'delivery'
      ? [{ label: order.rider ? `Rider assigned: ${order.rider.name}` : 'Waiting for a rider', done: Boolean(order.rider) }]
      : []),
    cancelled
      ? { label: `Cancelled${order.voidReason ? `: ${order.voidReason}` : ''}`, at: order.voidedAt, done: true, bad: true }
      : { label: order.status === 'delivered' ? 'Delivered' : 'Delivery pending', at: order.status === 'delivered' ? order.updatedAt : null, done: order.status === 'delivered' }
  ];
  return (
    <ul className="ad-timeline">
      {steps.map((step) => (
        <li key={step.label} className={step.bad ? 'bad' : step.done ? 'done' : ''}>
          <i />
          <div><div className="ad-cell-main">{step.label}</div>{step.at && <div className="ad-cell-sub">{dateTime(step.at)}</div>}</div>
        </li>
      ))}
    </ul>
  );
}

export function OrderDetailPage({ navigate, notify, orderId, refreshKey, onChanged }) {
  const order = useAsync(() => fetchOrder(orderId), [orderId, refreshKey]);
  const [dialog, setDialog] = useState(null);
  const o = order.data;

  const done = (message) => {
    notify(message);
    order.reload({ silent: true });
    onChanged?.();
  };

  const canMarkPaid = o && o.paymentMethod === 'Transfer' && o.paymentStatus === 'unpaid' && o.status !== 'cancelled';
  const canCancel = o && (o.status === 'pending' || o.status === 'dispatched');

  return (
    <>
      <PageHeader
        back={{ to: '/orders', label: 'All orders' }} navigate={navigate}
        title={o ? `Order #${shortId(o.id)}` : 'Order'}
        subtitle={o ? `${o.storeName} · ${dateTime(o.createdAt)}` : undefined}
        actions={o && (
          <>
            <Badge status={o.status} /><Badge status={o.paymentStatus} />
            {canMarkPaid && <button type="button" className="ad-btn ad-btn-ok ad-btn-sm" onClick={() => setDialog('paid')}><CheckCircle2 size={14} /> Mark transfer as paid</button>}
            {canCancel && <button type="button" className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => setDialog('cancel')}><Ban size={14} /> Cancel order</button>}
          </>
        )}
      />
      <ErrorBanner message={order.error} onRetry={order.reload} />

      {o && (
        <div className="ad-grid ad-grid-main">
          <div className="ad-stack">
            <Panel flush title="Items">
              <DataTable rows={o.items} rowKey={(i) => i.name + i.unitPrice} empty={{ title: 'No line items recorded' }} columns={[
                { key: 'n', header: 'Item', render: (i) => <span className="ad-cell-main">{i.name}</span> },
                { key: 'q', header: 'Qty', align: 'right', render: (i) => <span className="ad-mono">{i.quantity}</span> },
                { key: 'p', header: 'Unit price', align: 'right', render: (i) => <span className="ad-mono">{money(i.unitPrice)}</span> },
                { key: 't', header: 'Total', align: 'right', render: (i) => <span className="ad-mono">{money(i.lineTotal)}</span> }
              ]} />
              <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: 28, borderTop: '1px solid var(--line)' }}>
                {Number(o.deliveryFee) > 0 && <span className="ad-cell-sub">Delivery fee <b className="ad-mono">{money(o.deliveryFee)}</b></span>}
                <span>Total <b className="ad-mono ad-display" style={{ fontSize: '1.2rem' }}>{money(o.total)}</b></span>
              </div>
            </Panel>
            <Panel title="Progress"><OrderTimeline order={o} /></Panel>
          </div>

          <div className="ad-stack">
            <Panel title="Customer">
              <KeyValues items={[['Name', o.customerName], ['Phone', o.customerPhone], ['Fulfilment', o.fulfillmentType === 'pickup' ? 'Store pickup' : o.channel === 'counter' ? 'Counter sale' : 'Delivery'], ['Address', o.address, true]]} />
            </Panel>
            <Panel title="Store">
              <KeyValues items={[['Store', <Link key="s" to={`/stores/${o.storeId}`} navigate={navigate} style={{ color: 'var(--primary)' }}>{o.storeName}</Link>], ['Channel', o.channel === 'counter' ? 'Counter till' : 'Online storefront'], ['Cashier', o.cashier]]} />
            </Panel>
            <Panel title="Payment">
              <KeyValues items={[['Method', o.paymentMethod], ['Status', <Badge key="p" status={o.paymentStatus} />], ['Reference', o.paymentReference ? <span key="r" className="ad-mono">{o.paymentReference}</span> : null, true]]} />
              {o.status === 'cancelled' && o.paymentStatus === 'paid' && (
                <p className="ad-note">This order was paid before it was cancelled. Cancelling does not refund money; refund the customer in your payment provider.</p>
              )}
            </Panel>
            {o.channel === 'online' && o.fulfillmentType === 'delivery' && (
              <Panel title="Courier">
                {o.rider ? (
                  <KeyValues items={[['Rider', <Link key="r" to={`/riders/${o.rider.id}`} navigate={navigate} style={{ color: 'var(--primary)' }}>{o.rider.name}</Link>], ['Phone', o.rider.phone], ['Fare', money(o.courierFare)], ['Tip', money(o.courierTip)]]} />
                ) : <p className="ad-note" style={{ margin: 0 }}>No rider has accepted this delivery yet.</p>}
              </Panel>
            )}
          </div>
        </div>
      )}

      {dialog === 'paid' && (
        <ActionDialog title="Mark this transfer as paid?" description="Only do this after you have seen the money in the store's account. The order then becomes available to riders." tone="ok" confirmLabel="Mark as paid"
          onClose={() => setDialog(null)}
          onConfirm={async () => { await markOrderPaid(o.id); done('Order marked as paid.'); }} />
      )}
      {dialog === 'cancel' && (
        <ActionDialog title="Cancel this order?" description="The items go back into stock. Money is not refunded automatically." tone="danger" confirmLabel="Cancel order"
          inputLabel="Reason" inputRequired inputPlaceholder="e.g. Customer could not be reached" onClose={() => setDialog(null)}
          onConfirm={async (reason) => { await cancelOrder(o.id, reason); done('Order cancelled and stock returned.'); }} />
      )}
    </>
  );
}
