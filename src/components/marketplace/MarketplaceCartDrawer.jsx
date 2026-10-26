import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Tag, 
  ShieldCheck, 
  CheckCircle,
  Truck,
  RotateCcw
} from 'lucide-react';

export default function MarketplaceCartDrawer({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onTrackOrder,
  formatPrice
}) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'processing' | 'success'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentOption, setPaymentOption] = useState('paystack');
  const [generatedOrderId, setGeneratedOrderId] = useState('');

  if (!isOpen) return null;

  const rawSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discountAmount = appliedCoupon ? Math.round(rawSubtotal * 0.2) : 0;
  const deliveryFee = rawSubtotal > 15000 || rawSubtotal === 0 ? 0 : 850;
  const finalTotal = Math.max(0, rawSubtotal - discountAmount + deliveryFee);

  function handleApplyCoupon() {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (code === 'STV20' || code === 'SUBTECH20' || code === 'NEOSAVE20') {
      setAppliedCoupon(code);
    } else {
      setCouponError('Invalid code. Try STV20 for 20% off.');
    }
  }

  function handleCheckoutSubmit(e) {
    e.preventDefault();
    setCheckoutStep('processing');
    setTimeout(() => {
      const orderNum = 'STV-' + Math.floor(1000 + Math.random() * 9000);
      setGeneratedOrderId(orderNum);
      setCheckoutStep('success');
      onClearCart();
    }, 1800);
  }

  return (
    <div className="mp-drawer-backdrop" onClick={onClose}>
      <div className="mp-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="mp-drawer-header">
          <div className="mp-drawer-title-group">
            <ShoppingBag size={20} className="text-blue-500" />
            <h3 className="mp-drawer-title">
              {checkoutStep === 'success' ? 'Order Confirmed!' : `Your Cart (${cartItems.reduce((s, i) => s + i.qty, 0)})`}
            </h3>
          </div>
          <button type="button" className="mp-drawer-close-btn" onClick={onClose} aria-label="Close cart">
            <X size={18} />
          </button>
        </div>

        {/* Content based on checkout step */}
        {checkoutStep === 'cart' && (
          <>
            {cartItems.length === 0 ? (
              <div className="mp-drawer-empty">
                <div className="mp-empty-icon-wrap">
                  <ShoppingBag size={48} className="text-gray-300" />
                </div>
                <h4>Your cart is empty</h4>
                <p>Explore top products from local pharmacies, supermarkets, and tech vendors.</p>
                <button type="button" className="mp-empty-shop-btn" onClick={onClose}>
                  <span>Start Shopping</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="mp-drawer-scrollable">
                {/* List of items */}
                <div className="mp-drawer-items-list">
                  {cartItems.map((item) => (
                    <div key={item.id} className="mp-drawer-item-row">
                      <div className="mp-drawer-item-thumb" style={{ background: item.bgGradient || '#f1f5f9' }}>
                        <span>{item.emoji || '🛍️'}</span>
                      </div>

                      <div className="mp-drawer-item-details">
                        <span className="mp-drawer-item-store">{item.storeName}</span>
                        <h4 className="mp-drawer-item-name">{item.name}</h4>
                        <div className="mp-drawer-item-price-unit">
                          {formatPrice(item.price)} each
                        </div>

                        {/* Quantity Stepper */}
                        <div className="mp-drawer-qty-stepper">
                          <button
                            type="button"
                            className="mp-qty-btn"
                            onClick={() => onUpdateQty(item.id, Math.max(1, item.qty - 1))}
                            disabled={item.qty <= 1}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="mp-qty-val">{item.qty}</span>
                          <button
                            type="button"
                            className="mp-qty-btn"
                            onClick={() => onUpdateQty(item.id, item.qty + 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Total for item and delete */}
                      <div className="mp-drawer-item-actions">
                        <span className="mp-drawer-item-line-total">
                          {formatPrice(item.price * item.qty)}
                        </span>
                        <button
                          type="button"
                          className="mp-drawer-trash-btn"
                          onClick={() => onRemoveItem(item.id)}
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Code Section */}
                <div className="mp-drawer-coupon-box">
                  <div className="mp-coupon-input-group">
                    <Tag size={15} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Coupon code (e.g. STV20)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="mp-coupon-input"
                    />
                    <button
                      type="button"
                      className="mp-apply-coupon-btn"
                      onClick={handleApplyCoupon}
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <span className="mp-coupon-error">{couponError}</span>}
                  {appliedCoupon && (
                    <span className="mp-coupon-success">
                      ✓ Promo code <strong>{appliedCoupon}</strong> applied (20% off)!
                    </span>
                  )}
                </div>

                {/* Free Shipping Progress */}
                <div className="mp-shipping-progress-box">
                  {deliveryFee === 0 ? (
                    <div className="mp-free-ship-tag">
                      <Truck size={14} className="text-emerald-500" />
                      <span>Congratulations! You qualify for <strong>FREE Express Courier Delivery</strong></span>
                    </div>
                  ) : (
                    <div className="mp-free-ship-tag">
                      <Truck size={14} className="text-blue-500" />
                      <span>Add <strong>{formatPrice(15000 - rawSubtotal)}</strong> more to get <strong>FREE Express Delivery</strong>!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Breakdown & Checkout CTA */}
            {cartItems.length > 0 && (
              <div className="mp-drawer-footer">
                <div className="mp-breakdown-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(rawSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="mp-breakdown-row discount">
                    <span>Coupon Discount (20%)</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="mp-breakdown-row">
                  <span>Neighborhood Courier Dispatch</span>
                  <span>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span>
                </div>
                <div className="mp-breakdown-row total">
                  <span>Estimated Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>

                <button
                  type="button"
                  className="mp-checkout-btn"
                  onClick={() => setCheckoutStep('checkout-form')}
                >
                  <span>Proceed to Express Checkout</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Checkout Form Step */}
        {checkoutStep === 'checkout-form' && (
          <form className="mp-checkout-form-container" onSubmit={handleCheckoutSubmit}>
            <div className="mp-drawer-scrollable">
              <h4 className="mp-checkout-form-title">Delivery & Payment Details</h4>
              <p className="mp-checkout-form-sub">Your order will be dispatched to neighborhood courier riders immediately.</p>

              <div className="mp-form-field">
                <label>Full Name / Contact Person</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Chioma Nwachukwu"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mp-input"
                />
              </div>

              <div className="mp-form-field">
                <label>WhatsApp / Phone Number (for courier handover OTP)</label>
                <input
                  type="tel"
                  required
                  placeholder="+234 803 000 0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mp-input"
                />
              </div>

              <div className="mp-form-field">
                <label>Street Delivery Address & Landmark</label>
                <textarea
                  required
                  rows={2}
                  placeholder="House number, Street, Landmark, Apartment"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="mp-input"
                />
              </div>

              <div className="mp-form-field">
                <label>Payment Method</label>
                <div className="mp-payment-options-grid">
                  <label className={`mp-payment-radio ${paymentOption === 'paystack' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paystack"
                      checked={paymentOption === 'paystack'}
                      onChange={() => setPaymentOption('paystack')}
                    />
                    <div>
                      <strong>Paystack Instant</strong>
                      <span>Card, USSD, Bank Transfer (Secured)</span>
                    </div>
                  </label>

                  <label className={`mp-payment-radio ${paymentOption === 'cod' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentOption === 'cod'}
                      onChange={() => setPaymentOption('cod')}
                    />
                    <div>
                      <strong>Pay on Doorstep Delivery</strong>
                      <span>POS Card Swipe or Cash upon arrival</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mp-escrow-notice">
                <ShieldCheck size={18} className="text-emerald-500" />
                <div>
                  <strong>Subtech (STV) Escrow Guarantee</strong>
                  <p>Your payment remains safe in escrow until you inspect your tamper-proof sealed parcel.</p>
                </div>
              </div>
            </div>

            <div className="mp-drawer-footer">
              <div className="mp-breakdown-row total">
                <span>Amount to Pay</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
              <div className="mp-checkout-btns-group">
                <button
                  type="button"
                  className="mp-back-to-cart-btn"
                  onClick={() => setCheckoutStep('cart')}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="mp-confirm-order-btn"
                >
                  <span>Authorize & Place Order</span>
                  <CheckCircle size={16} />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Processing Spinner */}
        {checkoutStep === 'processing' && (
          <div className="mp-drawer-empty">
            <div className="mp-spinner-large" />
            <h4 style={{ marginTop: '20px' }}>Dispatching Order to Neighborhood Hub...</h4>
            <p>Matching with available certified courier riders in your corridor.</p>
          </div>
        )}

        {/* Order Success Step */}
        {checkoutStep === 'success' && (
          <div className="mp-drawer-empty mp-success-view">
            <div className="mp-success-badge-icon">
              <CheckCircle size={56} className="text-emerald-500" />
            </div>
            <h3>Order Successfully Placed!</h3>
            <p className="mp-success-order-num">
              Order Reference: <strong>{generatedOrderId}</strong>
            </p>
            <p className="mp-success-desc">
              The merchant is preparing your items and a neighborhood motorcycle courier has been assigned.
            </p>

            <div className="mp-success-actions">
              <button
                type="button"
                className="mp-track-now-btn"
                onClick={() => {
                  onClose();
                  if (onTrackOrder) onTrackOrder(generatedOrderId);
                }}
              >
                <Truck size={16} />
                <span>Track Live Courier Dispatch</span>
              </button>
              <button
                type="button"
                className="mp-continue-btn"
                onClick={onClose}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
