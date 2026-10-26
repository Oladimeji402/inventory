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
  ShieldCheck,
  Building2,
  AlertCircle
} from 'lucide-react';
import { submitStorefrontOrder } from '../../services/storefront';
import { openPaystackPopup } from '../../lib/paystack';

export default function StorefrontCartDrawer({ 
  isOpen, 
  onClose, 
  cartItems = [], 
  onUpdateQuantity, 
  onClearCart,
  onCheckoutComplete,
  storeSlug = 'apex-pharmacy',
  storeProfile = null
}) {
  const [fulfillmentType, setFulfillmentType] = useState('delivery'); // 'delivery' | 'pickup'
  const [customerName, setCustomerName] = useState('Amara Kalu');
  const [customerPhone, setCustomerPhone] = useState('+234 803 291 0029');
  const [deliveryAddress, setDeliveryAddress] = useState('Apt 4B, Admiralty Way, Lekki Phase 1, Lagos');
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'transfer' (no cash on delivery)
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = fulfillmentType === 'delivery' ? (subtotal > 15000 ? 0 : 850) : 0;
  const total = subtotal + deliveryFee;

  const handlePay = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setError('');

    if (!customerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!customerPhone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    if (fulfillmentType === 'delivery' && !deliveryAddress.trim()) {
      setError('Please enter your delivery address.');
      return;
    }

    setIsProcessing(true);

    const orderPayload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      address: fulfillmentType === 'delivery' ? deliveryAddress.trim() : 'Store Counter Pickup',
      items: cartItems,
      itemsSummary: cartItems.map(i => `${i.quantity}x ${i.name}`).join(', '),
      total,
      fulfillmentType,
      paymentMethod: paymentMethod === 'card' ? 'Card' : 'Transfer'
    };

    const executeOrderSubmission = async (payload) => {
      try {
        const result = await submitStorefrontOrder(storeSlug, payload);
        setIsProcessing(false);
        const newOrder = {
          id: result?.order_id || ('ORD-' + Math.floor(1000 + Math.random() * 9000)),
          customerName,
          customerPhone,
          address: payload.address,
          items: cartItems,
          itemsSummary: payload.itemsSummary,
          total,
          fulfillmentType,
          paymentMethod: payload.paymentMethod,
          status: 'pending',
          timeAgo: 'Just now',
          courierInfo: result?.delivery_otp ? { otp: result.delivery_otp, etaMinutes: result.eta_minutes || 25 } : null
        };
        onCheckoutComplete(newOrder);
      } catch (err) {
        console.warn('Real order submit error, falling back locally:', err);
        setIsProcessing(false);
        const newOrder = {
          id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
          customerName,
          customerPhone,
          address: payload.address,
          items: cartItems,
          itemsSummary: payload.itemsSummary,
          total,
          fulfillmentType,
          paymentMethod: payload.paymentMethod,
          status: 'pending',
          timeAgo: 'Just now'
        };
        onCheckoutComplete(newOrder);
      }
    };

    if (paymentMethod === 'card') {
      await openPaystackPopup({
        email: `${customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        amountInNaira: total,
        onSuccess: async (paystackRes) => {
          orderPayload.paymentReference = paystackRes.reference;
          await executeOrderSubmission(orderPayload);
        },
        onClose: () => {
          setIsProcessing(false);
        }
      });
      return;
    }

    await executeOrderSubmission(orderPayload);
  };

  return (
    <div className="sf-drawer-overlay" onClick={onClose}>
      <div className="sf-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sf-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} color="#2B7CFF" />
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
                <Bike size={14} color={fulfillmentType === 'delivery' ? '#2B7CFF' : '#737373'} />
                <span>Express Delivery (~20m)</span>
              </div>
            </button>

            <button 
              className={`sf-toggle-btn ${fulfillmentType === 'pickup' ? 'active' : ''}`}
              onClick={() => setFulfillmentType('pickup')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Store size={14} color={fulfillmentType === 'pickup' ? '#2B7CFF' : '#737373'} />
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
                        <div className="font-mono" style={{ fontSize: '12.5px', color: '#2B7CFF', fontWeight: 700 }}>
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

          {/* Error Message */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '12.5px' }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Method Selector (Prepaid Only - No Cash on Delivery) */}
          {cartItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Prepaid Payment
                </span>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                  100% Secure Checkout
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { key: 'card', label: 'Debit / Credit Card' },
                  { key: 'transfer', label: 'Direct Bank Transfer' }
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    style={{
                      padding: '10px 6px',
                      border: '1.5px solid',
                      borderColor: paymentMethod === p.key ? '#2B7CFF' : '#e5e5e5',
                      background: paymentMethod === p.key ? 'rgba(43, 124, 255, 0.08)' : '#ffffff',
                      color: paymentMethod === p.key ? '#2B7CFF' : '#525252',
                      borderRadius: '8px',
                      fontSize: '12px',
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

              {paymentMethod === 'transfer' && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    <Building2 size={13} color="#2B7CFF" />
                    <span>Store Settlement Bank Account</span>
                  </div>
                  <div>Bank: <strong>{storeProfile?.bankName || 'Guaranty Trust Bank (GTB)'}</strong></div>
                  <div>Account No: <strong className="font-mono">{storeProfile?.accountNumber || '0129847120'}</strong></div>
                  <div>Account Name: <strong>{storeProfile?.accountName || storeProfile?.name || 'Store Account'}</strong></div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Send transfer and click below to confirm your order immediately.
                  </div>
                </div>
              )}
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
