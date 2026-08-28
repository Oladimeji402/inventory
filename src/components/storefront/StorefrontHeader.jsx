import React from 'react';
import { 
  ShoppingBag, 
  Clock, 
  MapPin, 
  ArrowLeft, 
  Phone,
  ShieldCheck,
  Store
} from 'lucide-react';

export default function StorefrontHeader({ 
  storeProfile, 
  cartCount = 0, 
  onOpenCart,
  onExitToLanding 
}) {
  return (
    <header className="sf-header">
      <div className="sf-header-container">
        {/* Left: Brand / Store info */}
        <div className="sf-brand-wrap">
          <div className="sf-brand-logo">
            <Store size={20} />
          </div>
          <div>
            <h1 className="sf-brand-title">{storeProfile.name || 'Apex Health Pharmacy'}</h1>
            <div className="sf-brand-badge">
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#27BBAD' }} />
              <span>Open Now · ~18–25 min delivery</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onExitToLanding && (
            <button 
              onClick={onExitToLanding}
              style={{
                border: '1px solid #e5e5e5',
                background: '#ffffff',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#525252',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Exit Store</span>
            </button>
          )}

          <button className="sf-cart-btn" onClick={onOpenCart}>
            <ShoppingBag size={16} />
            <span>Bag</span>
            {cartCount > 0 && <span className="sf-cart-count">{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
