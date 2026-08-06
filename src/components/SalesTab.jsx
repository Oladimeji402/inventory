import { useState } from 'react';
import { Search, Plus, Minus, Trash2, DollarSign, Calculator } from 'lucide-react';
import { naira } from '../lib/format';
import CalculatorPopup from './CalculatorPopup';

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20];

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

  return (
    <div className="pos-layout">
      <aside className="panel sidebar sale-panel">
        <div className="section-title sale-title">
          <div className="sale-title-left">
            <DollarSign size={16} />
            <h2>Current sale</h2>
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
            <span className="field-label">Held sales</span>
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
            <span>Product</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Subtotal</span>
            <span aria-hidden="true" />
          </div>
          <div className="cart-list">
            {cart.length === 0 && (
              <div className="empty-state">Your cart is empty. Select a product to begin.</div>
            )}
            {cart.map((item) => (
              <div key={item.id} className="cart-row">
                <strong className="cart-product">{item.name}</strong>
                <div className="qty-control">
                  <button type="button" onClick={() => onChangeQty(item.id, -1)} aria-label="Decrease quantity">
                    <Minus size={12} />
                  </button>
                  <span className="mono">{item.qty}</span>
                  <button type="button" onClick={() => onChangeQty(item.id, 1)} aria-label="Increase quantity">
                    <Plus size={12} />
                  </button>
                </div>
                <span className="mono cart-price">{naira(item.price)}</span>
                <span className="mono cart-subtotal">{naira(item.price * item.qty)}</span>
                <button type="button" className="cart-remove" onClick={() => onRemoveFromCart(item.id)} aria-label="Remove item">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="receipt-box">
          <label className="field-label">Customer</label>
          <input value={customerName} onChange={(e) => onCustomerChange(e.target.value)} placeholder="Customer name" />

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

          <label className="field-label">Payment method</label>
          <select value={paymentMethod} onChange={(e) => onPaymentChange(e.target.value)}>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Transfer">Transfer</option>
          </select>

          <div className="totals mono">
            <div>
              <span>Subtotal</span>
              <strong>{naira(subtotal)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>- {naira(discountAmount)}</strong>
            </div>
            <div className="grand-total">
              <span>Total</span>
              <strong>{naira(total)}</strong>
            </div>
          </div>

          <div className="sale-actions">
            <button type="button" className="hold-btn" onClick={onHoldSale}>
              Hold
            </button>
            <button type="button" className="reset-btn" onClick={onResetSale}>
              Reset
            </button>
            <button type="button" className="primary-btn" onClick={onCheckout}>
              Pay now
            </button>
          </div>
        </div>
      </aside>

      <section className="panel products-panel">
        <div className="section-title">
          <Search size={16} />
          <h2>Products</h2>
        </div>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or SKU"
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
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              className={`product-card ${product.stock <= 0 ? 'disabled' : ''}`}
              onClick={() => onAddToCart(product)}
              disabled={product.stock <= 0}
            >
              <div className="product-tile">
                <span className="product-price-badge mono">{naira(product.price)}</span>
                <span className="product-initials">{product.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <strong>{product.name}</strong>
            </button>
          ))}
          {products.length === 0 && <p className="helper">No products match this search or category.</p>}
        </div>
      </section>

      <CalculatorPopup open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </div>
  );
}
