import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Store, PlayCircle, CheckCircle2, Wifi, WifiOff, Scan, Receipt } from 'lucide-react';

const stats = [
  { value: '< 20 min', label: 'Target Delivery' },
  { value: '100%',     label: 'Offline Uptime' },
  { value: '₦0',       label: 'Setup Cost' },
  { value: '3 steps',  label: 'To Go Live' },
];

export default function HeroSection({ onOpenStoreModal, onOpenRiderModal, onLaunchPOS, onOpenLiveDemo }) {
  const [subdomain,    setSubdomain]    = useState('');
  const [claimResult,  setClaimResult]  = useState(null);
  const ref = useRef(null);

  // Reveal elements immediately — hero is always in viewport
  useEffect(() => {
    const els = ref.current?.querySelectorAll('.lp-reveal') || [];
    const t = setTimeout(() => els.forEach(el => el.classList.add('visible')), 60);
    return () => clearTimeout(t);
  }, []);

  const handleClaim = e => {
    e.preventDefault();
    const slug = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/, '');
    if (slug) setClaimResult(slug);
  };

  return (
    <section className="lp-hero" ref={ref}>
      <div className="lp-hero-inner">

        {/* Badge */}
        <div className="lp-hero-badge lp-reveal">
          <span className="lp-hero-badge-dot" />
          Hyperlocal Retail OS — Nigeria
        </div>

        {/* Headline */}
        <h1 className="lp-hero-title lp-reveal lp-reveal-d1">
          Every neighborhood<br />
          store,{' '}
          <span className="lp-hero-title-teal">online.</span>
        </h1>

        {/* Subtext */}
        <p className="lp-hero-sub lp-reveal lp-reveal-d2">
          Offline-first POS till. Live web storefront. Instant rider dispatch.
          One platform for every corner shop, pharmacy, and supermarket in Nigeria.
        </p>

        {/* Subdomain claim bar */}
        <form
          className="lp-hero-claim lp-reveal lp-reveal-d2"
          onSubmit={handleClaim}
          style={claimResult ? { marginBottom: 8 } : {}}
        >
          <span className="lp-hero-claim-prefix">https://</span>
          <input
            className="lp-hero-claim-input"
            type="text"
            placeholder="your-store"
            value={subdomain}
            onChange={e => { setSubdomain(e.target.value); setClaimResult(null); }}
          />
          <span className="lp-hero-claim-suffix">.subtech.app</span>
          <button type="submit" className="lp-hero-claim-btn">
            Claim Free URL
          </button>
        </form>

        {claimResult && (
          <div className="lp-hero-claim-result lp-reveal">
            <CheckCircle2 size={15} />
            <span><strong>{claimResult}.subtech.app</strong> is available —</span>
            <button onClick={() => onOpenStoreModal(claimResult)}>Register now →</button>
          </div>
        )}

        {/* CTAs */}
        <div className="lp-hero-ctas lp-reveal lp-reveal-d3">
          <button className="lp-btn-primary" onClick={() => onOpenStoreModal()}>
            <Store size={16} />
            Register Your Store Free
            <ArrowRight size={16} />
          </button>
          <button className="lp-btn-secondary" onClick={onOpenLiveDemo}>
            <PlayCircle size={16} />
            Try Live Demo
          </button>
        </div>

        {/* Stats bar */}
        <div className="lp-hero-stats lp-reveal lp-reveal-d4">
          {stats.map((s, i) => (
            <div key={i} className="lp-hero-stat">
              <span className="lp-hero-stat-value">{s.value}</span>
              <span className="lp-hero-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Product window mockup */}
        <div className="lp-hero-mockup lp-reveal lp-reveal-d4">
          {/* Browser chrome */}
          <div className="lp-hero-mockup-chrome">
            <div className="lp-hero-mockup-dots">
              <span /><span /><span />
            </div>
            <div className="lp-hero-mockup-url font-mono">spar-ikeja.subtech.app</div>
            <div className="lp-hero-mockup-status">
              <Wifi size={11} color="#27BBAD" />
              <span>Live</span>
            </div>
          </div>
          {/* POS content */}
          <div className="lp-hero-mockup-body">
            <div className="lp-hero-mockup-col left">
              <div className="lp-hero-mockup-section-label">Cart</div>
              <div className="lp-hero-mockup-item">
                <div>
                  <div className="lp-hero-mockup-item-name">Peak Milk 400g</div>
                  <div className="lp-hero-mockup-item-sku font-mono">× 2 · Qty: 34 left</div>
                </div>
                <span className="lp-hero-mockup-item-price font-mono">₦6,400</span>
              </div>
              <div className="lp-hero-mockup-item">
                <div>
                  <div className="lp-hero-mockup-item-name">Golden Penny Pasta 500g</div>
                  <div className="lp-hero-mockup-item-sku font-mono">× 1 · Qty: 12 left</div>
                </div>
                <span className="lp-hero-mockup-item-price font-mono">₦3,200</span>
              </div>
              <div className="lp-hero-mockup-total">
                <span>Total</span>
                <span className="font-mono">₦9,600</span>
              </div>
            </div>
            <div className="lp-hero-mockup-col right">
              <div className="lp-hero-mockup-section-label">Dispatch</div>
              <div className="lp-hero-mockup-dispatch-pill">
                <span className="lp-preview-dot" style={{ flexShrink: 0 }} />
                <span>Tunde B. en route · ETA 4 min</span>
              </div>
              <div className="lp-hero-mockup-section-label" style={{ marginTop: 10 }}>Payment</div>
              <div className="lp-hero-mockup-pay-row active">Transfer</div>
              <div className="lp-hero-mockup-pay-row">Card</div>
              <div className="lp-hero-mockup-pay-row">Cash</div>
              <div className="lp-hero-mockup-receipt-btn">
                <Receipt size={11} />
                <span>Print Receipt</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
