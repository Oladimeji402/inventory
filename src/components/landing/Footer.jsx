import React, { useEffect, useRef } from 'react';
import { Store, Bike, ArrowRight, ArrowUp } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { appLinks } from '../../config/surfaces';
import BrandMark from '../../shared/components/BrandMark';

export default function Footer() {
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

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div ref={sectionRef}>
      {/* ── FINAL CTA SECTION ─────────────────────────────────────── */}
      <section className="lp-section lp-final-cta-section">
        <div className="lp-container">
          <div className="lp-final-cta-box lp-reveal">
            <span className="lp-eyebrow">Ready to Launch</span>
            <h2 className="lp-h2" style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', maxWidth: '640px', margin: '0 auto 18px' }}>
              Bring your neighborhood retail store online today.
            </h2>
            <p className="lp-body" style={{ maxWidth: '520px', margin: '0 auto 36px' }}>
              Join forward-thinking store owners and couriers operating with live catalog visibility and zero double-selling.
            </p>
            <div className="lp-final-cta-btns">
              <a className="lp-btn-primary" href={appLinks.merchantSignup()}>
                <Store size={16} />
                <span>Register Your Store Free</span>
                <ArrowRight size={16} />
              </a>
              <a className="lp-btn-secondary" href={appLinks.rider()}>
                <Bike size={16} />
                <span>Apply as a Courier</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN FOOTER ───────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            {/* Brand column */}
            <div className="lp-footer-brand-col">
              <div className="lp-footer-brand">
                <BrandMark showTagline={false} />
              </div>
              <p className="lp-footer-brand-desc">
                The hyperlocal commerce operating system connecting brick-and-mortar stores, local shoppers, and on-demand courier networks.
              </p>
              <div className="lp-footer-network-status">
                <span className="lp-footer-dot" />
                <span>No setup fees · Change plans anytime</span>
              </div>
            </div>

            {/* Ecosystem links */}
            <div className="lp-footer-col">
              <h5 className="lp-footer-heading">Ecosystem</h5>
              <ul className="lp-footer-links">
                <li><a href="#subdomains" className="lp-footer-mono-link">*.{BRAND.domain}</a></li>
                <li><a href={appLinks.rider()} className="lp-footer-mono-link">{appLinks.rider()}</a></li>
                <li><a href={appLinks.shop()} className="lp-footer-mono-link">{appLinks.shop()}</a></li>
              </ul>
            </div>

            {/* Platform links */}
            <div className="lp-footer-col">
              <h5 className="lp-footer-heading">Platform</h5>
              <ul className="lp-footer-links">
                <li><a href="#ecosystem">Live Inventory Sync</a></li>
                <li><a href="#live-demo">Interactive Simulation</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#calculator">ROI & Savings Calculator</a></li>
                <li><a href="#pricing">Transparent Pricing</a></li>
                <li><a href="#faq">Frequently Asked Questions</a></li>
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="lp-footer-col">
              <h5 className="lp-footer-heading">Get Started</h5>
              <div className="lp-footer-actions">
                <a className="lp-btn-primary" style={{ width: '100%', justifyContent: 'center' }} href={appLinks.merchantSignup()}>
                  <span>Register Store Free</span>
                  <ArrowRight size={14} />
                </a>
                <a className="lp-btn-secondary" style={{ width: '100%', justifyContent: 'center' }} href={appLinks.rider()}>
                  <Bike size={14} />
                  <span>Join Courier Fleet</span>
                </a>
              </div>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <p className="lp-footer-copyright">
              &copy; {new Date().getFullYear()} {BRAND.name} Ventures Inc. Powering hyperlocal commerce in Nigeria.
            </p>
            <button className="lp-back-to-top" onClick={scrollTop} aria-label="Back to top">
              <span>Back to top</span>
              <ArrowUp size={13} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
