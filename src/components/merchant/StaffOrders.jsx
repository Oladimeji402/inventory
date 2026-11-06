import { useState } from 'react';
import { Bike, Check, PackageCheck, ShoppingBag, Store } from 'lucide-react';
import { Badge, DataTable, Dialog, FilterChips, Notice } from './ui';
import { money, nextOrderStep, shortOrderId } from './format';

const VIEWS = [
  ['pack', 'To pack'],
  ['awaiting', 'Awaiting payment'],
  ['transit', 'Out for delivery'],
  ['done', 'Completed']
];

function bucket(order) {
  if (order.status === 'cancelled') return 'cancelled';
  if (order.status === 'delivered') return 'done';
  if (order.status === 'dispatched') return 'transit';
  return order.paymentStatus === 'paid' ? 'pack' : 'awaiting';
}

function OrderDialog({ order, notify, updateOrderStatus, markReady, onClose }) {
  const [busy, setBusy] = useState(false);
  const step = nextOrderStep(order);

  const run = async (fn, success) => {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (result?.error) {
      notify(result.error, 'bad');
      return;
    }
    notify(success);
    onClose();
  };

  return (
    <Dialog title={`Order ${shortOrderId(order.id)}`} onClose={busy ? () => {} : onClose} wide>
      <div className="mc-next" style={{ marginBottom: 14 }}>
        <h3>{step.title}</h3>
        <p style={{ marginBottom: step.key === 'confirm_payment' || step.key === 'await_card' ? 0 : 12 }}>{step.text}</p>
        <div className="mc-row">
          {(step.key === 'pack' || step.key === 'pack_pickup') && (
            <button type="button" className="mc-btn mc-btn-primary" disabled={busy} onClick={() => run(() => markReady(order.id, true), 'Marked packed and ready')}><PackageCheck size={15} /> Mark packed &amp; ready</button>
          )}
          {(step.key === 'pack' || step.key === 'await_rider') && (
            <button type="button" className="mc-btn" disabled={busy} onClick={() => run(() => updateOrderStatus(order.id, 'dispatched'), 'Marked out for delivery')}><Bike size={15} /> I&apos;ll deliver it myself</button>
          )}
          {step.key === 'handover' && (
            <button type="button" className="mc-btn mc-btn-ok" disabled={busy} onClick={() => run(() => updateOrderStatus(order.id, 'delivered'), 'Order completed')}><Store size={15} /> Customer collected it</button>
          )}
          {step.key === 'self_delivering' && (
            <button type="button" className="mc-btn mc-btn-ok" disabled={busy} onClick={() => run(() => updateOrderStatus(order.id, 'delivered'), 'Order completed')}><Check size={15} /> Mark delivered</button>
          )}
        </div>
      </div>

      <div className="mc-table-wrap">
        <table className="mc-table mc-lines">
          <thead><tr><th>Item</th><th className="mc-num">Qty</th><th className="mc-num">Total</th></tr></thead>
          <tbody>
            {order.lineItems.length === 0 ? (
              <tr><td colSpan={3} className="mc-cell-sub">{order.itemsSummary || 'No line items recorded.'}</td></tr>
            ) : order.lineItems.map((line) => (
              <tr key={line.id}>
                <td>{line.productName}</td>
                <td className="mc-num mc-mono">{line.quantity}</td>
                <td className="mc-num mc-mono"><b>{money(line.lineTotal)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mc-total-row big"><span>Total</span><span className="mc-mono">{money(order.total)}</span></div>
      <p style={{ margin: '10px 0 0' }}>
        <b>{order.customerName}</b>{order.customerPhone ? <> · <a className="mc-mono" href={`tel:${order.customerPhone}`}>{order.customerPhone}</a></> : null}<br />
        <span className="mc-cell-sub">{order.fulfillmentType === 'pickup' ? 'Customer collects from the store' : order.address}</span>
      </p>
      <Notice>Cancelling orders and confirming bank transfers is done by the store owner.</Notice>
      <div className="mc-dialog-actions"><button type="button" className="mc-btn" onClick={onClose} disabled={busy}>Close</button></div>
    </Dialog>
  );
}

export default function StaffOrders({ orders, loading, notify, updateOrderStatus, markReady }) {
  const [view, setView] = useState('pack');
  const [openId, setOpenId] = useState(null);
  const buckets = orders.reduce((acc, o) => { const b = bucket(o); acc[b] = (acc[b] || 0) + 1; return acc; }, {});
  const rows = orders.filter((o) => bucket(o) === view);
  const open = orders.find((o) => o.id === openId) || null;

  return (
    <>
      <div className="mc-page-head"><div><h1>Orders</h1><p>Tap an order to pack it or hand it over.</p></div></div>
      <div className="mc-toolbar">
        <FilterChips label="Order view" value={view} onChange={setView} options={VIEWS.map(([value, label]) => ({ value, label, count: buckets[value] || 0 }))} />
      </div>
      <section className="mc-card">
        <DataTable
          loading={loading}
          rows={rows}
          onRowClick={(o) => setOpenId(o.id)}
          empty={{ icon: ShoppingBag, title: 'Nothing here', text: 'Orders in this stage will show up here automatically.' }}
          columns={[
            { key: 'id', header: 'Order', render: (o) => <><div className="mc-cell-main mc-mono">{shortOrderId(o.id)}</div><div className="mc-cell-sub">{o.timeAgo}</div></> },
            { key: 'customer', header: 'Customer', render: (o) => <><div className="mc-cell-main">{o.customerName}</div><div className="mc-cell-sub">{o.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'}</div></> },
            { key: 'pay', header: 'Payment', render: (o) => <Badge status={o.paymentStatus}>{o.paymentStatus === 'paid' ? 'Paid' : `Unpaid · ${o.paymentMethod}`}</Badge> },
            { key: 'total', header: 'Total', align: 'right', render: (o) => <b className="mc-mono">{money(o.total)}</b> }
          ]}
        />
      </section>
      {open && <OrderDialog order={open} notify={notify} updateOrderStatus={updateOrderStatus} markReady={markReady} onClose={() => setOpenId(null)} />}
    </>
  );
}
