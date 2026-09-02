import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Bike,
  Check,
  MapPin,
  ShieldCheck,
  Package,
  Eye
} from 'lucide-react';
import { formatNaira, shortOrderId } from '../../lib/formatMoney';
import Tabs from '../../shared/ui/Tabs';
import Badge from '../../shared/ui/Badge';
import Modal from '../../shared/ui/Modal';

const STATUS_TONE = { delivered: 'success', dispatched: 'info', pending: 'warning' };
const STATUS_LABEL = { delivered: 'Delivered', dispatched: 'In transit', pending: 'Package & dispatch' };

function OrderDetailBody({ order, canManage, pending, onStatusChange }) {
  const isPending = order.status === 'pending';
  const isDispatched = order.status === 'dispatched';
  const isDelivered = order.status === 'delivered';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Badge tone={STATUS_TONE[order.status] || 'neutral'}>{STATUS_LABEL[order.status] || order.status}</Badge>
        <span className="font-mono" style={{ fontSize: 12.5, color: 'var(--mx-text-3)' }}>Placed {order.timeAgo || 'just now'}</span>
      </div>

      <div>
        <div className="merchant-detail-label">Order Items</div>
        <div className="mx-table-wrap">
          <table className="mx-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems.length === 0 ? (
                <tr><td colSpan={3} style={{ color: 'var(--mx-text-3)' }}>No line items recorded for this order.</td></tr>
              ) : order.lineItems.map((line) => (
                <tr key={line.id}>
                  <td>{line.productName}</td>
                  <td className="font-mono" style={{ textAlign: 'right' }}>{line.quantity ?? '—'}</td>
                  <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                    {line.lineTotal != null ? formatNaira(line.lineTotal) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: 14, fontWeight: 700 }}>
          Total:&nbsp;<span className="font-mono">{formatNaira(order.total)}</span>
        </div>
      </div>

      <div>
        <div className="merchant-detail-label">Customer &amp; Dropoff</div>
        <div style={{ fontWeight: 700 }}>{order.customerName}</div>
        {order.address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--mx-text-2)', marginTop: 2 }}>
            <MapPin size={13} color="var(--mx-primary)" />
            <span>{order.address}</span>
          </div>
        )}
      </div>

      <div className="merchant-detail-panel">
        {isPending && (
          <>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Ready for pickup?</div>
              <p style={{ fontSize: 12, color: 'var(--mx-text-3)', margin: 0 }}>
                Package the items, then mark dispatched. Couriers are assigned only when a real rider accepts.
              </p>
            </div>
            {canManage && (
              <button className="merchant-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} disabled={pending} onClick={() => onStatusChange('dispatched')}>
                <Package size={14} />
                <span>{pending ? 'Updating…' : 'Mark dispatched'}</span>
              </button>
            )}
          </>
        )}

        {isDispatched && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bike size={15} color="var(--mx-primary)" />
              <strong style={{ fontSize: 13 }}>{order.courierInfo?.courierName || 'Awaiting courier assignment'}</strong>
            </div>
            {order.courierInfo?.otp && (
              <div style={{ fontSize: 12, color: 'var(--mx-text-3)', marginTop: 4 }}>
                Handover OTP: <strong className="font-mono" style={{ color: 'var(--mx-text)' }}>{order.courierInfo.otp}</strong>
              </div>
            )}
            {canManage && (
              <button className="merchant-btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} disabled={pending} onClick={() => onStatusChange('delivered')}>
                <Check size={14} color="var(--mx-primary)" />
                <span>Confirm delivered</span>
              </button>
            )}
          </>
        )}

        {isDelivered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mx-primary)', fontSize: 13, fontWeight: 600 }}>
            <ShieldCheck size={18} />
            <span>Order completed</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MerchantOrders({
  orders = [],
  loading = false,
  canManage = true,
  onUpdateOrderStatus,
  openOrderId,
  onOrderOpened
}) {
  const [filter, setFilter] = useState('all');
  const [pendingId, setPendingId] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState(null);

  useEffect(() => {
    if (openOrderId) {
      setDetailOrderId(openOrderId);
      if (onOrderOpened) onOrderOpened();
    }
  }, [openOrderId, onOrderOpened]);

  const filteredOrders = orders.filter((order) => {
    if (filter === 'pending') return order.status === 'pending';
    if (filter === 'dispatched') return order.status === 'dispatched';
    if (filter === 'delivered') return order.status === 'delivered';
    return order.status !== 'cancelled';
  });

  const runStatus = async (orderId, status) => {
    setPendingId(orderId);
    await onUpdateOrderStatus(orderId, status);
    setPendingId(null);
  };

  const detailOrder = orders.find((order) => order.id === detailOrderId) || null;

  return (
    <div>
      <div className="merchant-page-header">
        <div>
          <h1>Orders &amp; Courier Dispatch</h1>
          <p>Real storefront checkouts only. Dispatch marks the order for pickup — it does not invent a rider.</p>
        </div>
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All Orders' },
            { value: 'pending', label: 'Needs Packaging' },
            { value: 'dispatched', label: 'In Transit' },
            { value: 'delivered', label: 'Delivered' }
          ]}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div className="mx-card"><div className="mx-card-body"><span className="mx-skeleton" style={{ height: 60 }} /></div></div>
        ) : filteredOrders.length === 0 ? (
          <div className="mx-card">
            <div className="mx-empty">
              <span className="mx-empty-icon"><ShoppingBag size={20} /></span>
              <div className="mx-empty-title">No orders yet</div>
              <div className="mx-empty-desc">When customers check out on your storefront, orders will appear here.</div>
            </div>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="mx-card merchant-order-row" onClick={() => setDetailOrderId(order.id)}>
              <div className="mx-card-body merchant-order-row-body">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="font-mono" style={{ fontSize: 15, fontWeight: 800 }}>{shortOrderId(order.id)}</span>
                    <Badge tone={STATUS_TONE[order.status] || 'neutral'}>{STATUS_LABEL[order.status] || order.status}</Badge>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--mx-text-3)', marginTop: 4 }}>
                    {order.customerName} · {order.timeAgo || 'Just now'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span className="font-mono" style={{ fontSize: 16, fontWeight: 800 }}>{formatNaira(order.total)}</span>
                  <button className="merchant-icon-btn" onClick={(e) => { e.stopPropagation(); setDetailOrderId(order.id); }} title="View details">
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={Boolean(detailOrder)}
        title={detailOrder ? `Order ${shortOrderId(detailOrder.id)}` : ''}
        onClose={() => setDetailOrderId(null)}
      >
        {detailOrder && (
          <OrderDetailBody
            order={detailOrder}
            canManage={canManage}
            pending={pendingId === detailOrder.id}
            onStatusChange={(status) => runStatus(detailOrder.id, status)}
          />
        )}
      </Modal>
    </div>
  );
}
