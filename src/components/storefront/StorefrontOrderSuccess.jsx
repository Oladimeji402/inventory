import React from 'react';
import { 
  CheckCircle2, 
  Bike, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Store, 
  Clock, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function StorefrontOrderSuccess({ order, onClose, onBackToStore, onTrackOrder }) {
  const awaitingTransfer = order.paymentStatus === 'awaiting_transfer';
  const isDelivery = order.fulfillmentType !== 'pickup';
  const otp = order.courierInfo?.otp;
  const eta = order.courierInfo?.etaMinutes;
  const orderStage = awaitingTransfer ? 'Waiting for the store to confirm your transfer' : 'Order received by the store';
  const progressPct = awaitingTransfer ? 10 : 25;

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  return (
    <div className="sf-drawer-overlay">
      <div 
        style={{ 
          background: '#ffffff', 
          maxWidth: '520px', 
          width: '100%', 
          margin: 'auto 20px', 
          borderRadius: '20px', 
          padding: '32px 28px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Top Success Badge */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(43, 124, 255, 0.1)', color: '#2B7CFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px', color: '#0a0a0a', letterSpacing: '-0.02em' }}>
            {awaitingTransfer ? 'Order Placed' : 'Order Confirmed!'}
          </h2>
          <span className="font-mono" style={{ fontSize: '13.5px', color: '#737373', fontWeight: 600 }}>
            {order.id} · Total: {formatNaira(order.total)}
          </span>
        </div>

        {/* Live Delivery Progress Card */}
        <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11.5px', color: '#737373', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Delivery Status
              </div>
              <strong style={{ fontSize: '14.5px', color: '#0a0a0a' }}>{orderStage}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11.5px', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>Estimated Dropoff</div>
              <span className="font-mono" style={{ fontSize: '14px', fontWeight: 800, color: '#2B7CFF' }}>
                {isDelivery && eta ? `~${eta} mins` : '—'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ height: '6px', background: '#e5e5e5', borderRadius: '100px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: '#2B7CFF', transition: 'width 0.8s ease' }} />
          </div>

          {/* Handover OTP: the real code for this order */}
          {isDelivery && otp && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e5e5e5', fontSize: '12.5px' }}>
              <span style={{ color: '#525252' }}>
                A rider will be assigned once the store has packed your order. Give them this code at your door.
              </span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10.5px', color: '#737373', display: 'block' }}>Handover OTP</span>
                <strong className="font-mono" style={{ fontSize: '15px', color: '#0a0a0a', letterSpacing: '0.05em' }}>{otp}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Order Details Summary */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Items Ordered
          </div>
          <p style={{ fontSize: '13.5px', color: '#0a0a0a', fontWeight: 600, margin: '0 0 12px' }}>
            {order.itemsSummary}
          </p>

          <div style={{ fontSize: '12px', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Dropoff Destination
          </div>
          <div style={{ fontSize: '13px', color: '#525252', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} color="#2B7CFF" />
            <span>{order.address}</span>
          </div>
        </div>

        {onTrackOrder && (
          <button
            className="sf-cart-btn"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', borderRadius: '12px', fontSize: '14.5px', marginBottom: '10px' }}
            onClick={onTrackOrder}
          >
            <span>Track this order</span>
            <ArrowRight size={15} />
          </button>
        )}

        {/* Action Button */}
        <button
          className="sf-cart-btn"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', borderRadius: '12px', fontSize: '14.5px' }}
          onClick={onBackToStore}
        >
          <span>Continue Shopping</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
