import { Search, Plus, Minus, Trash2, DollarSign } from 'lucide-react';
import { naira } from '../lib/format';

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
  onCheckout
}) {
  return (
    <div className="pos-layout">
      <section className="panel">
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
              className={`product-card ${product.stock <= 0 ? 'disabled' : ''}`}
              onClick={() => onAddToCart(product)}
              disabled={product.stock <= 0}
            >
              <div className="product-meta">
                <span className="mono">{product.id}</span>
                <span>{product.category}</span>
              </div>
              <strong>{product.name}</strong>
              <div className="product-foot">
                <span className="mono price">{naira(product.price)}</span>
                <span className={product.stock <= 5 ? 'stock low' : 'stock'}>{product.stock} left</span>
              </div>
            </button>
          ))}
          {products.length === 0 && <p className="helper">No products match this search or category.</p>}
        </div>
      </section>

      <aside className="panel sidebar">
        <div className="section-title">
          <DollarSign size={16} />
          <h2>Current sale</h2>
        </div>
        <div className="cart-list">
          {cart.length === 0 && <div className="empty-state">Your cart is empty. Select a product to begin.</div>}
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-top">
                <strong>{item.name}</strong>
                <button onClick={() => onRemoveFromCart(item.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="cart-item-bottom">
                <div className="qty-control">
                  <button onClick={() => onChangeQty(item.id, -1)}>
                    <Minus size={12} />
                  </button>
                  <span className="mono">{item.qty}</span>
                  <button onClick={() => onChangeQty(item.id, 1)}>
                    <Plus size={12} />
                  </button>
                </div>
                <span className="mono">{naira(item.price * item.qty)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="receipt-box">
          <label className="field-label">Customer</label>
          <input value={customerName} onChange={(e) => onCustomerChange(e.target.value)} placeholder="Customer name" />

          <label className="field-label">Discount</label>
          <div className="category-chips">
            {DISCOUNT_PRESETS.filter((pct) => pct <= maxDiscount).map((pct) => (
              <button
                key={pct}
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

          <button className="primary-btn wide" onClick={onCheckout}>
            Complete sale
          </button>
        </div>
      </aside>
    </div>
  );
}
