import React, { useState } from 'react';
import { 
  X, 
  Star, 
  ShoppingBag, 
  Heart, 
  GitCompare, 
  ShieldCheck, 
  Truck, 
  Store, 
  Check, 
  Plus, 
  Minus,
  ExternalLink
} from 'lucide-react';

export default function MarketplaceQuickViewModal({
  product,
  onClose,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  onOpenStorefront,
  formatPrice
}) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) return null;

  function handleAdd() {
    onAddToCart({ ...product, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  function handleBuyNow() {
    onAddToCart({ ...product, qty });
    onClose();
  }

  return (
    <div className="mp-modal-backdrop" onClick={onClose}>
      <div className="mp-quickview-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button type="button" className="mp-modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="mp-quickview-grid">
          {/* Visual / Image Side */}
          <div className="mp-quickview-media" style={{ background: product.bgGradient }}>
            <span className="mp-quickview-emoji">{product.emoji}</span>
            {product.discountPct > 0 && (
              <span className="mp-quickview-discount-tag">-{product.discountPct}% OFF</span>
            )}
          </div>

          {/* Details Side */}
          <div className="mp-quickview-info">
            {/* Category & SKU */}
            <div className="mp-quickview-meta-row">
              <span className="mp-quickview-category-pill">{product.categoryName}</span>
              <span className="mp-quickview-sku">SKU: {product.sku}</span>
            </div>

            {/* Title */}
            <h2 className="mp-quickview-title">{product.name}</h2>

            {/* Ratings & Stock */}
            <div className="mp-quickview-rating-row">
              <div className="mp-stars-row">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="mp-rating-val">{product.rating}</span>
              <span className="mp-rating-count">({product.reviewsCount} customer reviews)</span>
              <span className="mp-divider-dot">·</span>
              <span className="mp-stock-status-tag">
                <span className="mp-green-dot" /> {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
              </span>
            </div>

            {/* Price Row */}
            <div className="mp-quickview-price-row">
              <span className="mp-quickview-price">{formatPrice(product.price)}</span>
              {product.originalPrice > product.price && (
                <>
                  <span className="mp-quickview-old-price">{formatPrice(product.originalPrice)}</span>
                  <span className="mp-quickview-save-pill">
                    Save {formatPrice(product.originalPrice - product.price)}
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            <p className="mp-quickview-desc">{product.description}</p>

            {/* Specifications list if present */}
            {product.specs && (
              <div className="mp-quickview-specs-box">
                <div className="mp-specs-title">Item Specifications:</div>
                <div className="mp-specs-grid">
                  {Object.entries(product.specs).map(([k, v]) => (
                    <div key={k} className="mp-spec-item">
                      <span className="mp-spec-key">{k}:</span>
                      <span className="mp-spec-val">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vendor Box */}
            <div className="mp-quickview-vendor-box">
              <div className="mp-quickview-vendor-left">
                <div className="mp-quickview-vendor-icon">
                  <Store size={18} />
                </div>
                <div>
                  <div className="mp-quickview-vendor-name">{product.storeName}</div>
                  <div className="mp-quickview-vendor-loc">Verified Merchant · {product.corridor}</div>
                </div>
              </div>
              <button
                type="button"
                className="mp-quickview-visit-store-btn"
                onClick={() => {
                  onClose();
                  if (onOpenStorefront) onOpenStorefront(product.storeSlug);
                }}
              >
                <span>Visit Store</span>
                <ExternalLink size={13} />
              </button>
            </div>

            {/* Quantity Stepper & Add to Cart */}
            <div className="mp-quickview-actions">
              <div className="mp-quickview-qty-stepper">
                <button
                  type="button"
                  className="mp-quickview-qty-btn"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                >
                  <Minus size={14} />
                </button>
                <span className="mp-quickview-qty-val">{qty}</span>
                <button
                  type="button"
                  className="mp-quickview-qty-btn"
                  onClick={() => setQty(qty + 1)}
                  disabled={qty >= product.stock}
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                type="button"
                className={`mp-quickview-add-btn ${added ? 'added' : ''}`}
                onClick={handleAdd}
              >
                {added ? (
                  <>
                    <Check size={16} />
                    <span>Added {qty} item(s)!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} />
                    <span>Add to Cart ({formatPrice(product.price * qty)})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className={`mp-quickview-wish-btn ${isWishlisted ? 'active' : ''}`}
                onClick={() => onToggleWishlist(product)}
                title="Save to Wishlist"
              >
                <Heart size={18} className={isWishlisted ? 'fill-red-500 text-red-500' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
