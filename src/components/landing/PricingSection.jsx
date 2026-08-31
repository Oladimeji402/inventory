import React, { useState, useEffect, useRef } from 'react';
import { Check, ArrowRight, Bike } from 'lucide-react';

const plans = [
  {
    name: 'Starter Store',
    tier: 'Solo Retailers & Kiosks',
    priceMonthly: '₦0',
    priceAnnual: '₦0',
    period: 'forever free',
    featured: false,
    desc: 'Modernize your checkout counter and launch your neighborhood digital storefront.',
    features: [
      '1 Store Branch & Register',
      'Up to 150 live catalog products',
      'Offline-First Checkout Mode',
      'Custom Subdomain (your-store.stv.com)',
      'Pay-as-you-go Rider Dispatch',
      'Daily Sales Summaries & Receipts',
    ],
    cta: 'Start Free Today',
  },
  {
    name: 'Growth Merchant',
    tier: 'Busy Supermarkets & Pharmacies',
    priceMonthly: '₦18,500',
    priceAnnual: '₦14,800',
    period: '/month, billed annually',
    featured: true,
    desc: 'Unlimited products, multi-cashier staff PINs, and automated priority courier radar.',
    features: [
      'Unlimited Products & Live Web Catalog',
      'Up to 5 Cashier & Shift Manager PINs',
      'Priority Courier Dispatch Radar',
      'WhatsApp Order Alerts & Webhooks',
      'Low-Stock Automated Notifications',
      'Multiple Payment Gateways (Cash, Card, Transfer)',
      'Audit Logs & Cash Drawer Reconciliation',
    ],
    cta: 'Start 14-Day Free Trial',
  },
  {
    name: 'Multi-Branch Pro',
    tier: 'Retail Chains & Wholesalers',
    priceMonthly: '₦52,000',
    priceAnnual: '₦41,600',
    period: '/month, billed annually',
    featured: false,
    desc: 'Centralized multi-location inventory sync, custom domains, and dedicated SLA.',
    features: [
      'Up to 10 Store Branches & Warehouses',
      'Custom Vanity Domain (shop.yourbrand.com)',
      'Cross-Branch Inventory Transfers',
      'Dedicated Fleet & Private Courier Routing',
      'Granular Role Permissions & API Access',
      'Priority 24/7 Phone & WhatsApp Support',
      'Custom Accounting & ERP Integrations',
    ],
    cta: 'Contact Sales',
  }
];

export default function PricingSection({ onOpenStoreModal, onOpenRiderModal }) {
  const [billing, setBilling] = useState('monthly');
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

  return (
    <section id="pricing" className="lp-section lp-pricing-section" ref={sectionRef}>
      <div className="lp-container">
        <div className="lp-section-header-center lp-reveal">
          <span className="lp-eyebrow">Transparent Pricing</span>
          <h2 className="lp-h2">Fair plans for every stage of retail growth.</h2>
          <p className="lp-body" style={{ marginTop: '16px' }}>
            No hidden setup fees or proprietary hardware requirements. Upgrade or change anytime.
          </p>

          {/* Billing Switcher */}
          <div className="lp-billing-toggle" style={{ marginTop: '32px' }}>
            <button
              className={`lp-billing-btn ${billing === 'monthly' ? 'active' : ''}`}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              className={`lp-billing-btn ${billing === 'annual' ? 'active' : ''}`}
              onClick={() => setBilling('annual')}
            >
              Annual
              <span className="lp-save-badge">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="lp-pricing-grid lp-reveal lp-reveal-d1">
          {plans.map((plan, i) => (
            <div key={i} className={`lp-pricing-card ${plan.featured ? 'featured' : ''}`}>
              {plan.featured && (
                <div className="lp-pricing-badge">
                  Most Popular
                </div>
              )}

              <div className="lp-pricing-name">{plan.name}</div>
              <div className="lp-pricing-tier">{plan.tier}</div>

              <div className="lp-pricing-price-wrap">
                <span className="lp-pricing-price font-mono">
                  {billing === 'annual' ? plan.priceAnnual : plan.priceMonthly}
                </span>
                <span className="lp-pricing-period">{plan.period}</span>
              </div>

              <p className="lp-pricing-desc">{plan.desc}</p>

              <div className="lp-pricing-divider" />

              <div className="lp-pricing-features">
                {plan.features.map((feat, j) => (
                  <div key={j} className="lp-pricing-feature-item">
                    <div className="lp-pricing-check">
                      <Check size={12} />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <button
                className={`lp-pricing-cta ${plan.featured ? 'primary' : 'secondary'}`}
                onClick={() => onOpenStoreModal()}
              >
                <span>{plan.cta}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* Courier Fleet Callout */}
        <div className="lp-rider-callout lp-reveal lp-reveal-d2">
          <div className="lp-rider-callout-icon">
            <Bike size={22} />
          </div>
          <div className="lp-rider-callout-text">
            <h4 className="lp-rider-callout-title">Are you an on-demand courier or fleet owner?</h4>
            <p className="lp-rider-callout-desc">
              The Subtech Rider application is 100% free to join. Keep 100% of customer tips with zero monthly subscription costs.
            </p>
          </div>
          <button className="lp-btn-secondary" onClick={onOpenRiderModal} style={{ flexShrink: 0 }}>
            <span>Join Courier Fleet</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
