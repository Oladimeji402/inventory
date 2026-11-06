import { useEffect, useRef, useState } from 'react';
import { Banknote, Bike, Check, Download, Loader2, PackageCheck, Printer, ShoppingBag, Store, XCircle } from 'lucide-react';
import { exportOrdersCsv } from './exports';
import {
  cancelOrder,
  fetchAllOrders,
  fetchOrder,
  fetchOrders,
  markOrderPaid,
  markOrderReady,
  updateOrderStatus
} from '../../services/merchant';
import {
  ActionDialog,
  Badge,
  DataTable,
  ErrorBanner,
  FilterChips,
  KeyValues,
  Notice,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  Skeleton,
  useAsync,
  useDebounced
} from './ui';
import { DASH, ORDER_STATUS_LABEL, dateTime, money, nextOrderStep, shortOrderId, timeAgo } from './format';

const PAGE_SIZE = 25;

function readParam(name, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  return new URLSearchParams(window.location.search).get(name) || fallback;
}

function writeParams(params) {
  if (typeof window === 'undefined') return;
  const search = new URLSearchParams(window.location.search);
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
    else search.delete(key);
  });
  const query = search.toString();
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

export function OrderStatusBadge({ order }) {
  if (order.status === 'pending' && order.paymentStatus !== 'paid') {
    return <Badge tone="warn">Awaiting payment</Badge>;
  }
  if (order.status === 'pending') return <Badge tone="info">{order.readyAt ? 'Packed' : 'To pack'}</Badge>;
  return <Badge status={order.status}>{ORDER_STATUS_LABEL[order.status]}</Badge>;
}

export function PaymentBadge({ order }) {
  const labels = { paid: 'Paid', unpaid: 'Unpaid', failed: 'Failed', refunded: 'Refunded' };
  return (
    <span className="mc-row" style={{ gap: 6 }}>
      <Badge status={order.paymentStatus}>{labels[order.paymentStatus] || order.paymentStatus}</Badge>
      <span className="mc-cell-sub" style={{ margin: 0 }}>{order.paymentMethod}</span>
    </span>
  );
}

function typeLabel(order) {
  if (order.channel === 'counter') return 'Counter sale';
  return order.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery';
}

const VIEWS = [
  { value: 'all', label: 'All', key: 'all' },
  { value: 'new', label: 'To pack', key: 'new' },
  { value: 'awaiting_payment', label: 'Awaiting payment', key: 'awaiting_payment' },
  { value: 'in_transit', label: 'Out for delivery', key: 'in_transit' },
  { value: 'delivered', label: 'Completed', key: 'delivered' },
  { value: 'cancelled', label: 'Cancelled', key: 'cancelled' }
];

