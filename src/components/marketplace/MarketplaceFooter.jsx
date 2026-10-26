import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle, 
  ShieldCheck, 
  Lock, 
  ArrowRight,
  ExternalLink,
  Store,
  Truck
} from 'lucide-react';

export default function MarketplaceFooter({
  onOpenOrderTracking,
  onOpenVendorModal,
  onExitToLanding
}) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e) {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      setSubscribed(true);
      setEmail('');
    }
  }

  return (
    <footer className="mp-footer">
      {/* Newsletter Bar */}
      <div className="mp-newsletter-section">
        <div className="mp-newsletter-inner">
          <div className="mp-newsletter-text">
            <div className="mp-newsletter-icon">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="mp-newsletter-title">Join 45,000+ Smart Neighborhood Shoppers</h3>
              <p className="mp-newsletter-sub">Get secret flash deals, weekly merchant coupons, and courier promo codes delivered to your inbox.</p>
            </div>
          </div>

          <form className="mp-newsletter-form" onSubmit={handleSubscribe}>
            {subscribed ? (
              <div className="mp-newsletter-success">
                <CheckCircle size={18} />
                <span>Thank you for subscribing! Check your email for your ₦2,500 voucher.</span>
              </div>
            ) : (
              <div className="mp-newsletter-input-group">
                <input
                  type="email"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mp-newsletter-input"
                  required
                />
                <button type="submit" className="mp-newsletter-btn">
                  <span>Subscribe</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Main 4-Column Footer */}
      <div className="mp-footer-main">
        <div className="mp-footer-grid">
          {/* Column 1: Brand & Contact */}
          <div className="mp-footer-col mp-footer-brand-col">
            <div className="mp-footer-logo">
              <div className="mp-footer-logo-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M17 8C17 5.79 14.76 4 12 4S7 5.79 7 8c0 1.86 1.28 3.46 3.14 4.07L13 13c1.29.46 2 1.38 2 2.5C15 17.43 13.65 19 12 19s-3-1.57-3-3.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="mp-footer-logo-text">
                Subtech<span>Ventures</span>
              </div>
            </div>
            <p className="mp-footer-bio">
              Subtech Ventures (STV) Lagos premier hyperlocal commerce ecosystem connecting neighborhood pharmacies, supermarkets, and electronics distributors with 15–30 minute courier dispatch.
            </p>
            
            <div className="mp-footer-contacts">
              <div className="mp-footer-contact-item">
                <MapPin size={15} className="text-blue-400" />
                <span>Plot 12, Isaac John Street, Ikeja GRA, Lagos</span>
              </div>
              <div className="mp-footer-contact-item">
                <Phone size={15} className="text-emerald-400" />
                <span>+234 (0) 700 636 2278 · 24/7 Hotline</span>
              </div>
              <div className="mp-footer-contact-item">
                <Mail size={15} className="text-amber-400" />
                <span>support@subtechventures.com</span>
              </div>
            </div>
          </div>

          {/* Column 2: Customer Care */}
          <div className="mp-footer-col">
            <h4 className="mp-footer-heading">Customer Care</h4>
            <ul className="mp-footer-links">
              <li>
                <button type="button" onClick={onOpenOrderTracking} className="mp-footer-link-btn">
                  <span>Track Live Delivery</span>
                </button>
              </li>
              <li><a href="#faq">Help Center & FAQs</a></li>
              <li><a href="#flash-deals">Flash Deals & Specials</a></li>
              <li><a href="#all-vendors">Neighborhood Store Directory</a></li>
              <li><a href="#terms">Buyer Protection & Escrow Policy</a></li>
              <li><a href="#corridors">Delivery Corridors & ETAs</a></li>
            </ul>
          </div>

          {/* Column 3: Merchant & Vendor Central */}
          <div className="mp-footer-col">
            <h4 className="mp-footer-heading">Vendor Central</h4>
            <ul className="mp-footer-links">
              <li>
                <button type="button" onClick={onOpenVendorModal} className="mp-footer-link-btn highlight">
                  <span>Become a Verified Vendor</span>
                </button>
              </li>
              <li><a href="/login">Merchant Portal Login</a></li>
              <li><a href="/start">Register New Storefront</a></li>
              <li><a href="#rider">Join Courier Delivery Fleet</a></li>
              <li><a href="#commission">Commission & Payout Rates</a></li>
              <li><a href="#guidelines">Pharmacy & Food Standards</a></li>
            </ul>
          </div>

          {/* Column 4: Trust & Payment Partners */}
          <div className="mp-footer-col">
            <h4 className="mp-footer-heading">Secure Payments</h4>
            <p className="mp-footer-trust-text">
              Every checkout is processed through bank-grade 256-bit encryption with escrow release protection.
            </p>
            
            <div className="mp-payment-badges">
              <span className="mp-pay-pill">Mastercard</span>
              <span className="mp-pay-pill">VISA</span>
              <span className="mp-pay-pill">Verve</span>
              <span className="mp-pay-pill">Paystack</span>
              <span className="mp-pay-pill">Bank Transfer</span>
            </div>

            <div className="mp-ssl-guarantee">
              <Lock size={14} className="text-emerald-400" />
              <span>SSL 256-Bit Encrypted & NAFDAC Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Footer */}
      <div className="mp-footer-bottom">
        <div className="mp-footer-bottom-inner">
          <div className="mp-copyright">
            © {new Date().getFullYear()} Subtech Ventures (STV) Hyperlocal Marketplace. Powered by Subtech Ventures Inc. All rights reserved.
          </div>
          <div className="mp-legal-links">
            <a href="#privacy">Privacy Policy</a>
            <span>·</span>
            <a href="#terms">Terms of Service</a>
            <span>·</span>
            <a href="#security">Security & Compliance</a>
            <span>·</span>
            <button type="button" onClick={onExitToLanding} className="mp-footer-home-btn">
              Back to Main Platform
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
