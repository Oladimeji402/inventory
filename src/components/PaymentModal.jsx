import { useState, useEffect } from 'react';
import { X, Banknote, CreditCard, Building2, CheckCircle2, Bookmark, RotateCcw, AlertCircle, User, Percent } from 'lucide-react';
import { naira } from '../lib/format';

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20];
const CASH_DENOMINATIONS = [500, 1000, 2000, 5000, 10000, 20000];

export default function PaymentModal({
  open,
  onClose,
  total,
  subtotal,
  discountPct,
  onDiscountChange,
  discountAmount,
  maxDiscount,
  role,
  customerName,
  onCustomerChange,
  paymentMethod,
  onPaymentChange,
  onConfirmPayment,
  onHoldSale,
  onResetSale,
  cart = []
}) {
  const [cashTendered, setCashTendered] = useState('');
  const [activeTab, setActiveTab] = useState(paymentMethod || 'Cash');

  useEffect(() => {
    if (open) {
      setActiveTab(paymentMethod || 'Cash');
      setCashTendered('');
    }
  }, [open, paymentMethod]);

  if (!open) return null;

  const isCash = activeTab === 'Cash';
  const tenderValue = cashTendered !== '' ? parseFloat(cashTendered) || 0 : total;
  const changeDue = Math.max(0, tenderValue - total);
  const isShort = isCash && cashTendered !== '' && tenderValue < total;

  const quickNotes = CASH_DENOMINATIONS.filter((note) => note >= total).slice(0, 4);

  function handleTabSelect(method) {
    setActiveTab(method);
    onPaymentChange(method);
    if (method !== 'Cash') {
      setCashTendered('');
    }
  }

  function handleComplete() {
    if (isCash) {
      const effectiveTender = cashTendered !== '' ? parseFloat(cashTendered) || 0 : total;
      const effectiveChange = Math.max(0, effectiveTender - total);
      onConfirmPayment({
        paymentMethod: 'Cash',
        amountTendered: effectiveTender,
        changeDue: effectiveChange
      });
    } else {
      onConfirmPayment({
        paymentMethod: activeTab,
        amountTendered: total,
        changeDue: 0
      });
    }
    onClose();
  }

  function handleHold() {
    onHoldSale();
    onClose();
  }

  function handleReset() {
    onResetSale();
    onClose();
  }

  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="payment-modal-card fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Payment and Checkout"
      >
        <div className="payment-modal-header">
          <div>
            <span className="payment-modal-subtitle">Checkout · {itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
            <h2>Select Payment Method</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            title="Close payment window"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="payment-modal-total-banner">
          <div className="total-banner-label">Total Amount Due</div>
          <div className="total-banner-amount mono">{naira(total)}</div>
          {discountPct > 0 && (
            <div className="total-banner-discount">
              Subtotal: {naira(subtotal)} ({discountPct}% discount -{naira(discountAmount)})
            </div>
          )}
        </div>

        <div className="payment-method-tabs" role="tablist" aria-label="Payment methods">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'Cash'}
            className={`payment-tab-btn ${activeTab === 'Cash' ? 'active' : ''}`}
            onClick={() => handleTabSelect('Cash')}
          >
            <Banknote size={20} />
            <div className="payment-tab-text">
              <strong>Cash</strong>
              <span>Exact / Change</span>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'Card'}
            className={`payment-tab-btn ${activeTab === 'Card' ? 'active' : ''}`}
            onClick={() => handleTabSelect('Card')}
          >
            <CreditCard size={20} />
            <div className="payment-tab-text">
              <strong>Card</strong>
              <span>POS Terminal</span>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'Transfer'}
            className={`payment-tab-btn ${activeTab === 'Transfer' ? 'active' : ''}`}
            onClick={() => handleTabSelect('Transfer')}
          >
            <Building2 size={20} />
            <div className="payment-tab-text">
              <strong>Transfer</strong>
              <span>Bank Credit</span>
            </div>
          </button>
        </div>

        <div className="payment-tab-content">
          {isCash && (
            <div className="cash-payment-section">
              <label className="field-label" htmlFor="modal-cash-tender">
                Cash Received from Customer
              </label>

              <div className="quick-denom-pills">
                <button
                  type="button"
                  className={`denom-pill ${cashTendered === String(total) ? 'selected' : ''}`}
                  onClick={() => setCashTendered(String(total))}
                >
                  Exact ({naira(total)})
                </button>
                {quickNotes.map((note) => (
                  <button
                    key={note}
                    type="button"
                    className={`denom-pill ${cashTendered === String(note) ? 'selected' : ''}`}
                    onClick={() => setCashTendered(String(note))}
                  >
                    {naira(note)}
                  </button>
                ))}
              </div>

              <div className="tender-input-wrap">
                <span className="currency-prefix">₦</span>
                <input
                  id="modal-cash-tender"
                  type="number"
                  min="0"
                  step="any"
                  className={`modal-tender-input ${isShort ? 'error' : ''}`}
                  placeholder={String(total)}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  aria-label="Amount received"
                  autoFocus
                />
                {cashTendered && (
                  <button
                    type="button"
                    className="clear-tender-btn"
                    onClick={() => setCashTendered('')}
                    title="Clear input"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className={`change-display-card ${isShort ? 'short' : 'change'}`}>
                {isShort ? (
                  <>
                    <AlertCircle size={18} className="change-icon short-icon" />
                    <div className="change-details">
                      <span>Amount Short</span>
                      <strong className="mono">{naira(total - tenderValue)}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} className="change-icon" />
                    <div className="change-details">
                      <span>Change Due</span>
                      <strong className="mono">{naira(changeDue)}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Card' && (
            <div className="method-info-box">
              <div className="method-info-icon">
                <CreditCard size={28} />
              </div>
              <h4>Swipe / Tap Card on POS Terminal</h4>
              <p>Swipe or insert customer's card on the physical terminal. Click Confirm once approved.</p>
              <div className="info-amount-tag mono">{naira(total)}</div>
            </div>
          )}

          {activeTab === 'Transfer' && (
            <div className="method-info-box">
              <div className="method-info-icon">
                <Building2 size={28} />
              </div>
              <h4>Direct Bank Transfer</h4>
              <p>Verify customer's transfer alert or confirmation receipt before completing the order.</p>
              <div className="info-amount-tag mono">{naira(total)}</div>
            </div>
          )}

          <div className="payment-extra-details">
            <div className="detail-field">
              <label className="field-label" htmlFor="modal-customer-input">
                <User size={13} /> Customer Name
              </label>
              <input
                id="modal-customer-input"
                value={customerName}
                onChange={(e) => onCustomerChange(e.target.value)}
                placeholder="Walk-in Customer"
                className="modal-input"
              />
            </div>

            <div className="detail-field">
              <div className="discount-header">
                <span className="field-label">
                  <Percent size={13} /> Discount
                </span>
                <span className="role-max-discount mono">Max: {maxDiscount}% ({role})</span>
              </div>
              <div className="discount-chips-grid">
                {DISCOUNT_PRESETS.filter((pct) => pct <= maxDiscount).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className={`discount-chip ${discountPct === pct ? 'active' : ''}`}
                    onClick={() => onDiscountChange(pct)}
                  >
                    {pct === 0 ? 'None' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="payment-modal-actions">
          <button
            type="button"
            className="secondary-btn modal-aux-btn"
            onClick={handleHold}
            title="Hold this sale for later"
          >
            <Bookmark size={15} />
            Hold Sale
          </button>

          <button
            type="button"
            className="secondary-btn modal-aux-btn"
            onClick={handleReset}
            title="Reset current cart"
          >
            <RotateCcw size={15} />
            Reset Sale
          </button>

          <button
            type="button"
            className="primary-btn pay-confirm-btn"
            onClick={handleComplete}
            disabled={cart.length === 0 || isShort}
          >
            <CheckCircle2 size={18} />
            Pay {naira(total)}
          </button>
        </div>
      </div>
    </div>
  );
}
