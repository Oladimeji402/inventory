import React from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import { BRANDS } from './marketplaceData';

export default function MarketplaceBrandsSlider() {
  return (
    <div className="mp-brands-section">
      <div className="mp-brands-header">
        <span className="mp-brands-eyebrow">OFFICIAL PARTNER BRANDS & DISTRIBUTORS</span>
        <h3 className="mp-brands-title">Genuine Stock Sourced from Authorized Brands</h3>
      </div>

      <div className="mp-brands-track-wrapper">
        <div className="mp-brands-track">
          {[...BRANDS, ...BRANDS].map((brand, idx) => (
            <div key={`${brand.name}-${idx}`} className="mp-brand-chip">
              <span className="mp-brand-logo-text">{brand.logoText}</span>
              <span className="mp-brand-category">{brand.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
