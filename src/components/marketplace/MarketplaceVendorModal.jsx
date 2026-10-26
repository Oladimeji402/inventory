import React from 'react';
import { 
  X, 
  Store, 
  CheckCircle, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { appLinks } from '../../config/surfaces';

export default function MarketplaceVendorModal({
  isOpen,
  onClose
}) {
  if (!isOpen) return null;

  const benefits = [
    { title: 'Zero Setup or Listing Fees', desc: 'Pay only a nominal 3.5% transaction commission on completed, delivered customer orders.' },
    { title: 'Dedicated Neighborhood Courier Fleet', desc: 'Riders stationed in your corridor arrive within 5–10 mins to pick up packaged orders.' },
    { title: 'Automatic Shelf Sync with POS', desc: 'Real-time sync between your brick-and-mortar retail counter till and online marketplace inventory.' },
    { title: 'Instant Daily Payouts', desc: 'Escrow earnings swept automatically to your nominated Nigerian commercial bank account every 24 hours.' }
  ];

  return (
    <div className="mp-modal-backdrop" onClick={onClose}>
      <div className="mp-vendor-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mp-modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="mp-vendor-modal-header">
          <div className="mp-vendor-modal-badge">
            <Sparkles size={13} />
            <span>PARTNER WITH SUBTECH</span>
          </div>
          <h2 className="mp-vendor-modal-title">Launch Your Store on Subtech Marketplace</h2>
          <p className="mp-vendor-modal-sub">
            Join over 450+ verified pharmacies, supermarkets, and electronics retailers reaching thousands of customers in your immediate neighborhood.
          </p>
        </div>

        <div className="mp-vendor-modal-grid">
          {benefits.map((b) => (
            <div key={b.title} className="mp-vendor-benefit-card">
              <div className="mp-benefit-icon">
                <CheckCircle size={18} />
              </div>
              <div>
                <h4 className="mp-benefit-title">{b.title}</h4>
                <p className="mp-benefit-desc">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mp-vendor-modal-cta-box">
          <div className="mp-vendor-cta-text">
            <h4>Ready to start receiving orders?</h4>
            <p>Onboarding takes under 4 minutes with your store address and phone number.</p>
          </div>
          <div className="mp-vendor-cta-buttons">
            <a
              href="/start"
              className="mp-vendor-register-btn"
            >
              <span>Register Store Now</span>
              <ArrowRight size={15} />
            </a>
            <a
              href="/login"
              className="mp-vendor-login-link"
            >
              Already a vendor? Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
