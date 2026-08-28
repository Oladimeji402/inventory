import React from 'react';
import { Star, Clock, MapPin, ArrowRight, Store } from 'lucide-react';

export default function MarketplaceStoresGrid({ stores = [], onSelectStore }) {
  return (
    <section className="mp-section-container">
      <div className="mp-section-header">
        <div>
          <h2 className="mp-section-title">Verified Local Stores Near You</h2>
          <p style={{ fontSize: '13.5px', color: '#737373', margin: '4px 0 0' }}>
            Instant sub-30 minute doorstep delivery from neighborhood physical retail shelves.
          </p>
        </div>
      </div>

      <div className="mp-stores-grid">
        {stores.map((store) => (
          <div 
            key={store.id} 
            className="mp-store-card"
            onClick={() => onSelectStore(store)}
          >
            <div>
              <div className="mp-store-top">
                <div className="mp-store-logo">
                  <span>{store.emoji || '🏪'}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#27BBAD', textTransform: 'uppercase' }}>
                    {store.category}
                  </span>
                  <h3 className="mp-store-name">{store.name}</h3>
                  <span className="mp-store-subdomain font-mono">
                    {store.slug}.subtech.app
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#525252', marginBottom: '14px' }}>
                <MapPin size={13} color="#737373" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {store.address}
                </span>
              </div>
            </div>

            <div className="mp-store-meta-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#0a0a0a' }}>
                  <Star size={12} fill="#f59e0b" color="#f59e0b" />
                  {store.rating}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#27BBAD', fontWeight: 600 }}>
                  <Clock size={12} />
                  {store.deliveryTime}
                </span>
              </div>

              <span style={{ fontSize: '12px', fontWeight: 700, color: '#27BBAD', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Enter Store</span>
                <ArrowRight size={13} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
