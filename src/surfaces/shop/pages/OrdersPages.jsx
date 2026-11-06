import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Loader2, Package, Phone, ShieldCheck, Store, X } from 'lucide-react';
import { fetchMyOrder, fetchMyOrders } from '../../../services/customer';
import { useAsync } from '../../../hooks/useAsync';
import { naira } from '../../../lib/format';

const STATUS = {
  pending: { label: 'Preparing', tone: 'warn' },
  dispatched: { label: 'On the way', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'bad' }
};

function statusFor(order) {
  if (order.status === 'pending' && order.paymentStatus === 'unpaid') {
    return order.paymentMethod === 'Transfer' ? { label: 'Awaiting transfer', tone: 'warn' } : { label: 'Awaiting payment', tone: 'warn' };
  }
  if (order.status === 'delivered' && order.fulfillmentType === 'pickup') return { label: 'Ready / collected', tone: 'ok' };
  return STATUS[order.status] || { label: order.status, tone: 'idle' };
}

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export function OrdersPage({ auth, navigate }) {
  const orders = useAsync(() => (auth.user ? fetchMyOrders() : Promise.resolve({ data: [] })), [auth.user?.id]);

  if (!auth.user) {
    return (
      <div className="sh-wrap sh-section"><div className="sh-empty"><Package size={34} /><strong>Sign in to see your orders</strong>
        Orders you place while signed in are saved here with live tracking.
        <div><button type="button" className="sh-btn" style={{ marginTop: 16 }} onClick={() => navigate('/login?next=/orders')}>Sign in</button></div></div></div>
    );
  }

  const list = orders.data || [];
  return (
    <div className="sh-wrap sh-section">
      <h1 className="sh-h1">My orders</h1>
      <p className="sh-sub">Tap an order to track it.</p>
      {orders.error && <div className="sh-alert sh-alert-bad" role="alert">{orders.error}</div>}
      {orders.loading && !orders.data ? (
        <div className="sh-skel" style={{ height: 120 }} />
      ) : list.length === 0 ? (
        <div className="sh-empty"><Package size={34} /><strong>No orders yet</strong>Find a store and place your first order.
          <div><button type="button" className="sh-btn" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Browse stores</button></div></div>
      ) : list.map((o) => {
        const st = statusFor(o);
        return (
          <button key={o.id} type="button" className="sh-order" onClick={() => navigate(`/orders/${o.id}`)}>
            <div className="sh-row"><strong>{o.storeName}</strong><span className={`sh-badge sh-badge-${st.tone}`}>{st.label}</span></div>
            <div className="sh-muted" style={{ margin: '6px 0' }}>{o.itemsSummary}</div>
            <div className="sh-row"><span className="sh-muted">{when(o.createdAt)}</span><span className="sh-money">{naira(o.total)}</span></div>
          </button>
        );
      })}
    </div>
  );
}

function Timeline({ order }) {
  const delivery = order.fulfillmentType === 'delivery';
  const paid = order.paymentStatus === 'paid';
  const cancelled = order.status === 'cancelled';
  const steps = [
    { label: 'Order placed', at: order.createdAt, done: true },
    { label: paid ? 'Payment confirmed' : order.paymentMethod === 'Transfer' ? 'Waiting for the store to confirm your transfer' : 'Waiting for payment', done: paid },
    ...(delivery ? [
      { label: order.rider ? `${order.rider.name} will deliver your order` : 'Finding a rider', at: order.dispatchedAt, done: Boolean(order.dispatchedAt) },
      { label: 'Order picked up from the store', at: order.pickedUpAt, done: Boolean(order.pickedUpAt) }
    ] : []),
    { label: delivery ? 'Delivered' : 'Collected', at: order.deliveredAt, done: order.status === 'delivered' }
  ];
  if (cancelled) steps.push({ label: `Cancelled${order.cancelReason ? ` — ${order.cancelReason}` : ''}`, at: order.cancelledAt, done: true, bad: true });
  const firstOpen = steps.findIndex((s) => !s.done);

  return (
    <ul className="sh-track">
      {steps.map((s, i) => (
        <li key={s.label} className={s.bad ? 'bad' : s.done ? 'done' : !cancelled && i === firstOpen ? 'now' : ''}>
          <span className="dot">{s.bad ? <X size={13} /> : s.done ? <Check size={13} /> : null}</span>
          <div><strong>{s.label}</strong>{s.at && <span className="sh-muted">{when(s.at)}</span>}</div>
        </li>
      ))}
    </ul>
  );
}

