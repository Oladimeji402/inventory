import React from 'react';
import { Star, Plus, Store } from 'lucide-react';

export default function MarketplaceTrending({ products = [], onSelectProductStore }) {
  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  return (
    <section className="mp-section-container" style={{ marginTop: 0 }}>
      <div className="mp-section-header">
        <div>
          <h2 className="mp-section-title">Trending Items in Your Neighborhood</h2>
          <p style={{ fontSize: '13.5px', color: '#737373', margin: '4px 0 0' }}>
            Popular daily essentials ordered by shoppers near you.
          </p>
        </div>
      </div>

      <div className="mp-trending-grid">
        {products.map((p) => (
          <div key={p.id} className="mp-trending-card">
            <div>
              {/* Image box */}
              <div style={{ width: '100%', height: '110px', background: '#f7fafa', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', marginBottom: '10px' }}>
                <span>{p.emoji || '📦'}</span>
              </div>

              {/* Store provenance badge */}
              <div 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#2B7CFF', background: 'rgba(43, 124, 255, 0.1)', padding: '2px 8px', borderRadius: '100px', marginBottom: '6px', cursor: 'pointer' }}
                onClick={() => onSelectProductStore(p.storeSlug)}
              >
                <Store size={10} />
                <span>{p.storeName}</span>
              </div>

              <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 6px', lineHeight: 1.35 }}>
                {p.name}
              </h4>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
              <span className="font-mono" style={{ fontSize: '14.5px', fontWeight: 800, color: '#0a0a0a' }}>
                {formatNaira(p.price)}
              </span>

              <button
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #2B7CFF',
                  background: 'rgba(43, 124, 255, 0.08)',
                  color: '#2B7CFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'inherit'
                }}
                onClick={() => onSelectProductStore(p.storeSlug)}
              >
                <Plus size={13} />
                <span>View</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
