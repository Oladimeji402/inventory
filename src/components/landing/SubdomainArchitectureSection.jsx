import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Check, 
  ArrowRight, 
  Server, 
  Lock, 
  Copy, 
  Store,
  Bike,
  ShoppingBag
} from 'lucide-react';
import { appLinks } from '../../config/surfaces';

export default function SubdomainArchitectureSection() {
  const [storeQuery, setStoreQuery] = useState('kemi-organics');
  const [copied, setCopied] = useState(false);
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

  const cleanSlug = storeQuery.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '') || 'your-brand';

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const subdomainCards = [
    {
      role: 'Merchant Storefront & Backoffice',
      domain: `${cleanSlug}.stv.com`,
      icon: Store,
      badge: 'Auto-Provisioned',
      description: 'Your isolated digital storefront for customer checkout + backoffice dashboard to track inventory and revenue.',
      features: [
        'Custom store branding & logo',
        'Direct customer web checkout',
        'Real-time order & revenue analytics',
        'Optional counter till add-on'
      ],
      actionText: 'Reserve Subdomain',
      action: () => { window.location.href = appLinks.merchantSignup(cleanSlug); }
    },
    {
      role: 'On-Demand Courier Network',
      domain: 'rider.stv.com',
      icon: Bike,
      badge: 'Fleet Hub',
      description: 'The dispatch command center where verified local couriers receive automated pickup and route batching requests.',
      features: [
        'Real-time GPS dispatch radar',
        'Optimized corridor batch routes',
        'Digital proof-of-delivery OTP',
        'Instant automated bank payouts'
      ],
      actionText: 'Courier Portal',
      action: () => { window.location.href = appLinks.rider(); }
    },
    {
      role: 'Neighborhood Shopper Hub',
      domain: 'shop.stv.com',
      icon: ShoppingBag,
      badge: 'Discovery Hub',
      description: 'Central marketplace for neighborhood residents to discover confirmed in-stock items from all nearby merchants.',
      features: [
        'Multi-store neighborhood discovery',
        'Verified in-stock shelf quantities',
        'Single checkout across nearby stores',
        'Live courier GPS tracking'
      ],
      actionText: 'Explore Shopper Hub',
      action: () => {
        const el = document.querySelector('#live-demo');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  ];

  return (
    <section id="subdomains" className="lp-section lp-subdomains-section" ref={sectionRef}>
      <div className="lp-container">
        {/* Header without pill */}
        <div className="lp-section-header-center lp-reveal">
          <span className="lp-eyebrow">Multi-Tenant Architecture</span>
          <h2 className="lp-h2">Your brand. Your custom subdomain. Zero dev overhead.</h2>
          <p className="lp-body" style={{ marginTop: '16px' }}>
            Every registered merchant gets an isolated, high-speed storefront with built-in payment processing and native courier dispatch.
          </p>
        </div>

        {/* Interactive Subdomain Playground */}
        <div className="lp-subdomain-box lp-reveal lp-reveal-d1">
          <div className="lp-subdomain-box-header">
            <div className="lp-subdomain-box-title">
              <Terminal size={16} color="#2B7CFF" />
              <span className="font-mono">LIVE SUBDOMAIN GENERATOR & DOMAIN RESOLVER</span>
            </div>
            <div className="lp-subdomain-live-tag">
              <span className="lp-subdomain-live-dot" />
              <span className="font-mono">Edge DNS Provisioning</span>
            </div>
          </div>

          <div className="lp-subdomain-box-content">
            <div className="lp-subdomain-input-side">
              <label className="lp-subdomain-input-label">
                Type your brand or store name:
              </label>
              <div className="lp-subdomain-input-wrap">
                <Store size={18} color="#a3a3a3" />
                <input
                  type="text"
                  value={storeQuery}
                  onChange={(e) => setStoreQuery(e.target.value)}
                  placeholder="e.g. apex-pharmacy"
                  className="lp-subdomain-input font-mono"
                />
              </div>
              <p className="lp-subdomain-input-hint">
                Instantly provisioned on multi-tenant routing with automated SSL certificates.
              </p>
            </div>

            <div className="lp-subdomain-output-side">
              <div className="lp-subdomain-preview-card">
                <div className="lp-subdomain-preview-url">
                  <Lock size={14} color="#2B7CFF" />
                  <span className="font-mono">
                    https://<strong style={{ color: '#2B7CFF' }}>{cleanSlug}</strong>.stv.com
                  </span>
                </div>
                <div className="lp-subdomain-preview-actions">
                  <button 
                    className="lp-btn-copy"
                    onClick={() => handleCopy(`https://${cleanSlug}.stv.com`)}
                    title="Copy URL"
                  >
                    {copied ? <Check size={14} color="#2B7CFF" /> : <Copy size={14} />}
                  </button>
                  <a 
                    className="lp-btn-claim-small"
                    href={appLinks.merchantSignup(cleanSlug)}
                  >
                    Claim URL
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Subdomain Nodes Grid */}
        <div className="lp-subdomain-grid lp-reveal lp-reveal-d2">
          {subdomainCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="lp-subdomain-node-card">
                <div className="lp-subdomain-node-top">
                  <span className="lp-subdomain-node-badge">
                    {card.badge}
                  </span>
                  <div className="lp-subdomain-node-icon">
                    <Icon size={16} />
                  </div>
                </div>

                <div className="lp-subdomain-node-domain font-mono">
                  <Server size={14} color="#2B7CFF" />
                  <span>{card.domain}</span>
                </div>

                <h4 className="lp-subdomain-node-role">{card.role}</h4>
                <p className="lp-subdomain-node-desc">{card.description}</p>

                <div className="lp-subdomain-node-features">
                  {card.features.map((feat, i) => (
                    <div key={i} className="lp-subdomain-node-feat-item">
                      <div className="lp-check-icon">
                        <Check size={11} />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <button 
                  className="lp-btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 'auto', fontSize: '13.5px', padding: '10px' }}
                  onClick={card.action}
                >
                  <span>{card.actionText}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
