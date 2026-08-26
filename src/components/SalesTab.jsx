import { useState } from 'react';
import { Search, Plus, Minus, Trash2, DollarSign, Calculator, ShoppingCart, Banknote } from 'lucide-react';
import { naira } from '../lib/format';
import CalculatorPopup from './CalculatorPopup';

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20];
const CASH_DENOMINATIONS = [500, 1000, 2000, 5000, 10000, 20000];

const CATEGORY_THEMES = {
  Dairy: { bg: '#e8f4fd', text: '#0284c7', border: '#bae6fd' },
  Noodles: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  Grains: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  Oil: { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
  Drinks: { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff' },
  Household: { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4' },
  Canned: { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' },
  Food: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  Soup: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }
};

function getCategoryTheme(category = '') {
  return CATEGORY_THEMES[category] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
}

export default function SalesTab({
  products,
  categories,
  categoryFilter,
  onCategoryChange,
  search,
  onSearchChange,
  onAddToCart,
  cart,
  onChangeQty,
  onRemoveFromCart,
  customerName,
  onCustomerChange,
  discountPct,
  onDiscountChange,
  maxDiscount,
  role,
  paymentMethod,
  onPaymentChange,
  subtotal,
  discountAmount,
  total,
  onCheckout,
  onResetSale,
  onHoldSale,
  heldSales = [],
  onResumeHeldSale
}) {
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [cashTendered, setCashTendered] = useState('');

  const totalItemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const tenderValue = cashTendered !== '' ? parseFloat(cashTendered) || 0 : total;
  const isCash = paymentMethod === 'Cash';
  const changeDue = Math.max(0, tenderValue - total);
  const isShort = isCash && cashTendered !== '' && tenderValue < total;

  function handlePaymentMethodChange(e) {
    const nextMethod = e.target.value;
    onPaymentChange(nextMethod);
    if (nextMethod !== 'Cash') {
      setCashTendered('');
    }
  }

  function handlePayClick() {
    if (isCash) {
      const effectiveTender = cashTendered !== '' ? parseFloat(cashTendered) || 0 : total;
      const effectiveChange = Math.max(0, effectiveTender - total);
      onCheckout({ amountTendered: effectiveTender, changeDue: effectiveChange });
    } else {
      onCheckout({ amountTendered: total, changeDue: 0 });
    }
  }

  function handleReset() {
    setCashTendered('');
    onResetSale();
  }

  function handleHold() {
    setCashTendered('');
    onHoldSale();
  }

  // Quick cash buttons for convenient checkout
  const quickNotes = CASH_DENOMINATIONS.filter((note) => note >= total).slice(0, 3);

  return (
    <div className="pos-layout">
      <aside className="panel sidebar sale-panel">
        <div className="section-title sale-title">
          <div className="sale-title-left">
            <DollarSign size={18} />
            <h2>Current sale</h2>
            {totalItemCount > 0 && (
              <span className="cart-count-badge mono">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <button
            type="button"
            className="calc-trigger"
            onClick={() => setCalculatorOpen(true)}
            title="Open calculator"
            aria-label="Open calculator"
          >
            <Calculator size={16} />
          </button>
        </div>

        {heldSales.length > 0 && (
          <div className="held-sales">
            <span className="field-label">Held sales ({heldSales.length})</span>
            <div className="held-sales-list">
              {heldSales.map((held) => {
                const itemCount = held.cart.reduce((sum, item) => sum + item.qty, 0);
                return (
                  <button
                    key={held.id}
                    type="button"
                    className="held-sale-chip"
                    onClick={() => onResumeHeldSale(held.id)}
                    title="Resume held sale"
                  >
                    <strong>{held.customerName || 'Walk-in'}</strong>
                    <span className="mono">{itemCount} items</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="cart-table-wrap">
          <div className="cart-table-head mono">
            <span>Product ({cart.length})</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Subtotal</span>
            <span aria-hidden="true" />
          </div>
          <div className="cart-list">
            {cart.length === 0 && (
              <div className="empty-state">
                <ShoppingCart size={28} className="empty-state-icon" />
                <p>Your cart is empty.</p>
                <span>Select products on the right to start a sale.</span>
              </div>
            )}
            {cart.map((item) => (
              <div key={item.id} className="cart-row">
                <div className="cart-product-info">
                  <strong className="cart-product">{item.name}</strong>
                  <span className="cart-sku mono">{item.id}</span>
                </div>
                <div className="qty-control">
                  <button type="button" onClick={() => onChangeQty(item.id, -1)} aria-label="Decrease quantity">
                    <Minus size={14} />
                  </button>
                  <span className="mono">{item.qty}</span>
                  <button type="button" onClick={() => onChangeQty(item.id, 1)} aria-label="Increase quantity">
                    <Plus size={14} />
                  </button>
                </div>
                <span className="mono cart-price">{naira(item.price)}</span>
                <span className="mono cart-subtotal">{naira(item.price * item.qty)}</span>
                <button
                  type="button"
                  className="cart-remove"
                  onClick={() => onRemoveFromCart(item.id)}
                  aria-label={`Remove ${item.name}`}
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="receipt-box">
          <label className="field-label" htmlFor="customer-input">Customer</label>
          <input
            id="customer-input"
            value={customerName}
            onChange={(e) => onCustomerChange(e.target.value)}
            placeholder="Customer name"
          />

          <label className="field-label">Discount</label>
          <div className="category-chips">
            {DISCOUNT_PRESETS.filter((pct) => pct <= maxDiscount).map((pct) => (
              <button
                key={pct}
                type="button"
                className={`chip ${discountPct === pct ? 'active' : ''}`}
                onClick={() => onDiscountChange(pct)}
              >
                {pct}%
              </button>
            ))}
          </div>
          <p className="helper">Allowed limit for {role}: {maxDiscount}%</p>

          <label className="field-label" htmlFor="payment-method-select">Payment method</label>
          <select id="payment-method-select" value={paymentMethod} onChange={handlePaymentMethodChange}>
            <option value="Cash">Cash</option>
            <option value="Card">Card / POS Terminal</option>
            <option value="Transfer">Bank Transfer</option>
          </select>

          {isCash && total > 0 && (
            <div className="cash-tender-block">
              <div className="cash-tender-header">
                <label className="field-label" htmlFor="tender-input">
                  <Banknote size={14} /> Cash tendered
                </label>
                {quickNotes.length > 0 && (
                  <div className="quick-tender-chips">
                    <button
                      type="button"
                      className="quick-chip exact"
                      onClick={() => setCashTendered(String(total))}
                    >
                      Exact
                    </button>
                    {quickNotes.map((note) => (
                      <button
                        key={note}
                        type="button"
                        className="quick-chip"
                        onClick={() => setCashTendered(String(note))}
                      >
                        {naira(note)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                id="tender-input"
                type="number"
                min="0"
                className={`tender-input ${isShort ? 'error' : ''}`}
                placeholder={`e.g. ${total}`}
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
              />

              <div className="change-due-box mono">
                <span>{isShort ? 'Remaining balance:' : 'Change due to customer:'}</span>
                <strong className={isShort ? 'short-amount' : 'change-amount'}>
                  {isShort ? naira(total - tenderValue) : naira(changeDue)}
                </strong>
              </div>
            </div>
          )}

          <div className="totals mono">
            <div>
              <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
              <strong>{naira(subtotal)}</strong>
            </div>
            {discountPct > 0 && (
              <div className="discount-row">
                <span>Discount ({discountPct}%)</span>
                <strong>- {naira(discountAmount)}</strong>
              </div>
            )}
            <div className="grand-total">
              <span>Total amount</span>
              <strong>{naira(total)}</strong>
            </div>
          </div>

          <div className="sale-actions">
            <button type="button" className="hold-btn" onClick={handleHold} title="Park this sale for later">
              Hold
            </button>
            <button type="button" className="reset-btn" onClick={handleReset} title="Clear current cart">
              Reset
            </button>
            <button
              type="button"
              className="primary-btn pay-btn"
              onClick={handlePayClick}
              disabled={cart.length === 0}
            >
              Pay now ({naira(total)})
            </button>
          </div>
        </div>
      </aside>

      <section className="panel products-panel">
        <div className="section-title">
          <Search size={18} />
          <h2>Products Catalog</h2>
        </div>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, SKU or category..."
          className="search-input"
        />
        <div className="category-chips">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`chip ${categoryFilter === category ? 'active' : ''}`}
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="product-grid">
          {products.map((product) => {
            const theme = getCategoryTheme(product.category);
            return (
              <button
                key={product.id}
                type="button"
                className={`product-card ${product.stock <= 0 ? 'disabled' : ''}`}
                onClick={() => onAddToCart(product)}
                disabled={product.stock <= 0}
              >
                <div
                  className="product-tile"
                  style={{
                    background: `linear-gradient(145deg, ${theme.bg}, #ffffff)`,
                    borderColor: theme.border
                  }}
                >
                  <span className="product-price-badge mono">{naira(product.price)}</span>
                  <span
                    className="product-category-tag"
                    style={{ color: theme.text, borderColor: theme.border }}
                  >
                    {product.category}
                  </span>
                  <span className="product-initials" style={{ color: theme.text }}>
                    {product.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <strong className="product-title">{product.name}</strong>
              </button>
            );
          })}
          {products.length === 0 && (
            <div className="no-products-msg">
              <p className="helper">No products match this search or category filter.</p>
            </div>
          )}
        </div>
      </section>

      <CalculatorPopup open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </div>
  );
}
