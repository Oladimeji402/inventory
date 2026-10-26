import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Clock, 
  Eye, 
  Heart, 
  GitCompare, 
  ShoppingBag, 
  Star, 
  ArrowRight,
  Check
} from 'lucide-react';

export default function MarketplaceFlashDeals({
  products = [],
  onSelectProduct,
  onAddToCart,
  onToggleWishlist,
  onToggleCompare,
  wishlistIds = new Set(),
  compareIds = new Set(),
  onOpenStorefront,
  formatPrice
}) {
  // Real-time Countdown timer (starts at 14h 28m 45s and counts down)
  const [timeLeft, setTimeLeft] = useState({
    hours: 14,
    minutes: 28,
    seconds: 45
  });

  const [addedItemMap, setAddedItemMap] = useState({});

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const flashItems = products.filter((p) => p.isFlashDeal);

  function handleAddToCartClick(e, product) {
    e.stopPropagation();
    onAddToCart(product);
    setAddedItemMap((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  }

  return (
    <section className="mp-flash-section" id="flash-deals">
      {/* Header with Title and Countdown */}
      <div className="mp-flash-header">
        <div className="mp-flash-title-block">
          <div className="mp-flash-icon-box">
            <Flame size={22} className="text-red-500 animate-bounce" />
          </div>
          <div>
            <h2 className="mp-flash-title">Flash Deals & Daily Rush</h2>
            <p className="mp-flash-sub">Limited-quantity discounts directly from certified store shelves.</p>
          </div>
        </div>

        {/* Live Countdown Box */}
        <div className="mp-countdown-container">
          <span className="mp-countdown-label">
            <Clock size={14} /> Ends in:
          </span>
          <div className="mp-countdown-boxes">
            <div className="mp-time-unit">
              <span className="mp-time-val">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="mp-time-lbl">Hrs</span>
            </div>
            <span className="mp-time-colon">:</span>
            <div className="mp-time-unit">
              <span className="mp-time-val">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="mp-time-lbl">Min</span>
            </div>
            <span className="mp-time-colon">:</span>
            <div className="mp-time-unit mp-time-sec">
              <span className="mp-time-val">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="mp-time-lbl">Sec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="mp-flash-grid">
        {flashItems.map((prod) => {
          const isWishlisted = wishlistIds.has(prod.id);
          const isCompared = compareIds.has(prod.id);
          const isAdded = !!addedItemMap[prod.id];
          const totalInventory = (prod.stock || 10) + (prod.soldCount || 50);
          const percentSold = Math.min(100, Math.round(((prod.soldCount || 50) / totalInventory) * 100));

          return (
            <div 
              key={prod.id} 
              className="mp-product-card mp-flash-card"
              onClick={() => onSelectProduct(prod)}
            >
              {/* Top Card Badges */}
              <div className="mp-card-badges-top">
                <span className="mp-badge-discount">-{prod.discountPct}%</span>
                <span className="mp-badge-rush">RUSH</span>
              </div>

              {/* Action Buttons on Hover */}
              <div className="mp-card-hover-actions">
                <button
                  type="button"
                  className="mp-card-action-icon"
                  title="Quick View"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProduct(prod);
                  }}
                >
                  <Eye size={15} />
                </button>
                <button
                  type="button"
                  className={`mp-card-action-icon ${isWishlisted ? 'active-heart' : ''}`}
                  title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWishlist(prod);
                  }}
                >
                  <Heart size={15} />
                </button>
                <button
                  type="button"
                  className={`mp-card-action-icon ${isCompared ? 'active-compare' : ''}`}
                  title="Compare"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCompare(prod);
                  }}
                >
                  <GitCompare size={15} />
                </button>
              </div>

              {/* Product Thumbnail Graphic */}
              <div className="mp-product-img-box" style={{ background: prod.bgGradient }}>
                <span className="mp-product-emoji">{prod.emoji}</span>
              </div>

              {/* Product Card Details */}
              <div className="mp-product-body">
                {/* Store Attribution */}
                <div 
                  className="mp-product-store"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenStorefront) onOpenStorefront(prod.storeSlug);
                  }}
                >
                  <span>By {prod.storeName}</span>
                </div>

                {/* Title */}
                <h3 className="mp-product-title" title={prod.name}>
                  {prod.name}
                </h3>

                {/* Rating Stars */}
                <div className="mp-product-rating">
                  <div className="mp-stars-row">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="mp-rating-val">{prod.rating}</span>
                  <span className="mp-rating-count">({prod.reviewsCount})</span>
                </div>

                {/* Price Row */}
                <div className="mp-product-price-row">
                  <span className="mp-price-current">{formatPrice(prod.price)}</span>
                  <span className="mp-price-original">{formatPrice(prod.originalPrice)}</span>
                </div>

                {/* Stock Progress Bar */}
                <div className="mp-stock-progress-wrap">
                  <div className="mp-stock-labels">
                    <span>Sold: {percentSold}%</span>
                    <span className="text-emerald-600 font-semibold">{prod.stock} left</span>
                  </div>
                  <div className="mp-progress-track">
                    <div 
                      className="mp-progress-fill" 
                      style={{ width: `${percentSold}%` }}
                    />
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  type="button"
                  className={`mp-add-cart-btn ${isAdded ? 'added' : ''}`}
                  onClick={(e) => handleAddToCartClick(e, prod)}
                >
                  {isAdded ? (
                    <>
                      <Check size={15} />
                      <span>Added to Cart!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={15} />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
