import React from 'react';
import { X, GitCompare, ShoppingBag, Trash2, Star, Check } from 'lucide-react';

export default function MarketplaceCompareModal({
  isOpen,
  onClose,
  compareItems = [],
  onRemoveFromCompare,
  onAddToCart,
  formatPrice
}) {
  if (!isOpen) return null;

  return (
    <div className="mp-modal-backdrop" onClick={onClose}>
      <div className="mp-compare-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mp-modal-header">
          <div className="mp-drawer-title-group">
            <GitCompare size={20} className="text-blue-500" />
            <h3 className="mp-drawer-title">Product Comparison ({compareItems.length})</h3>
          </div>
          <button type="button" className="mp-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {compareItems.length === 0 ? (
          <div className="mp-drawer-empty" style={{ padding: '40px 20px' }}>
            <div className="mp-empty-icon-wrap">
              <GitCompare size={44} className="text-gray-300" />
            </div>
            <h4>No items to compare</h4>
            <p>Select products using the compare icon to see specifications side-by-side.</p>
          </div>
        ) : (
          <div className="mp-compare-table-wrapper">
            <table className="mp-compare-table">
              <tbody>
                {/* Image row */}
                <tr>
                  <th className="mp-compare-feature-label">Product</th>
                  {compareItems.map((item) => (
                    <td key={item.id} className="mp-compare-item-cell">
                      <div className="mp-compare-thumb" style={{ background: item.bgGradient }}>
                        <span>{item.emoji}</span>
                      </div>
                      <h4 className="mp-compare-prod-title">{item.name}</h4>
                      <button
                        type="button"
                        className="mp-compare-remove-btn"
                        onClick={() => onRemoveFromCompare(item.id)}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </td>
                  ))}
                </tr>

                {/* Price */}
                <tr>
                  <th className="mp-compare-feature-label">Price</th>
                  {compareItems.map((item) => (
                    <td key={item.id} className="mp-compare-val highlight">
                      {formatPrice(item.price)}
                    </td>
                  ))}
                </tr>

                {/* Store */}
                <tr>
                  <th className="mp-compare-feature-label">Vendor Store</th>
                  {compareItems.map((item) => (
                    <td key={item.id} className="mp-compare-val">
                      {item.storeName}
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr>
                  <th className="mp-compare-feature-label">Rating</th>
                  {compareItems.map((item) => (
                    <td key={item.id} className="mp-compare-val">
                      <div className="mp-compare-rating-flex">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span>{item.rating} ({item.reviewsCount} reviews)</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Category */}
                <tr>
                  <th className="mp-compare-feature-label">Department</th>
                  {compareItems.map((item) => (
                    <td key={item.id} className="mp-compare-val">
                      {item.categoryName}
                    </td>
                  ))}
                </tr>

                {/* Stock */}
                <tr>
                  <th className="mp-compare-feature-label">Availability</th>
                  {compareItems.map((item) => (
                    <td key={item.id} className="mp-compare-val">
                      <span className="text-emerald-600 font-semibold">
                        ✓ In Stock ({item.stock} left)
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Action button */}
                <tr>
                  <th className="mp-compare-feature-label">Action</th>
                  {compareItems.map((item) => (
                    <td key={item.id} className="mp-compare-action-cell">
                      <button
                        type="button"
                        className="mp-compare-add-btn"
                        onClick={() => {
                          onAddToCart(item);
                          onClose();
                        }}
                      >
                        <ShoppingBag size={14} />
                        <span>Add to Cart</span>
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
