import React, { useState } from 'react';
import {
  ShoppingBag,
  Bike,
  Check,
  MapPin,
  ShieldCheck,
  Package
} from 'lucide-react';
import { formatNaira, shortOrderId } from '../../lib/formatMoney';

export default function MerchantOrders({
  orders = [],
  loading = false,
  canManage = true,
  onUpdateOrderStatus
}) {
  const [filter, setFilter] = useState('all');
  const [pendingId, setPendingId] = useState(null);

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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Orders & Courier Dispatch
          </h1>
          <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
            Real storefront checkouts only. Dispatch marks the order for pickup — it does not invent a rider.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'pending', label: 'Needs Packaging' },
            { key: 'dispatched', label: 'In Transit' },
            { key: 'delivered', label: 'Delivered' }
          ].map((item) => (
            <button
              key={item.key}
              className="merchant-btn-secondary"
              style={{
                fontSize: '12.5px',
                padding: '6px 12px',
                background: filter === item.key ? 'rgba(43, 124, 255, 0.08)' : '#ffffff',
                borderColor: filter === item.key ? '#2B7CFF' : '#e5e5e5',
                color: filter === item.key ? '#2B7CFF' : '#525252'
              }}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div className="merchant-card" style={{ textAlign: 'center', padding: '56px 24px', color: '#737373' }}>Loading orders…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="merchant-card" style={{ textAlign: 'center', padding: '56px 24px', color: '#737373' }}>
            <ShoppingBag size={36} color="#d4d4d4" style={{ margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#0a0a0a' }}>No orders yet</p>
            <p style={{ fontSize: '13px', margin: 0 }}>When customers check out on your storefront, orders will appear here.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPending = order.status === 'pending';
            const isDispatched = order.status === 'dispatched';
            const isDelivered = order.status === 'delivered';
            return (
              <div key={order.id} className="merchant-card" style={{ padding: '24px', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: '#0a0a0a' }}>
                        {shortOrderId(order.id)}
                      </span>
                      <span className={`merchant-badge ${isDelivered ? 'live' : isDispatched ? 'dispatched' : 'pending'}`}>
                        {isDelivered ? 'Delivered' : isDispatched ? 'In transit' : 'Package & dispatch'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>
                      Placed {order.timeAgo || 'Just now'}
                    </div>
                  </div>
                  <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#0a0a0a' }}>
                    {formatNaira(order.total)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#737373', marginBottom: '8px' }}>
                      Order Items
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a', margin: '0 0 12px' }}>
                      {order.itemsSummary || 'No line items recorded yet'}
                    </p>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#737373', marginBottom: '6px' }}>
                      Customer & Dropoff
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0a0a0a' }}>{order.customerName}</div>
                    {order.address && (
                      <div style={{ fontSize: '12.5px', color: '#525252', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={13} color="#2B7CFF" />
                        <span>{order.address}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '16px' }}>
                    {isPending && (
                      <>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0a0a0a', marginBottom: '4px' }}>Ready for pickup?</div>
                          <p style={{ fontSize: '12px', color: '#737373', margin: 0 }}>
                            Package the items, then mark dispatched. Couriers are assigned only when a real rider accepts.
                          </p>
                        </div>
                        {canManage && (
                          <button
                            className="merchant-btn-primary"
                            style={{ width: '100%', justifyContent: 'center', marginTop: '14px' }}
                            disabled={pendingId === order.id}
                            onClick={() => runStatus(order.id, 'dispatched')}
                          >
                            <Package size={14} />
                            <span>{pendingId === order.id ? 'Updating…' : 'Mark dispatched'}</span>
                          </button>
                        )}
                      </>
                    )}

                    {isDispatched && (
                      <>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Bike size={15} color="#2B7CFF" />
                            <strong style={{ fontSize: '13px' }}>
                              {order.courierInfo?.courierName || 'Awaiting courier assignment'}
                            </strong>
                          </div>
                          {order.courierInfo?.otp && (
                            <div style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>
                              Handover OTP: <strong className="font-mono" style={{ color: '#0a0a0a' }}>{order.courierInfo.otp}</strong>
                            </div>
                          )}
                        </div>
                        {canManage && (
                          <button
                            className="merchant-btn-secondary"
                            style={{ width: '100%', justifyContent: 'center', marginTop: '14px', fontSize: '12.5px' }}
                            disabled={pendingId === order.id}
                            onClick={() => runStatus(order.id, 'delivered')}
                          >
                            <Check size={14} color="#2B7CFF" />
                            <span>Confirm delivered</span>
                          </button>
                        )}
                      </>
                    )}

                    {isDelivered && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2B7CFF', fontSize: '13px', fontWeight: 600 }}>
                        <ShieldCheck size={18} />
                        <span>Order completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
