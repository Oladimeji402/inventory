import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import BrandMark from '../../shared/components/BrandMark';
import { appLinks } from '../../config/surfaces';

const links = [
  { label: 'Platform',  href: '#ecosystem' },
  { label: 'Live Demo', href: '#live-demo' },
  { label: 'Pricing',   href: '#pricing' },
  { label: 'FAQ',       href: '#faq' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const smooth = (e, href) => {
    e.preventDefault();
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className={`lp-header${scrolled ? ' scrolled' : ''}`}>
      <div className="lp-container">
        <nav className="lp-nav">

          {/* Brand */}
          <BrandMark
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />

          {/* Desktop links */}
          <ul className="lp-nav-links">
            {links.map(l => (
              <li key={l.label}>
                <a href={l.href} onClick={e => smooth(e, l.href)}>{l.label}</a>
              </li>
            ))}
          </ul>

          {/* Desktop actions */}
          <div className="lp-nav-actions">
            <a
              className="lp-btn-ghost"
              style={{ padding: '9px 16px', fontSize: 14 }}
              href={appLinks.merchantLogin()}
            >
              Sign in
            </a>
            <a
              className="lp-btn-primary"
              style={{ padding: '9px 20px', fontSize: 14 }}
              href={appLinks.merchantSignup()}
            >
              <span>Get Started Free</span>
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lp-mobile-toggle"
            onClick={() => setOpen(v => !v)}
            aria-label="Toggle navigation menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lp-mobile-drawer">
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={e => smooth(e, l.href)}>
              {l.label}
            </a>
          ))}
          <div className="lp-mobile-actions">
            <a
              className="lp-btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              href={appLinks.merchantLogin()}
            >
              Sign in
            </a>
            <a
              className="lp-btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              href={appLinks.merchantSignup()}
            >
              <span>Get Started Free</span>
              <ArrowRight size={14} />
            </a>
            <a
              className="lp-btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '13.5px' }}
              href={appLinks.rider()}
            >
              Join as a Courier
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
