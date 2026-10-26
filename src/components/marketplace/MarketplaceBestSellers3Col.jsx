import React from 'react';
import { Award, TrendingUp, Flame, Star, ShoppingBag, Check } from 'lucide-react';

export default function MarketplaceBestSellers3Col({
  products = [],
  onSelectProduct,
  onAddToCart,
  formatPrice
}) {
  const [addedMap, setAddedMap] = React.useState({});

  const topRated = [...products].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const bestSellers = [...products].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 3);
  const onSale = [...products].filter((p) => p.discountPct > 0).sort((a, b) => b.discountPct - a.discountPct).slice(0, 3);

  function handleAdd(e, prod) {
    e.stopPropagation();
    onAddToCart(prod);
    setAddedMap((prev) => ({ ...prev, [prod.id]: true }));
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [prod.id]: false }));
    }, 1500);
  }

  function renderColumn(title, icon, items, accentColor) {
    return (
      <div className="mp-3col-column">
        <div className="mp-3col-header">
          <div className="mp-3col-icon" style={{ color: accentColor }}>
            {icon}
          </div>
          <h3 className="mp-3col-title">{title}</h3>
        </div>

        <div className="mp-3col-items">
          {items.map((prod) => {
            const isAdded = !!addedMap[prod.id];
            return (
              <div 
                key={prod.id} 
                className="mp-3col-row"
                onClick={() => onSelectProduct(prod)}
              >
                <div className="mp-3col-thumb" style={{ background: prod.bgGradient }}>
                  <span>{prod.emoji}</span>
                  {prod.discountPct > 0 && (
                    <span className="mp-3col-badge">-{prod.discountPct}%</span>
                  )}
                </div>

                <div className="mp-3col-info">
                  <span className="mp-3col-store">{prod.storeName}</span>
                  <h4 className="mp-3col-prod-name" title={prod.name}>{prod.name}</h4>
                  
                  <div className="mp-3col-rating">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    <span>{prod.rating}</span>
                    <span className="text-gray-400">({prod.reviewsCount})</span>
                  </div>

                  <div className="mp-3col-price-row">
                    <span className="mp-3col-price">{formatPrice(prod.price)}</span>
                    {prod.originalPrice > prod.price && (
                      <span className="mp-3col-old-price">{formatPrice(prod.originalPrice)}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={`mp-3col-add-btn ${isAdded ? 'added' : ''}`}
                  onClick={(e) => handleAdd(e, prod)}
                  title="Add to Cart"
                >
                  {isAdded ? <Check size={14} /> : <ShoppingBag size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className="mp-3col-section">
      <div className="mp-3col-grid">
        {renderColumn('Top Rated Shelf', <Award size={18} />, topRated, '#10B981')}
        {renderColumn('Best Selling Items', <TrendingUp size={18} />, bestSellers, '#3B82F6')}
        {renderColumn('Special Deal Offers', <Flame size={18} />, onSale, '#EF4444')}
      </div>
    </section>
  );
}
