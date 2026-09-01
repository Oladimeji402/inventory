import React from 'react';
import { Plus, Minus, Star, Check } from 'lucide-react';

export default function StorefrontProductCard({ product, quantityInCart = 0, onAddToCart, onUpdateQuantity }) {
  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="sf-product-card">
      <div>
        {/* Product Visual Container */}
        <div className="sf-product-thumb">
          <span>{product.emoji || '📦'}</span>
        </div>

        {/* Rating and Stock tag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>
            {product.category || 'General'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>
            <Star size={11} fill="#f59e0b" color="#f59e0b" />
            {product.rating || '4.8'}
          </span>
        </div>

        {/* Title */}
        <h3 className="sf-product-title">{product.name}</h3>
      </div>

      {/* Footer / Price & Add Actions */}
      <div className="sf-product-footer">
        <div>
          <div className="sf-product-price font-mono">{formatNaira(product.price)}</div>
          <div style={{ fontSize: '11px', color: isOutOfStock ? '#e11d48' : '#2B7CFF', fontWeight: 600 }}>
            {isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}
          </div>
        </div>

        {isOutOfStock ? (
          <span style={{ fontSize: '11.5px', color: '#a3a3a3', fontWeight: 600 }}>Unavailable</span>
        ) : quantityInCart > 0 ? (
          <div className="sf-qty-adjuster">
            <button 
              className="sf-qty-btn" 
              onClick={() => onUpdateQuantity(product.id, quantityInCart - 1)}
            >
              <Minus size={13} />
            </button>
            <span className="sf-qty-val">{quantityInCart}</span>
            <button 
              className="sf-qty-btn" 
              onClick={() => onUpdateQuantity(product.id, Math.min(product.stock, quantityInCart + 1))}
            >
              <Plus size={13} />
            </button>
          </div>
        ) : (
          <button className="sf-add-btn" onClick={() => onAddToCart(product)}>
            <Plus size={14} />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
