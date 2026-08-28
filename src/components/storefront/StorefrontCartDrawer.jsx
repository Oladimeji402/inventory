import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  MapPin, 
  Phone, 
  CreditCard, 
  Bike, 
  ShoppingBag, 
  Store, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function StorefrontCartDrawer({ 
  isOpen, 
  onClose, 
  cartItems = [], 
  onUpdateQuantity, 
  onClearCart,
  onCheckoutComplete 
}) {
  const [fulfillmentType, setFulfillmentType] = useState('delivery'); // 'delivery' | 'pickup'
  const [customerName, setCustomerName] = useState('Amara Kalu');
  const [customerPhone, setCustomerPhone] = useState('+234 803 291 0029');
  const [deliveryAddress, setDeliveryAddress] = useState('Apt 4B, Admiralty Way, Lekki Phase 1, Lagos');
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'transfer' | 'cash'
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = fulfillmentType === 'delivery' ? (subtotal > 15000 ? 0 : 850) : 0;
  const total = subtotal + deliveryFee;

  const handlePay = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const newOrder = {
        id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
        customerName,
        customerPhone,
        address: fulfillmentType === 'delivery' ? deliveryAddress : 'Store Counter Pickup',
        items: cartItems,
        itemsSummary: cartItems.map(i => `${i.quantity}x ${i.name}`).join(', '),
        total,
        fulfillmentType,
        paymentMethod,
        status: 'pending',
        timeAgo: 'Just now'
      };
      onCheckoutComplete(newOrder);
    }, 1200);
  };

  return (
    <div className="sf-drawer-overlay" onClick={onClose}>
      <div className="sf-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sf-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} color="#27BBAD" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Your Shopping Bag</h3>
            <span style={{ fontSize: '12px', background: '#f5f5f5', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
              {cartItems.reduce((sum, i) => sum + i.quantity, 0)} items
            </span>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#737373' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="sf-drawer-body">
          {/* Fulfillment Toggle */}
          <div className="sf-toggle-group">
            <button 
              className={`sf-toggle-btn ${fulfillmentType === 'delivery' ? 'active' : ''}`}
              onClick={() => setFulfillmentType('delivery')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Bike size={14} color={fulfillmentType === 'delivery' ? '#27BBAD' : '#737373'} />
                <span>Express Delivery (~20m)</span>
              </div>
            </button>

            <button 
              className={`sf-toggle-btn ${fulfillmentType === 'pickup' ? 'active' : ''}`}
              onClick={() => setFulfillmentType('pickup')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Store size={14} color={fulfillmentType === 'pickup' ? '#27BBAD' : '#737373'} />
                <span>Store Pickup (Free)</span>
              </div>
            </button>
          </div>

          {/* Cart Items List */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              Order Items
            </div>

            {cartItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#737373' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>Your bag is empty</p>
                <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Add items from the store to continue.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cartItems.map((item) => (
                  <div 
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: '#fafafa',
                      border: '1px solid #f0f0f0',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ fontSize: '20px' }}>{item.emoji || '📦'}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </div>
                        <div className="font-mono" style={{ fontSize: '12.5px', color: '#27BBAD', fontWeight: 700 }}>
                          {formatNaira(item.price)}
                        </div>
                      </div>
                    </div>

                    <div className="sf-qty-adjuster" style={{ transform: 'scale(0.9)' }}>
                      <button className="sf-qty-btn" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                        <Minus size={12} />
                      </button>
                      <span className="sf-qty-val">{item.quantity}</span>
                      <button className="sf-qty-btn" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Details Form */}
          {cartItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {fulfillmentType === 'delivery' ? 'Delivery Address & Contact' : 'Pickup Contact'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ padding: '9px 12px', border: '1.5px solid #e5e5e5', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />

                <input
                  type="tel"
                  placeholder="WhatsApp Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  style={{ padding: '9px 12px', border: '1.5px solid #e5e5e5', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'monospace' }}
                />

                {fulfillmentType === 'delivery' && (
                  <input
                    type="text"
                    placeholder="Dropoff Address (Street, Apartment, Area)"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    style={{ padding: '9px 12px', border: '1.5px solid #e5e5e5', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          {cartItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Payment Method
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { key: 'card', label: 'Card / Paystack' },
                  { key: 'transfer', label: 'Bank Transfer' },
                  { key: 'cash', label: 'Cash on Dropoff' }
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    style={{
                      padding: '8px 4px',
                      border: '1.5px solid',
                      borderColor: paymentMethod === p.key ? '#27BBAD' : '#e5e5e5',
                      background: paymentMethod === p.key ? 'rgba(39, 187, 173, 0.08)' : '#ffffff',
                      color: paymentMethod === p.key ? '#27BBAD' : '#525252',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                    onClick={() => setPaymentMethod(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Price Summary & Checkout Button */}
        {cartItems.length > 0 && (
          <div className="sf-drawer-footer">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#737373' }}>
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-900">{formatNaira(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#737373' }}>
                <span>Delivery Fee</span>
                <span className="font-mono font-bold text-slate-900">{deliveryFee === 0 ? 'FREE' : formatNaira(deliveryFee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#0a0a0a', paddingTop: '6px', borderTop: '1px solid #e5e5e5' }}>
                <span>Total Amount</span>
                <span className="font-mono">{formatNaira(total)}</span>
              </div>
            </div>

            <button
              className="sf-cart-btn"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', borderRadius: '12px', background: '#0a0a0a', fontSize: '15px' }}
              disabled={isProcessing}
              onClick={handlePay}
            >
              {isProcessing ? (
                <span>Securing Instant Payment...</span>
              ) : (
                <>
                  <span>Place Order · {formatNaira(total)}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
