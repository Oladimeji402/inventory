import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Bike, 
  Check, 
  Clock, 
  MapPin, 
  Phone, 
  ShieldCheck,
  Package,
  Zap,
  ExternalLink
} from 'lucide-react';

export default function MerchantOrders({ orders = [], onUpdateOrderStatus }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'dispatched' | 'delivered'
  const [dispatchingId, setDispatchingId] = useState(null);

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  const filteredOrders = orders.filter(o => {
    if (filter === 'pending') return o.status === 'pending';
    if (filter === 'dispatched') return o.status === 'dispatched';
    if (filter === 'delivered') return o.status === 'delivered';
    return true;
  });

  const handleDispatchCourier = (orderId) => {
    setDispatchingId(orderId);
    setTimeout(() => {
      onUpdateOrderStatus(orderId, 'dispatched', {
        courierName: 'Tunde B. (Rider #119)',
        courierPhone: '+234 803 291 0029',
        etaMinutes: 14,
        otp: Math.floor(1000 + Math.random() * 9000)
      });
      setDispatchingId(null);
    }, 1000);
  };

  const handleMarkDelivered = (orderId) => {
    onUpdateOrderStatus(orderId, 'delivered');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Orders & Courier Dispatch
          </h1>
          <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
            Track incoming storefront orders, package items, and dispatch verified neighborhood riders in 1 tap.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'pending', label: 'Needs Packaging' },
            { key: 'dispatched', label: 'In Transit' },
            { key: 'delivered', label: 'Delivered' }
          ].map(f => (
            <button
              key={f.key}
              className="merchant-btn-secondary"
              style={{
                fontSize: '12.5px',
                padding: '6px 12px',
                background: filter === f.key ? 'rgba(39, 187, 173, 0.08)' : '#ffffff',
                borderColor: filter === f.key ? '#27BBAD' : '#e5e5e5',
                color: filter === f.key ? '#27BBAD' : '#525252'
              }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredOrders.length === 0 ? (
          <div className="merchant-card" style={{ textAlign: 'center', padding: '56px 24px', color: '#737373' }}>
            <ShoppingBag size={36} color="#d4d4d4" style={{ margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#0a0a0a' }}>No orders in this category</p>
            <p style={{ fontSize: '13px', margin: 0 }}>When customers check out on your storefront, orders will appear here immediately.</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isPending = order.status === 'pending';
            const isDispatched = order.status === 'dispatched';
            const isDelivered = order.status === 'delivered';

            return (
              <div key={order.id} className="merchant-card" style={{ padding: '24px', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: '#0a0a0a' }}>
                        {order.id}
                      </span>
                      <span className={`merchant-badge ${isDelivered ? 'live' : isDispatched ? 'dispatched' : 'pending'}`}>
                        {isDelivered ? '✓ Delivered' : isDispatched ? 'Courier In Transit' : 'Package & Dispatch'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>
                      Placed {order.timeAgo || 'Just now'} · Paid via Direct Checkout
                    </div>
                  </div>

                  <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#0a0a0a' }}>
                    {formatNaira(order.total)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  {/* Customer and Items */}
                  <div>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#737373', marginBottom: '8px' }}>
                      Order Items
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a', margin: '0 0 12px' }}>
                      {order.itemsSummary}
                    </p>

                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#737373', marginBottom: '6px' }}>
                      Customer & Dropoff
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0a0a0a' }}>{order.customerName}</div>
                    <div style={{ fontSize: '12.5px', color: '#525252', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={13} color="#27BBAD" />
                      <span>{order.address}</span>
                    </div>
                  </div>

                  {/* Courier & Action Side */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '16px' }}>
                    {isPending && (
                      <>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0a0a0a', marginBottom: '4px' }}>
                            Ready for pickup?
                          </div>
                          <p style={{ fontSize: '12px', color: '#737373', margin: 0 }}>
                            Pre-package the items. Tap below to alert the closest verified courier.
                          </p>
                        </div>
                        <button
                          className="merchant-btn-primary"
                          style={{ width: '100%', justifyContent: 'center', marginTop: '14px' }}
                          disabled={dispatchingId === order.id}
                          onClick={() => handleDispatchCourier(order.id)}
                        >
                          <Zap size={14} />
                          <span>{dispatchingId === order.id ? 'Connecting Radar...' : '1-Tap Dispatch Courier'}</span>
                        </button>
                      </>
                    )}

                    {isDispatched && (
                      <>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Bike size={15} color="#27BBAD" />
                              <strong style={{ fontSize: '13px' }}>{order.courierInfo?.courierName || 'Samuel O. (Rider #284)'}</strong>
                            </div>
                            <span className="font-mono" style={{ fontSize: '12px', color: '#27BBAD', fontWeight: 700 }}>
                              ETA ~{order.courierInfo?.etaMinutes || 12} mins
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>
                            Handover Security OTP: <strong className="font-mono" style={{ color: '#0a0a0a' }}>{order.courierInfo?.otp || '4819'}</strong>
                          </div>
                        </div>

                        <button
                          className="merchant-btn-secondary"
                          style={{ width: '100%', justifyContent: 'center', marginTop: '14px', fontSize: '12.5px' }}
                          onClick={() => handleMarkDelivered(order.id)}
                        >
                          <Check size={14} color="#27BBAD" />
                          <span>Confirm Handover & Settle</span>
                        </button>
                      </>
                    )}

                    {isDelivered && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#27BBAD', fontSize: '13px', fontWeight: 600 }}>
                        <ShieldCheck size={18} />
                        <span>Order Completed & Delivered via OTP</span>
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
