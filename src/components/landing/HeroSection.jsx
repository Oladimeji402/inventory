import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Store, PlayCircle, CheckCircle2 } from 'lucide-react';

const stats = [
  { value: '1,400+', label: 'Active Stores' },
  { value: '18 min', label: 'Avg. Delivery' },
  { value: '100%',   label: 'Offline Uptime' },
  { value: '₦0',     label: 'Setup Cost' },
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
            Watch Demo
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

      </div>
    </section>
  );
}
