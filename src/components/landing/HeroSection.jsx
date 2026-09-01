import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Store, PlayCircle, CheckCircle2, Wifi, Receipt, AlertCircle } from 'lucide-react';
import { appLinks } from '../../config/surfaces';
import { BRAND } from '../../config/brand';
import { checkStoreSlug } from '../../lib/slugAvailability';
import { saveIntendedSlug } from '../../lib/intendedSlug';
import { slugifyStoreName } from '../../lib/merchantConstants';

const stats = [
  { value: '< 20 min', label: 'Target Delivery' },
  { value: 'Live',     label: 'Storefront URL' },
  { value: '₦0',       label: 'Setup Cost' },
  { value: '3 steps',  label: 'To Go Live' },
];

const CLAIM_COPY = {
  available: (slug) => (
    <>
      <strong>{slug}.{BRAND.domain}</strong> is free right now — not held until you finish store setup.
    </>
  ),
  taken: (slug) => (
    <>
      <strong>{slug}.{BRAND.domain}</strong> is already in use. Try another name.
    </>
  ),
  reserved: (slug) => (
    <>
      <strong>{slug}</strong> is reserved. Pick a store name customers will recognize.
    </>
  ),
  invalid: () => 'Use 2–30 letters, numbers, or hyphens. Don’t start or end with a hyphen.',
  error: (message) => message || 'Couldn’t check that URL right now. Try again.'
};

export default function HeroSection({ onOpenLiveDemo }) {
  const [subdomain, setSubdomain] = useState('');
  const [claim, setClaim] = useState(null);
  const [checking, setChecking] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const els = ref.current?.querySelectorAll('.lp-reveal') || [];
    const t = setTimeout(() => els.forEach((el) => el.classList.add('visible')), 60);
    return () => clearTimeout(t);
  }, []);

  const handleClaim = async (event) => {
    event.preventDefault();
    const slug = slugifyStoreName(subdomain);
    setSubdomain(slug);
    setChecking(true);
    setClaim(null);
    const result = await checkStoreSlug(slug);
    setChecking(false);
    setClaim(result);
    if (result.status === 'available') saveIntendedSlug(result.slug);
  };

  const resultClass = claim?.status === 'available'
    ? 'is-ok'
    : claim?.status === 'error' || claim?.status === 'taken' || claim?.status === 'reserved' || claim?.status === 'invalid'
      ? 'is-error'
      : '';

  return (
    <section className="lp-hero" ref={ref}>
      <div className="lp-hero-inner">

        <div className="lp-hero-badge lp-reveal">
          <span className="lp-hero-badge-dot" />
          Hyperlocal Retail OS — Nigeria
        </div>

        <h1 className="lp-hero-title lp-reveal lp-reveal-d1">
          Every neighborhood<br />
          store,{' '}
          <span className="lp-hero-title-teal">online.</span>
        </h1>

        <p className="lp-hero-sub lp-reveal lp-reveal-d2">
          Live storefront. Local delivery. Optional counter checkout.
          One platform for every corner shop, pharmacy, and supermarket in Nigeria.
        </p>

        <form
          className="lp-hero-claim lp-reveal lp-reveal-d2"
          onSubmit={handleClaim}
          style={claim || checking ? { marginBottom: 8 } : {}}
        >
          <span className="lp-hero-claim-prefix">https://</span>
          <input
            className="lp-hero-claim-input"
            type="text"
            placeholder="your-store"
            value={subdomain}
            maxLength={30}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setSubdomain(e.target.value);
              setClaim(null);
            }}
          />
          <span className="lp-hero-claim-suffix">.{BRAND.domain}</span>
          <button type="submit" className="lp-hero-claim-btn" disabled={checking || !subdomain.trim()}>
            {checking ? 'Checking…' : 'Claim Free URL'}
          </button>
        </form>

        {claim && (
          <div className={`lp-hero-claim-result lp-reveal ${resultClass}`}>
            {claim.status === 'available' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>
              {claim.status === 'available' && CLAIM_COPY.available(claim.slug)}
              {claim.status === 'taken' && CLAIM_COPY.taken(claim.slug)}
              {claim.status === 'reserved' && CLAIM_COPY.reserved(claim.slug)}
              {claim.status === 'invalid' && CLAIM_COPY.invalid()}
              {claim.status === 'error' && CLAIM_COPY.error(claim.error)}
            </span>
            {claim.status === 'available' && (
              <a href={appLinks.merchantSignup(claim.slug)}>Register now →</a>
            )}
          </div>
        )}

        <div className="lp-hero-ctas lp-reveal lp-reveal-d3">
          <a className="lp-btn-primary" href={appLinks.merchantSignup()}>
            <Store size={16} />
            Register Your Store Free
            <ArrowRight size={16} />
          </a>
          <button className="lp-btn-secondary" onClick={onOpenLiveDemo}>
            <PlayCircle size={16} />
            Try Live Demo
          </button>
        </div>

        <div className="lp-hero-stats lp-reveal lp-reveal-d4">
          {stats.map((s, i) => (
            <div key={i} className="lp-hero-stat">
              <span className="lp-hero-stat-value">{s.value}</span>
              <span className="lp-hero-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="lp-hero-mockup lp-reveal lp-reveal-d4">
          <div className="lp-hero-mockup-chrome">
            <div className="lp-hero-mockup-dots">
              <span /><span /><span />
            </div>
            <div className="lp-hero-mockup-url font-mono">spar-ikeja.{BRAND.domain}</div>
            <div className="lp-hero-mockup-status">
              <Wifi size={11} color="#2B7CFF" />
              <span>Live</span>
            </div>
          </div>
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
                <span>Confirm order</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
