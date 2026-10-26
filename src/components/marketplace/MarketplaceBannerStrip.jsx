import React from 'react';
import { Tag, Sparkles, Store, ArrowRight, Copy, Check } from 'lucide-react';

export default function MarketplaceBannerStrip({
  onOpenVendorModal,
  onCopyCoupon
}) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    navigator.clipboard?.writeText('STV20');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mp-banners-strip">
      <div className="mp-banners-grid">
        {/* Banner 1: Customer Discount Voucher */}
        <div className="mp-banner-card mp-banner-voucher">
          <div className="mp-banner-overlay-shape" />
          <div className="mp-banner-content">
            <span className="mp-banner-pill">
              <Tag size={13} />
              <span>WEEKEND PROMO VOUCHER</span>
            </span>
            <h3 className="mp-banner-headline">
              Get 20% Off Your Entire Cart
            </h3>
            <p className="mp-banner-sub">
              Valid on all pharmacy, electronics, and grocery orders exceeding ₦10,000 today.
            </p>
            <div className="mp-voucher-code-box">
              <span className="mp-voucher-label">Use Code:</span>
              <code className="mp-voucher-code">STV20</code>
              <button
                type="button"
                className="mp-copy-code-btn"
                onClick={handleCopy}
              >
                {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
          <div className="mp-banner-art">
            <span className="mp-banner-emoji">🎁</span>
          </div>
        </div>

        {/* Banner 2: Merchant Onboarding CTA */}
        <div className="mp-banner-card mp-banner-seller">
          <div className="mp-banner-overlay-shape-2" />
          <div className="mp-banner-content">
            <span className="mp-banner-pill mp-pill-seller">
              <Store size={13} />
              <span>SELL ON SUBTECH</span>
            </span>
            <h3 className="mp-banner-headline">
              Expand Your Store Across Lagos
            </h3>
            <p className="mp-banner-sub">
              Zero setup fees. Real-time courier dispatch network stationed outside your door.
            </p>
            <button
              type="button"
              className="mp-seller-banner-btn"
              onClick={onOpenVendorModal}
            >
              <span>Apply for Vendor Account</span>
              <ArrowRight size={15} />
            </button>
          </div>
          <div className="mp-banner-art">
            <span className="mp-banner-emoji">🚀</span>
          </div>
        </div>
      </div>
    </div>
  );
}
