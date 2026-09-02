import React, { useState, useEffect, useRef } from 'react';
import {
  Store, ShoppingBag, Bike,
  WifiOff, Globe2, Zap, ShieldCheck,
  Clock, Layers, Coins, Navigation,
  Check, ArrowRight, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { appLinks } from '../../config/surfaces';

const problems = [
  {
    before: {
      title: 'No way for neighbors to order',
      desc: 'Customers only buy if they walk in. WhatsApp DMs get lost and you never know what is still on the shelf.'
    },
    after: {
      title: 'A live storefront for the neighborhood',
      desc: 'Shoppers see confirmed stock, check out, and a rider picks up — without rebuilding your shop around a till.'
    }
  },
  {
    before: {
      title: 'Phantom Stock & Inaccurate Orders',
      desc: 'Inventory sold in-store still shows available online. Orders get cancelled, disappointing shoppers.'
    },
    after: {
      title: 'Single Source of Inventory Truth',
      desc: 'Catalog quantities stay in sync with what you actually have. Zero overselling.'
    }
  },
  {
    before: {
      title: 'Unpredictable Courier Coordination',
      desc: 'Calling freelance riders on WhatsApp takes 20+ minutes per order with no status tracking or arrival certainty.'
    },
    after: {
      title: 'One-Tap Instant Fleet Dispatch',
      desc: 'Verified couriers in the immediate 1–3km radius receive the pre-bagged dispatch alert automatically.'
    }
  }
];

const pillarsData = {
  merchants: {
    badge: 'Storefront & Operations',
    urlTag: '<your-store>.stv.com',
    headline: 'Launch a neighborhood storefront. Add a till later if you need one.',
    desc: 'Publish live stock to nearby shoppers, take orders, and dispatch riders — without making a counter register the product.',
    features: [
      { title: 'Live Web Catalog', desc: 'Auto-publish available stock to customers within your delivery radius.' },
      { title: 'Instant Courier Dispatch', desc: 'Broadcast pickup requests to verified local riders as soon as an order is paid.' },
      { title: 'Orders & Inventory', desc: 'One backoffice for catalog, orders, and payouts when you are ready.' },
      { title: 'Optional Counter Till', desc: 'Add an in-store checkout later. It is a package, not the platform.' },
    ],
    ctaText: 'Claim Your Store Subdomain',
  },
  shoppers: {
    badge: 'Neighborhood Marketplace',
    urlTag: 'shop.stv.com',
    headline: 'Order directly from trusted local stores with 20-minute delivery.',
    desc: 'Browse confirmed in-stock items from pharmacies, supermarkets, and local shops in your area with zero guesswork on availability.',
    features: [
      { title: 'Verified In-Stock Items', desc: 'Quantities come from the merchant catalog — no phantom items.' },
      { title: 'Sub-30 Minute Delivery', desc: 'Orders fulfilled by dedicated neighborhood couriers within 1–5 km.' },
      { title: 'Multi-Store Neighborhood Cart', desc: 'Combine essentials from your pharmacy and grocery store in one session.' },
      { title: 'Live Delivery Tracking', desc: 'Real-time GPS status from shelf pickup straight to your doorstep.' },
    ],
    ctaText: 'Browse Local Stores',
  },
  riders: {
    badge: 'On-Demand Courier Fleet',
    urlTag: 'rider.stv.com',
    headline: 'Consistent local routes with pre-bagged, zero-wait pickups.',
    desc: 'Receive alerts for paid, pre-packaged orders within compact districts. Spend less time waiting at counters and more time earning.',
    features: [
      { title: 'Pre-Packaged Pickups', desc: 'Orders are rung and bagged before your arrival for fast turnaround.' },
      { title: 'Optimized Neighborhood Batches', desc: 'Pick up multiple packages in the same corridor for higher hourly yields.' },
      { title: 'Transparent Earnings & Tips', desc: 'Clear per-trip rates, keep 100% of customer tips, with direct payouts.' },
      { title: 'Secure OTP Handover', desc: 'One-time confirmation passcode ensures tamper-free deliveries.' },
    ],
    ctaText: 'Apply to Ride With Subtech',
  }
};

/* Modern, clean UI preview component */
function MerchantPreview() {
  return (
    <div className="lp-preview-card">
      <div className="lp-preview-card-header">
        <div className="lp-preview-status-pill">
          <span className="lp-preview-dot" />
          <span>Live Storefront</span>
        </div>
        <span className="lp-preview-subdomain font-mono">spar-ikeja.stv.com</span>
      </div>

      <div className="lp-preview-body">
        <div className="lp-preview-item">
          <div>
            <div className="lp-preview-item-title">Peak Evaporated Milk (400g)</div>
            <div className="lp-preview-item-sub">Barcode: 6151100010214 · Qty: 2</div>
          </div>
          <div className="lp-preview-item-price">₦6,400</div>
        </div>

        <div className="lp-preview-item">
          <div>
            <div className="lp-preview-item-title">Golden Penny Pasta (500g)</div>
            <div className="lp-preview-item-sub">In stock: 34 units remaining</div>
          </div>
          <div className="lp-preview-item-price">₦3,200</div>
        </div>

        <div className="lp-preview-summary-row">
          <span className="lp-preview-summary-label">Order Total</span>
          <span className="lp-preview-summary-amount font-mono">₦9,600</span>
        </div>

        <div className="lp-preview-action-box">
          <div className="lp-preview-action-icon">
            <Zap size={14} />
          </div>
          <div className="lp-preview-action-text">
            <strong>Rider Auto-Assigned:</strong> Tunde B. (ETA 4 mins)
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopperPreview() {
  return (
    <div className="lp-preview-card">
      <div className="lp-preview-card-header">
        <div className="lp-preview-status-pill">
          <span className="lp-preview-dot" />
          <span>Neighborhood Market</span>
        </div>
        <span className="lp-preview-subdomain font-mono">shop.stv.com</span>
      </div>

      <div className="lp-preview-body">
        <div className="lp-preview-item">
          <div>
            <div className="lp-preview-item-title">Apex Health Pharmacy</div>
            <div className="lp-preview-item-sub">1.2 km away · Live shelf inventory</div>
          </div>
          <span className="lp-preview-tag">14 min delivery</span>
        </div>

        <div className="lp-preview-item">
          <div>
            <div className="lp-preview-item-title">Amoxicillin 500mg (20 Caps)</div>
            <div className="lp-preview-item-sub">Verified: 12 units on shelf right now</div>
          </div>
          <div className="lp-preview-item-price">₦3,800</div>
        </div>

        <div className="lp-preview-summary-row">
          <span className="lp-preview-summary-label">Delivery to</span>
          <span className="lp-preview-summary-amount" style={{ fontSize: '13px', fontWeight: 600 }}>Ikeja GRA, Lagos</span>
        </div>

        <div className="lp-preview-action-box">
          <div className="lp-preview-action-icon">
            <ShoppingBag size={14} />
          </div>
          <div className="lp-preview-action-text">
            <strong>Live Order:</strong> Courier en route to pharmacy
          </div>
        </div>
      </div>
    </div>
  );
}

function RiderPreview() {
  return (
    <div className="lp-preview-card">
      <div className="lp-preview-card-header">
        <div className="lp-preview-status-pill">
          <span className="lp-preview-dot" />
          <span>Active Courier Radar</span>
        </div>
        <span className="lp-preview-subdomain font-mono">rider.stv.com</span>
      </div>

      <div className="lp-preview-body">
        <div className="lp-preview-item">
          <div>
            <div className="lp-preview-item-title">Pickup: MedCare Pharmacy</div>
            <div className="lp-preview-item-sub">Distance: 850m · Parcel pre-packed at register</div>
          </div>
          <div className="lp-preview-item-price">₦1,850</div>
        </div>

        <div className="lp-preview-item">
          <div>
            <div className="lp-preview-item-title">Corridor Batch Added</div>
            <div className="lp-preview-item-sub">+1 pickup along same delivery avenue</div>
          </div>
          <span className="lp-preview-tag">+₦1,400</span>
        </div>

        <div className="lp-preview-summary-row">
          <span className="lp-preview-summary-label">Today's Accumulated Yield</span>
          <span className="lp-preview-summary-amount font-mono">₦18,400</span>
        </div>

        <div className="lp-preview-action-box">
          <div className="lp-preview-action-icon">
            <Navigation size={14} />
          </div>
          <div className="lp-preview-action-text">
            <strong>Dropoff OTP:</strong> Handover security active
          </div>
        </div>
      </div>
    </div>
  );
}

const mockups = { merchants: MerchantPreview, shoppers: ShopperPreview, riders: RiderPreview };

const tabs = [
  { key: 'merchants', label: 'Local Stores', icon: Store },
  { key: 'shoppers', label: 'Shoppers', icon: ShoppingBag },
  { key: 'riders', label: 'Couriers', icon: Bike },
];

export default function EcosystemPillars() {
  const [activeTab, setActiveTab] = useState('merchants');
  const sectionRef = useRef(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.lp-reveal') || [];
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.1 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const current = pillarsData[activeTab];
  const ActiveMockup = mockups[activeTab];

  const handleCta = () => {
    if (activeTab === 'merchants') window.location.href = appLinks.merchantSignup();
    else if (activeTab === 'shoppers') {
      document.querySelector('#live-demo')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = appLinks.rider();
    }
  };

  return (
    <div ref={sectionRef}>
      {/* ── THE PROBLEM / CHALLENGE SECTION ──────────────────────── */}
      <section className="lp-section lp-problem-section">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <span className="lp-eyebrow">The Problem</span>
            <h2 className="lp-h2">Running a shop offline and selling online shouldn't feel like two different businesses.</h2>
            <p className="lp-body" style={{ marginTop: '16px' }}>
              Most tools make you choose one or the other. Subtech runs both from the same stock list.
            </p>
          </div>

          <div className="lp-problem-grid lp-reveal lp-reveal-d1">
            {/* Without Subtech */}
            <div className="lp-problem-card lp-problem-before">
              <div className="lp-problem-badge before">
                <AlertCircle size={13} />
                <span>The Disconnected Approach</span>
              </div>
              <div className="lp-problem-list">
                {problems.map((p, i) => (
                  <div key={i} className="lp-problem-item">
                    <div className="lp-problem-num">0{i + 1}</div>
                    <div>
                      <h4 className="lp-problem-title">{p.before.title}</h4>
                      <p className="lp-problem-desc">{p.before.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* With Subtech */}
            <div className="lp-problem-card lp-problem-after">
              <div className="lp-problem-badge after">
                <Check size={13} />
                <span>The Subtech Operating System</span>
              </div>
              <div className="lp-problem-list">
                {problems.map((p, i) => (
                  <div key={i} className="lp-problem-item">
                    <div className="lp-problem-num teal">0{i + 1}</div>
                    <div>
                      <h4 className="lp-problem-title">{p.after.title}</h4>
                      <p className="lp-problem-desc">{p.after.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM PILLARS ─────────────────────────────────────── */}
      <section id="ecosystem" className="lp-section lp-ecosystem-section">
        <div className="lp-container">
          <div className="lp-section-header-center lp-reveal">
            <span className="lp-eyebrow">Who It's For</span>
            <h2 className="lp-h2">Built for shop owners, shoppers, and riders.</h2>
            <p className="lp-body" style={{ marginTop: '16px' }}>
              One system that connects your shop, the neighbors who buy from you, and the riders who deliver for you.
            </p>
          </div>

          {/* Segmented Control Tabs */}
          <div className="lp-segmented-control lp-reveal lp-reveal-d1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  className={`lp-segment-btn ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Showcase Feature Container */}
          <div className="lp-showcase-container lp-reveal lp-reveal-d2">
            <div className="lp-showcase-left">
              <span className="lp-showcase-subdomain font-mono">{current.urlTag}</span>
              <h3 className="lp-h3" style={{ marginTop: '12px', fontSize: '26px' }}>{current.headline}</h3>
              <p className="lp-body-sm" style={{ marginTop: '12px', marginBottom: '28px' }}>
                {current.desc}
              </p>

              <div className="lp-feature-checklist">
                {current.features.map((feat, i) => (
                  <div key={i} className="lp-feature-check-item">
                    <div className="lp-check-icon">
                      <Check size={13} />
                    </div>
                    <div>
                      <strong className="lp-feature-check-title">{feat.title}</strong>
                      <p className="lp-feature-check-desc">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '36px' }}>
                <button className="lp-btn-primary" onClick={handleCta}>
                  <span>{current.ctaText}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            <div className="lp-showcase-right">
              <ActiveMockup />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
