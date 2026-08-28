import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';

const links = [
  { label: 'Platform',  href: '#ecosystem' },
  { label: 'Live Demo', href: '#live-demo' },
  { label: 'Pricing',   href: '#pricing' },
  { label: 'FAQ',       href: '#faq' },
];

export default function Navbar({ onOpenStoreModal, onOpenRiderModal }) {
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
          <a
            className="lp-brand"
            href="#"
            onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <div className="lp-brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 8C17 5.79 14.76 4 12 4S7 5.79 7 8c0 1.86 1.28 3.46 3.14 4.07L13 13c1.29.46 2 1.38 2 2.5C15 17.43 13.65 19 12 19s-3-1.57-3-3.5"
                  stroke="#fff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="lp-brand-name">Subtech</span>
            <span className="lp-brand-tag">Retail OS</span>
          </a>

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
            <button
              className="lp-btn-primary"
              style={{ padding: '9px 20px', fontSize: 14 }}
              onClick={() => onOpenStoreModal()}
            >
              <span>Get Started Free</span>
              <ArrowRight size={14} />
            </button>
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
            <button
              className="lp-btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { setOpen(false); onOpenStoreModal(); }}
            >
              <span>Get Started Free</span>
              <ArrowRight size={14} />
            </button>
            <button
              className="lp-btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '13.5px' }}
              onClick={() => { setOpen(false); onOpenRiderModal(); }}
            >
              Join as a Courier
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