export function MerchantOrders({ navigate, refreshKey, notify }) {
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState(() => readParam('view', 'all'));
  const [search, setSearch] = useState(() => readParam('q'));
  const [channel, setChannel] = useState(() => readParam('channel'));
  const [page, setPage] = useState(0);
  const debounced = useDebounced(search);
  const seen = useRef(false);

  useEffect(() => {
    writeParams({ view: view === 'all' ? '' : view, q: debounced, channel });
  }, [view, debounced, channel]);

  const { data, loading, error, reload } = useAsync(
    () => fetchOrders({ view, search: debounced, channel, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [view, debounced, channel, page]
  );

  // Live refresh keeps the current page on screen while it updates.
  useEffect(() => {
    if (!seen.current) {
      seen.current = true;
      return;
    }
    reload({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const counts = data?.counts || {};
  const rows = data?.rows || [];

  const changeView = (next) => { setView(next); setPage(0); };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllOrders({ view, search: debounced, channel });
      exportOrdersCsv(all.rows);
      notify(all.truncated ? `Exported the newest ${all.rows.length} of ${all.total} orders` : `Exported ${all.rows.length} orders`);
    } catch (err) {
      notify(err.message, 'bad');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Online orders from your storefront and sales rung up at your counter."
        actions={<button type="button" className="mc-btn" onClick={exportCsv} disabled={exporting}><Download size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}</button>}
      />
      <ErrorBanner message={error} onRetry={reload} />

      <div className="mc-toolbar">
        <FilterChips
          label="Order view"
          value={view}
          onChange={changeView}
          options={VIEWS.map((v) => ({ value: v.value, label: v.label, count: data ? counts[v.key] : undefined }))}
        />
      </div>
      <div className="mc-toolbar">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search name, phone or order number" />
        <select className="mc-select" style={{ width: 'auto' }} value={channel} onChange={(e) => { setChannel(e.target.value); setPage(0); }} aria-label="Channel">
          <option value="">All channels</option>
          <option value="online">Online</option>
          <option value="counter">Counter</option>
        </select>
      </div>

      {(data || loading) && <section className="mc-card">
        <DataTable
          loading={loading && !data}
          rows={rows}
          onRowClick={(order) => navigate(`/orders/${order.id}`)}
          empty={{
            icon: ShoppingBag,
            title: view === 'all' && !debounced ? 'No orders yet' : 'No orders match this view',
            text: view === 'all' && !debounced
              ? 'Orders appear here the moment a shopper checks out on your storefront or you ring up a sale.'
              : 'Try a different filter or search.'
          }}
          columns={[
            {
              key: 'id',
              header: 'Order',
              render: (o) => (
                <>
                  <div className="mc-cell-main mc-mono">{shortOrderId(o.id)}</div>
                  <div className="mc-cell-sub">{timeAgo(o.createdAt)}</div>
                </>
              )
            },
            {
              key: 'customer',
              header: 'Customer',
              render: (o) => (
                <>
                  <div className="mc-cell-main">{o.customerName || DASH}</div>
                  <div className="mc-cell-sub">{o.customerPhone || (o.channel === 'counter' ? 'Walk-in' : '')}</div>
                </>
              )
            },
            { key: 'type', header: 'Type', render: (o) => <><div>{typeLabel(o)}</div><div className="mc-cell-sub">{o.itemCount} item{Number(o.itemCount) === 1 ? '' : 's'}</div></> },
            { key: 'payment', header: 'Payment', render: (o) => <PaymentBadge order={o} /> },
            { key: 'status', header: 'Status', render: (o) => <OrderStatusBadge order={o} /> },
            { key: 'total', header: 'Total', align: 'right', render: (o) => <b className="mc-mono">{money(o.total)}</b> }
          ]}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onChange={setPage} />
      </section>}
    </>
  );
}

function Timeline({ order }) {
  const steps = [];
  steps.push({ label: order.channel === 'counter' ? 'Sold at the counter' : 'Order placed', at: order.createdAt, done: true });
  if (order.channel === 'online') {
    steps.push({
      label: order.paymentStatus === 'paid' ? 'Payment confirmed' : order.paymentStatus === 'refunded' ? 'Payment refunded' : 'Payment',
      at: null,
      done: order.paymentStatus === 'paid' || order.paymentStatus === 'refunded',
      note: order.paymentStatus === 'paid' ? undefined : 'Not received yet'
    });
    if (order.status !== 'cancelled') {
      steps.push({ label: 'Packed and ready', at: order.readyAt, done: Boolean(order.readyAt) });
      if (order.fulfillmentType === 'delivery') {
        steps.push({
          label: order.rider ? `Accepted by rider ${order.rider.name}` : 'Out for delivery',
          at: order.dispatchedAt,
          done: Boolean(order.dispatchedAt) || order.status === 'dispatched' || order.status === 'delivered'
        });
        if (order.rider) steps.push({ label: 'Picked up by rider', at: order.pickedUpAt, done: Boolean(order.pickedUpAt) });
      }
      steps.push({ label: order.fulfillmentType === 'pickup' ? 'Collected by customer' : 'Delivered', at: order.deliveredAt, done: order.status === 'delivered' });
    }
  }
  if (order.status === 'cancelled') {
    steps.push({ label: 'Cancelled', at: order.voidedAt, done: true, bad: true, note: order.voidReason ? `${order.voidReason}${order.voidedBy ? ` — ${order.voidedBy}` : ''}` : undefined });
  }
  return (
    <ul className="mc-timeline">
      {steps.map((step) => (
        <li key={step.label} className={step.bad ? 'bad' : step.done ? 'done' : ''}>
          <i />
          <span>
            <b>{step.label}</b>
            <small>{step.at ? dateTime(step.at) : step.note || (step.done ? '' : 'Not yet')}{step.at && step.note ? ` · ${step.note}` : ''}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MerchantOrderDetail({ orderId, navigate, notify, refreshKey, canManage, onChanged }) {
  const { data: order, loading, error, reload } = useAsync(() => fetchOrder(orderId), [orderId]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    if (!seen.current) {
      seen.current = true;
      return;
    }
    reload({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const run = async (fn, success) => {
    setBusy(true);
    try {
      await fn();
      notify(success);
      await reload({ silent: true });
      onChanged();
    } catch (err) {
      notify(err.message || 'That did not work.', 'bad');
    } finally {
      setBusy(false);
    }
  };

  const title = order ? `Order ${shortOrderId(order.id)}` : 'Order';
  const step = nextOrderStep(order ? { ...order, hasRider: Boolean(order.rider) } : null);
  const tone = step.key === 'cancelled' ? 'bad' : step.key === 'done' ? 'done' : ['confirm_payment', 'await_card'].includes(step.key) ? 'warn' : '';
  const canCancel = order && canManage && ['pending', 'dispatched'].includes(order.status) && !order.rider;

  return (
    <>
      <PageHeader
        title={title}
        subtitle={order ? `${typeLabel(order)} · placed ${dateTime(order.createdAt)}` : undefined}
        back={{ to: '/orders', label: 'All orders' }}
        navigate={navigate}
        actions={order && <><OrderStatusBadge order={order} /><PaymentBadge order={order} /><button type="button" className="mc-btn mc-btn-sm" onClick={() => window.print()}><Printer size={14} /> Print slip</button></>}
      />
      <ErrorBanner message={error} onRetry={reload} />
      {loading && !order && <Skeleton height={320} />}

      {order && (
        <div className="mc-grid mc-grid-detail">
          <div className="mc-stack">
            <div className={`mc-next ${tone}`}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <div className="mc-row">
                {step.key === 'confirm_payment' && (canManage ? (
                  <button type="button" className="mc-btn mc-btn-ok" disabled={busy} onClick={() => setDialog('paid')}>
                    <Banknote size={15} /> Confirm transfer received
                  </button>
                ) : <Notice tone="warn">Only the store owner can confirm a transfer.</Notice>)}
                {(step.key === 'pack' || step.key === 'pack_pickup') && (
                  <button type="button" className="mc-btn mc-btn-primary" disabled={busy} onClick={() => run(() => markOrderReady(order.id, true), 'Marked packed and ready')}>
                    <PackageCheck size={15} /> Mark packed &amp; ready
                  </button>
                )}
                {step.key === 'await_rider' && (
                  <button type="button" className="mc-btn" disabled={busy} onClick={() => run(() => markOrderReady(order.id, false), 'Marked as not ready')}>
                    Not ready after all
                  </button>
                )}
                {(step.key === 'pack' || step.key === 'await_rider') && (
                  <button type="button" className="mc-btn" disabled={busy} onClick={() => setDialog('self')}>
                    <Bike size={15} /> I&apos;ll deliver it myself
                  </button>
                )}
                {step.key === 'handover' && (
                  <button type="button" className="mc-btn mc-btn-ok" disabled={busy} onClick={() => run(() => updateOrderStatus(order.id, 'delivered'), 'Order completed')}>
                    <Store size={15} /> Customer collected it
                  </button>
                )}
                {step.key === 'self_delivering' && (
                  <button type="button" className="mc-btn mc-btn-ok" disabled={busy} onClick={() => run(() => updateOrderStatus(order.id, 'delivered'), 'Order completed')}>
                    <Check size={15} /> Mark delivered
                  </button>
                )}
                {canCancel && (
                  <button type="button" className="mc-btn mc-btn-danger" disabled={busy} onClick={() => setDialog('cancel')}>
                    <XCircle size={15} /> Cancel order
                  </button>
                )}
                {busy && <Loader2 size={16} className="mc-spin" />}
              </div>
            </div>

            <Panel title="Items" flush>
              <div className="mc-table-wrap" style={{ marginTop: 14 }}>
                <table className="mc-table mc-lines">
                  <thead>
                    <tr><th>Item</th><th className="mc-num">Qty</th><th className="mc-num">Price</th><th className="mc-num">Total</th></tr>
                  </thead>
                  <tbody>
                    {order.items.length === 0 ? (
                      <tr><td colSpan={4} className="mc-cell-sub">
                        {order.itemsSummary ? `Recorded as: ${order.itemsSummary}` : 'No line items were recorded for this order.'}
                      </td></tr>
                    ) : order.items.map((line) => (
                      <tr key={line.id}>
                        <td data-label="Item">{line.name}</td>
                        <td className="mc-num mc-mono" data-label="Qty">{line.quantity}</td>
                        <td className="mc-num mc-mono" data-label="Price">{money(line.unitPrice)}</td>
                        <td className="mc-num mc-mono" data-label="Total"><b>{money(line.lineTotal)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '6px 8px 14px' }}>
                <div className="mc-total-row"><span>Items</span><span className="mc-mono">{money(Number(order.total) - Number(order.deliveryFee || 0))}</span></div>
                {Number(order.deliveryFee) > 0 && (
                  <div className="mc-total-row"><span>Delivery fee (goes to the courier)</span><span className="mc-mono">{money(order.deliveryFee)}</span></div>
                )}
                <div className="mc-total-row big"><span>Customer paid</span><span className="mc-mono">{money(order.total)}</span></div>
              </div>
            </Panel>
          </div>

          <div className="mc-stack">
            <Panel title="Customer">
              <KeyValues items={[
                ['Name', order.customerName],
                ['Phone', order.customerPhone ? <a className="mc-mono" href={`tel:${order.customerPhone}`}>{order.customerPhone}</a> : null],
                order.channel === 'online' ? [order.fulfillmentType === 'pickup' ? 'Fulfilment' : 'Delivery address', order.fulfillmentType === 'pickup' ? 'Customer collects from your store' : order.address, true] : null
              ]} />
            </Panel>

            <Panel title="Payment">
              <KeyValues items={[
                ['Method', order.paymentMethod],
                ['Status', <PaymentBadge key="p" order={order} />],
                order.paymentReference ? ['Reference', <span key="r" className="mc-mono">{order.paymentReference}</span>, true] : null,
                order.channel === 'counter' ? ['Cashier', order.cashier] : null,
                order.channel === 'counter' && order.amountTendered != null ? ['Tendered', money(order.amountTendered)] : null,
                order.channel === 'counter' && order.changeDue != null ? ['Change given', money(order.changeDue)] : null
              ]} />
              {order.paymentMethod === 'Transfer' && order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && (
                <p className="mc-note">Subtech cannot see your bank account. Check it yourself before confirming — the confirmation is recorded against your name.</p>
              )}
            </Panel>

            {order.channel === 'online' && order.fulfillmentType === 'delivery' && (
              <Panel title="Rider">
                {order.rider ? (
                  <KeyValues items={[
                    ['Name', order.rider.name],
                    ['Phone', order.rider.phone ? <a className="mc-mono" href={`tel:${order.rider.phone}`}>{order.rider.phone}</a> : null],
                    ['Vehicle', [order.rider.vehicleType, order.rider.plate].filter(Boolean).join(' · ')]
                  ]} />
                ) : order.status === 'dispatched' ? (
                  <p className="mc-note" style={{ margin: 0 }}>You are delivering this order yourself, so no Subtech rider is assigned.</p>
                ) : (
                  <p className="mc-note" style={{ margin: 0 }}>No rider yet. Once the order is paid, riders in your area can claim it.</p>
                )}
                <p className="mc-note">The customer&apos;s delivery code is shared only with the rider, so it is not shown here.</p>
              </Panel>
            )}

            <Panel title="Timeline"><Timeline order={order} /></Panel>
          </div>
        </div>
      )}

      {dialog === 'paid' && order && (
        <ActionDialog
          title="Confirm transfer received?"
          description={`Only confirm if ${money(order.total)} from ${order.customerName || 'this customer'} is in your bank account. This releases the order to be packed${order.fulfillmentType === 'delivery' ? ' and offers it to riders' : ''}.`}
          confirmLabel="Yes, I received it"
          tone="ok"
          onConfirm={() => markOrderPaid(order.id).then(() => { notify('Payment confirmed'); reload({ silent: true }); onChanged(); })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'self' && order && (
        <ActionDialog
          title="Deliver this order yourself?"
          description="The order is taken off the Subtech rider list and marked out for delivery. You will have to mark it delivered yourself, and there is no customer code check."
          confirmLabel="Deliver it myself"
          onConfirm={() => updateOrderStatus(order.id, 'dispatched').then(() => { notify('Marked out for delivery'); reload({ silent: true }); onChanged(); })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'cancel' && order && (
        <ActionDialog
          title="Cancel this order?"
          description={`The items go back on your shelf and the customer will see the order as cancelled. ${order.paymentStatus === 'paid' ? 'They have already paid, so you must refund them yourself — Subtech does not move money.' : ''}`}
          confirmLabel="Cancel order"
          tone="danger"
          inputLabel="Reason (shown to you and the customer)"
          inputRequired
          checkboxLabel={order.paymentStatus === 'paid' ? 'I have refunded the customer' : undefined}
          onConfirm={(reason, refunded) => cancelOrder(order.id, reason, refunded).then(() => { notify('Order cancelled'); reload({ silent: true }); onChanged(); })}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}

export default MerchantOrders;