const POLL_MS = 10000;

export function OrderPage({ auth, navigate, orderId }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchMyOrder(orderId);
      if (alive.current) { setOrder(res.data); setError(''); }
    } catch (err) {
      if (alive.current) setError(err.message);
    }
  }, [orderId]);

  useEffect(() => {
    alive.current = true;
    if (!auth.user) return undefined;
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    return () => { alive.current = false; clearInterval(id); };
  }, [auth.user, load]);

  if (!auth.user) {
    return <div className="sh-wrap sh-section"><div className="sh-empty"><strong>Sign in to track this order</strong>
      <div><button type="button" className="sh-btn" style={{ marginTop: 14 }} onClick={() => navigate(`/login?next=/orders/${orderId}`)}>Sign in</button></div></div></div>;
  }

  const open = order && (order.status === 'pending' || order.status === 'dispatched');
  const st = order ? statusFor(order) : null;

  return (
    <div className="sh-wrap sh-section">
      <button type="button" className="sh-nav-link" onClick={() => navigate('/orders')} style={{ paddingLeft: 0 }}><ArrowLeft size={15} /> All orders</button>
      {error && <div className="sh-alert sh-alert-bad" role="alert">{error}</div>}
      {!order && !error && <div className="sh-skel" style={{ height: 240, marginTop: 10 }} />}

      {order && (
        <>
          <div className="sh-row" style={{ margin: '8px 0 16px' }}>
            <div><h1 className="sh-h1" style={{ marginBottom: 2 }}>{order.store.name}</h1><span className="sh-muted sh-mono">Order #{order.id.slice(0, 8).toUpperCase()}</span></div>
            <span className={`sh-badge sh-badge-${st.tone}`}>{st.label}</span>
          </div>

          {order.deliveryOtp && order.paymentStatus === 'paid' && (
            <div className="sh-otp"><span>Give this code to your rider when your order arrives</span><b>{order.deliveryOtp}</b><span><ShieldCheck size={13} style={{ verticalAlign: -2 }} /> Don&apos;t share it before you have your order</span></div>
          )}
          {order.paymentStatus === 'unpaid' && order.status === 'pending' && (
            <div className="sh-alert sh-alert-info">
              {order.paymentMethod === 'Transfer'
                ? `Send ${naira(order.total)} to the store and tell them it is for this order. We will update this page once they confirm.`
                : 'Your payment was not completed. This order will be released automatically if it stays unpaid.'}
            </div>
          )}

          <div className="sh-card"><h2>Progress {open && <span className="sh-live" style={{ marginLeft: 8 }}><i />Live</span>}</h2><Timeline order={order} /></div>

          {order.rider && (
            <div className="sh-card"><h2>Your rider</h2>
              <div className="sh-row"><div><strong>{order.rider.name}</strong><div className="sh-muted">{order.rider.vehicleType}{order.rider.plate ? ` · ${order.rider.plate}` : ''}</div></div>
                {order.rider.phone && open && <a className="sh-btn sh-btn-ghost sh-btn-sm" href={`tel:${order.rider.phone}`}><Phone size={14} /> Call</a>}</div></div>
          )}

          <div className="sh-card"><h2>Items</h2>
            <table className="sh-items"><tbody>
              {order.items.map((i) => <tr key={i.name + i.unitPrice}><td>{i.quantity} × {i.name}</td><td className="sh-mono">{naira(i.lineTotal)}</td></tr>)}
              {Number(order.deliveryFee) > 0 && <tr><td className="sh-muted">Delivery fee</td><td className="sh-mono">{naira(order.deliveryFee)}</td></tr>}
              <tr><td><strong>Total</strong></td><td className="sh-money">{naira(order.total)}</td></tr>
            </tbody></table>
          </div>

          <div className="sh-card"><h2>{order.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'} details</h2>
            <p className="sh-muted" style={{ margin: '0 0 8px' }}>{order.fulfillmentType === 'pickup' ? `Collect from ${order.store.name}${order.store.address ? `, ${order.store.address}` : ''}` : order.address}</p>
            <p className="sh-muted" style={{ margin: 0 }}>{order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</p>
            {order.store.phone && <a className="sh-btn sh-btn-ghost sh-btn-sm" style={{ marginTop: 12 }} href={`tel:${order.store.phone}`}><Store size={14} /> Call {order.store.name}</a>}
          </div>
          {open && <p className="sh-live"><Loader2 size={12} className="ad-spin" /> This page refreshes automatically.</p>}
        </>
      )}
    </div>
  );
}
