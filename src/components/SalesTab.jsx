import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Calculator,
  ShoppingCart,
  RotateCcw,
  Bookmark,
  User,
  UtensilsCrossed,
  Milk,
  Soup,
  Wheat,
  Droplets,
  CupSoda,
  Sparkles,
  Package,
  Utensils,
  Salad,
  Flame,
  Tag,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { naira } from '../lib/format';
import CalculatorPopup from './CalculatorPopup';
import PaymentModal from './PaymentModal';

function getCategoryIcon(category = '') {
  const normalized = category.toLowerCase();
  if (normalized === 'all') return UtensilsCrossed;
  if (normalized.includes('dair') || normalized.includes('milk')) return Milk;
  if (normalized.includes('noodle') || normalized.includes('pasta')) return Soup;
  if (
    normalized.includes('grain') ||
    normalized.includes('rice') ||
    normalized.includes('flour') ||
    normalized.includes('sugar') ||
    normalized.includes('semo')
  )
    return Wheat;
  if (normalized.includes('oil')) return Droplets;
  if (normalized.includes('drink') || normalized.includes('beverage')) return CupSoda;
  if (normalized.includes('house') || normalized.includes('clean') || normalized.includes('detergent'))
    return Sparkles;
  if (normalized.includes('can') || normalized.includes('tin') || normalized.includes('sardine'))
    return Package;
  if (normalized.includes('meal') || normalized.includes('food')) return Utensils;
  if (normalized.includes('veg') || normalized.includes('salad')) return Salad;
  if (normalized.includes('special') || normalized.includes('hot')) return Flame;
  return Tag;
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
  onResumeHeldSale,
  session,
  onClockOut
}) {
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const totalItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Pick top 3 in-stock products for the quick banner highlight cards
  const featuredProducts = useMemo(() => {
    return products.filter((p) => p.stock > 0).slice(0, 3);
  }, [products]);

  const orderNumber = useMemo(() => {
    if (cart.length > 0) {
      const code = cart[0].id.replace(/\D/g, '') || '1';
      return `209${code.padStart(4, '0')}`;
    }
    return '2091001';
  }, [cart]);

  function handleOpenPayment() {
    if (cart.length === 0) return;
    setPaymentModalOpen(true);
  }

  function handleConfirmPayment(paymentDetails) {
    onCheckout(paymentDetails);
  }

  return (
    <div className="pos-main-container">
      {/* Left / Catalog Area */}
      <div className="pos-catalog-column">
        {/* Top Greeting & Header Bar */}
        <div className="pos-header-bar">
          <div className="pos-welcome-meta">
            <h1 className="pos-welcome-title">Welcome</h1>
            <p className="pos-welcome-sub">Counterpoint POS · Cashier on shift</p>
          </div>

          <div className="pos-header-search-wrap">
            <Search size={18} className="pos-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search menu..."
              className="pos-header-search-input"
              aria-label="Search menu"
            />
          </div>

          <div className="pos-header-user-dock">
            <div className="pos-user-chip" title={`${session?.employee?.name || 'Cashier'} (${role || 'Staff'})`}>
              <div className="pos-user-avatar">
                <User size={15} />
              </div>
              <div className="pos-user-details">
                <strong>{session?.employee?.name || 'M. Cashier'}</strong>
                <span>{role || 'On duty'}</span>
              </div>
            </div>

            <button
              type="button"
              className="pos-header-icon-btn"
              onClick={() => setCalculatorOpen(true)}
              title="Open Calculator"
              aria-label="Open calculator"
            >
              <Calculator size={17} />
            </button>

            {onClockOut && (
              <button
                type="button"
                className="pos-header-icon-btn"
                onClick={onClockOut}
                title="Clock out"
                aria-label="Clock out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="pos-categories-row" role="tablist" aria-label="Product categories">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category);
            const isActive = categoryFilter === category;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`pos-category-pill ${isActive ? 'active' : ''}`}
                onClick={() => onCategoryChange(category)}
              >
                <Icon size={16} className="category-pill-icon" />
                <span>{category === 'All' ? 'All Menu' : category}</span>
              </button>
            );
          })}
        </div>

        {/* Featured Promo Cards / Highlights */}
        {featuredProducts.length > 0 && !search && categoryFilter === 'All' && (
          <div className="pos-featured-row">
            {featuredProducts.map((prod) => (
              <div
                key={prod.id}
                className="pos-featured-card"
                onClick={() => onAddToCart(prod)}
                title={`Add ${prod.name} to order`}
              >
                <div className="featured-card-info">
                  <span className="featured-available-badge">Available Now</span>
                  <h3 className="featured-card-title">{prod.name}</h3>
                  <div className="featured-order-cta">
                    <span>Order Now</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
                <div className="featured-card-image-wrap">
                  {prod.image ? (
                    <img src={prod.image} alt={prod.name} className="featured-card-img" />
                  ) : (
                    <div className="featured-initials-fallback">
                      {prod.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Product Grid */}
        <div className="pos-product-grid">
          {products.map((product) => {
            const inCart = cart.find((item) => item.id === product.id);
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= 5;

            return (
              <div
                key={product.id}
                className={`modern-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
              >
                <div
                  className="product-card-image-box"
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="modern-product-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="modern-initials-img">
                      {product.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {isOutOfStock && (
                    <div className="product-status-tag not-available">Not Available</div>
                  )}

                  {!isOutOfStock && isLowStock && (
                    <div className="product-status-tag low-stock">Low: {product.stock} left</div>
                  )}
                </div>

                <div className="modern-product-content">
                  <button
                    type="button"
                    className="modern-product-title-btn"
                    onClick={() => !isOutOfStock && onAddToCart(product)}
                    disabled={isOutOfStock}
                    title={product.name}
                  >
                    <span className="modern-product-title">{product.name}</span>
                  </button>

                  <div className="modern-product-bottom-row">
                    <div className="modern-product-price-box">
                      <span className="modern-product-price mono">{naira(product.price)}</span>
                    </div>

                    <div className="modern-stepper-control">
                      {inCart ? (
                        <div className="inline-cart-stepper">
                          <button
                            type="button"
                            className="stepper-btn minus"
                            onClick={() => onChangeQty(product.id, -1)}
                            aria-label={`Decrease quantity of ${product.name}`}
                          >
                            <Minus size={13} />
                          </button>
                          <span className="stepper-qty-num mono">{inCart.qty}</span>
                          <button
                            type="button"
                            className="stepper-btn plus"
                            onClick={() => onChangeQty(product.id, 1)}
                            disabled={inCart.qty >= product.stock}
                            aria-label={`Increase quantity of ${product.name}`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="modern-quick-add-btn"
                          onClick={() => onAddToCart(product)}
                          disabled={isOutOfStock}
                          aria-label="Add to order"
                          title="Add to order"
                        >
                          <Plus size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {products.length === 0 && (
            <div className="pos-no-results">
              <Package size={36} className="no-results-icon" />
              <p>No products found matching your search.</p>
              <span>Try adjusting your category filter or search terms.</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar / Order Summary */}
      <aside className="pos-order-summary-sidebar" aria-label="Order Summary">
        {/* Sidebar Header */}
        <div className="order-summary-header">
          <div className="order-summary-title-area">
            <h2>Order Summary</h2>
            <span className="order-id-label mono">Order ID {orderNumber}</span>
          </div>

          <div className="order-summary-header-actions">
            <button
              type="button"
              className="summary-icon-action-btn"
              onClick={() => setCalculatorOpen(true)}
              title="Calculator dock"
              aria-label="Open calculator"
            >
              <Calculator size={15} />
            </button>

            <button
              type="button"
              className="summary-icon-action-btn"
              onClick={onHoldSale}
              disabled={cart.length === 0}
              title="Hold this sale"
              aria-label="Quick hold sale"
            >
              <Bookmark size={15} />
            </button>

            <button
              type="button"
              className="summary-icon-action-btn"
              onClick={onResetSale}
              title="Reset current cart"
              aria-label="Quick reset sale"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Held Sales section if any exist */}
        {heldSales.length > 0 && (
          <div className="sidebar-held-sales-bar">
            <span className="held-sales-caption">Held Orders ({heldSales.length})</span>
            <div className="held-sales-chip-row">
              {heldSales.map((held) => {
                const count = held.cart.reduce((sum, i) => sum + i.qty, 0);
                return (
                  <button
                    key={held.id}
                    type="button"
                    className="held-order-chip"
                    onClick={() => onResumeHeldSale(held.id)}
                    title={`Resume held order for ${held.customerName || 'Customer'}`}
                    aria-label={`Resume held order for ${held.customerName || 'Walk-in'}`}
                  >
                    <strong>{held.customerName || 'Walk-in'}</strong>
                    <span className="mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cart Item Rows */}
        <div className="order-summary-cart-area">
          <div className="order-section-headline">
            <span>Your orders</span>
            <span className="order-count-pill mono">({totalItemCount})</span>
          </div>

          <div className="order-cart-scroll-list">
            {cart.length === 0 ? (
              <div className="order-empty-cart">
                <ShoppingCart size={32} className="empty-cart-icon" />
                <p>Your order is empty</p>
                <span>Select items from the catalog on the left to begin.</span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="order-cart-row-card">
                  <div className="cart-qty-indicator mono">
                    <button
                      type="button"
                      className="cart-inline-btn minus"
                      onClick={() => onChangeQty(item.id, -1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="cart-qty-label">x{item.qty}</span>
                    <button
                      type="button"
                      className="cart-inline-btn plus"
                      onClick={() => onChangeQty(item.id, 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  <div className="order-cart-thumb">
                    {item.image ? (
                      <img src={item.image} alt="" className="cart-thumb-img" />
                    ) : (
                      <div className="cart-thumb-initials">{item.name.slice(0, 2).toUpperCase()}</div>
                    )}
                  </div>

                  <div className="order-cart-info">
                    <strong className="cart-item-name">{item.name}</strong>
                    <span className="cart-item-unit mono">{naira(item.price)}</span>
                  </div>

                  <div className="order-cart-subtotal mono">{naira(item.price * item.qty)}</div>

                  <button
                    type="button"
                    className="order-cart-trash-btn"
                    onClick={() => onRemoveFromCart(item.id)}
                    aria-label={`Remove ${item.name}`}
                    title="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Summary Box */}
        <div className="order-payment-summary-card">
          <h4 className="payment-summary-title">Payment Summary</h4>

          <div className="summary-data-line">
            <span>Price</span>
            <strong className="mono">{naira(subtotal)}</strong>
          </div>

          {discountPct > 0 && (
            <div className="summary-data-line discount-line">
              <span>Discount ({discountPct}%)</span>
              <strong className="mono">-{naira(discountAmount)}</strong>
            </div>
          )}

          <div className="summary-data-line customer-line">
            <span>Customer</span>
            <span className="customer-tag">{customerName?.trim() || 'Walk-in'}</span>
          </div>

          <div className="summary-divider-line" />

          <div className="summary-data-line total-line">
            <span>Total</span>
            <strong className="mono total-amount">{naira(total)}</strong>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="order-summary-footer-actions">
          <button
            type="button"
            className="order-confirm-btn"
            onClick={handleOpenPayment}
            disabled={cart.length === 0}
          >
            Confirm Order · Pay {naira(total)}
          </button>

          <div className="order-secondary-actions-row">
            <button
              type="button"
              className="secondary-btn order-sub-btn"
              onClick={onHoldSale}
              disabled={cart.length === 0}
            >
              <Bookmark size={14} />
              Hold Sale
            </button>
            <button
              type="button"
              className="secondary-btn order-sub-btn"
              onClick={onResetSale}
              disabled={cart.length === 0 && discountPct === 0}
            >
              <RotateCcw size={14} />
              Reset Sale
            </button>
          </div>
        </div>
      </aside>

      {/* Floating Calculator Modal */}
      <CalculatorPopup open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />

      {/* Payment and Checkout Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        total={total}
        subtotal={subtotal}
        discountPct={discountPct}
        onDiscountChange={onDiscountChange}
        discountAmount={discountAmount}
        maxDiscount={maxDiscount}
        role={role}
        customerName={customerName}
        onCustomerChange={onCustomerChange}
        paymentMethod={paymentMethod}
        onPaymentChange={onPaymentChange}
        onConfirmPayment={handleConfirmPayment}
        onHoldSale={onHoldSale}
        onResetSale={onResetSale}
        cart={cart}
      />
    </div>
  );
}
