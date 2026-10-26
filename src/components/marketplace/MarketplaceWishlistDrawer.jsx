import React from 'react';
import { X, Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export default function MarketplaceWishlistDrawer({
  isOpen,
  onClose,
  wishlistItems = [],
  onRemoveFromWishlist,
  onMoveToCart,
  formatPrice
}) {
  if (!isOpen) return null;

  return (
    <div className="mp-drawer-backdrop" onClick={onClose}>
      <div className="mp-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mp-drawer-header">
          <div className="mp-drawer-title-group">
            <Heart size={20} className="text-red-500 fill-red-500" />
            <h3 className="mp-drawer-title">Saved Wishlist ({wishlistItems.length})</h3>
          </div>
          <button type="button" className="mp-drawer-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="mp-drawer-empty">
            <div className="mp-empty-icon-wrap">
              <Heart size={44} className="text-gray-300" />
            </div>
            <h4>Your wishlist is empty</h4>
            <p>Save items you like by clicking the heart icon on any card.</p>
            <button type="button" className="mp-empty-shop-btn" onClick={onClose}>
              <span>Discover Products</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="mp-drawer-scrollable">
            <div className="mp-drawer-items-list">
              {wishlistItems.map((item) => (
                <div key={item.id} className="mp-drawer-item-row">
                  <div className="mp-drawer-item-thumb" style={{ background: item.bgGradient || '#f1f5f9' }}>
                    <span>{item.emoji || '🛍️'}</span>
                  </div>

                  <div className="mp-drawer-item-details">
                    <span className="mp-drawer-item-store">{item.storeName}</span>
                    <h4 className="mp-drawer-item-name">{item.name}</h4>
                    <div className="mp-drawer-item-price-unit">
                      {formatPrice(item.price)}
                    </div>

                    <button
                      type="button"
                      className="mp-wishlist-move-cart-btn"
                      onClick={() => onMoveToCart(item)}
                    >
                      <ShoppingBag size={13} />
                      <span>Move to Cart</span>
                    </button>
                  </div>

                  <div className="mp-drawer-item-actions">
                    <button
                      type="button"
                      className="mp-drawer-trash-btn"
                      onClick={() => onRemoveFromWishlist(item.id)}
                      title="Remove from wishlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
