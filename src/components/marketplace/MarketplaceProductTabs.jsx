import React, { useState, useMemo } from 'react';
import { 
  Star, 
  ShoppingBag, 
  Eye, 
  Heart, 
  GitCompare, 
  Check, 
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { DEPARTMENTS } from './marketplaceData';

export default function MarketplaceProductTabs({
  products = [],
  selectedCategory,
  onSelectCategory,
  onSelectProduct,
  onAddToCart,
  onToggleWishlist,
  onToggleCompare,
  wishlistIds = new Set(),
  compareIds = new Set(),
  onOpenStorefront,
  formatPrice
}) {
  const [sortBy, setSortBy] = useState('featured');
  const [addedItemMap, setAddedItemMap] = useState({});

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory && selectedCategory !== 'All') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'bestseller') {
      list.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
    }

    return list;
  }, [products, selectedCategory, sortBy]);

  function handleAddToCartClick(e, product) {
    e.stopPropagation();
    onAddToCart(product);
    setAddedItemMap((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  }

  return (
    <section className="mp-products-section" id="marketplace-catalog">
      {/* Tabs and Sorting Bar */}
      <div className="mp-filter-toolbar">
        {/* Category Filter Tabs */}
        <div className="mp-tabs-list">
          <button
            type="button"
            className={`mp-filter-tab ${selectedCategory === 'All' ? 'active' : ''}`}
            onClick={() => onSelectCategory('All')}
          >
            <span>All Products ({products.length})</span>
          </button>
          {DEPARTMENTS.map((dept) => {
            const count = products.filter((p) => p.category === dept.id).length;
            return (
              <button
                key={dept.id}
                type="button"
                className={`mp-filter-tab ${selectedCategory === dept.id ? 'active' : ''}`}
                onClick={() => onSelectCategory(dept.id)}
              >
                <span>{dept.name.split('&')[0]}</span>
                <span className="mp-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Sorting Dropdown */}
        <div className="mp-sort-dropdown-wrap">
          <div className="mp-sort-icon">
            <ArrowUpDown size={14} />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="mp-sort-select"
          >
            <option value="featured">Sort by: Featured</option>
            <option value="bestseller">Sort by: Best Selling</option>
            <option value="rating">Sort by: Top Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="mp-catalog-grid">
        {filteredProducts.map((prod) => {
          const isWishlisted = wishlistIds.has(prod.id);
          const isCompared = compareIds.has(prod.id);
          const isAdded = !!addedItemMap[prod.id];

          return (
            <div 
              key={prod.id} 
              className="mp-product-card"
              onClick={() => onSelectProduct(prod)}
            >
              {/* Badges */}
              <div className="mp-card-badges-top">
                {prod.discountPct > 0 && (
                  <span className="mp-badge-discount">-{prod.discountPct}%</span>
                )}
                {prod.isBestSeller && (
                  <span className="mp-badge-bestseller">BESTSELLER</span>
                )}
              </div>

              {/* Hover Actions */}
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

              {/* Image Graphic */}
              <div className="mp-product-img-box" style={{ background: prod.bgGradient }}>
                <span className="mp-product-emoji">{prod.emoji}</span>
              </div>

              {/* Body */}
              <div className="mp-product-body">
                {/* Store Name Link */}
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

                {/* Rating */}
                <div className="mp-product-rating">
                  <div className="mp-stars-row">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="mp-rating-val">{prod.rating}</span>
                  <span className="mp-rating-count">({prod.reviewsCount})</span>
                </div>

                {/* Price */}
                <div className="mp-product-price-row">
                  <span className="mp-price-current">{formatPrice(prod.price)}</span>
                  {prod.originalPrice > prod.price && (
                    <span className="mp-price-original">{formatPrice(prod.originalPrice)}</span>
                  )}
                </div>

                {/* Stock Tag */}
                <div className="mp-stock-indicator">
                  <span className="mp-stock-dot" />
                  <span>In Stock · Ready for courier dispatch</span>
                </div>

                {/* Add to Cart */}
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
