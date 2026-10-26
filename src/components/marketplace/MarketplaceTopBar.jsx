import React, { useState, useEffect } from 'react';
import { ChevronDown, User, Sparkles } from 'lucide-react';
import { CURRENCIES } from './marketplaceData';

export default function MarketplaceTopBar({ 
  currentCurrency, 
  onSelectCurrency, 
  onOpenAuthModal,
  currentUser 
}) {
  const [currDropdown, setCurrDropdown] = useState(false);
  const [announcementIdx, setAnnouncementIdx] = useState(0);

  const announcements = [
    '⚡ Subtech Express: 15–25 min hyperlocal delivery across Lagos corridors',
    '🎁 Promo Voucher: Use code STV20 for 20% off your checkout today',
    '🛡️ 100% Subtech Escrow: Funds released to merchant only after verified handover'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  return (
    <div className="mp-topbar">
      <div className="mp-topbar-inner">
        {/* Left: Ticker message */}
        <div className="mp-topbar-left">
          <div className="mp-ticker-item key-fade">
            <span>{announcements[announcementIdx]}</span>
          </div>
        </div>

        {/* Right: Currency Selector & Auth Link */}
        <div className="mp-topbar-right">
          {/* Currency Dropdown */}
          <div className="mp-dropdown-wrapper">
            <button 
              className="mp-topbar-btn"
              onClick={() => setCurrDropdown(!currDropdown)}
              title="Change Currency"
            >
              <span>{CURRENCIES[currentCurrency]?.label || currentCurrency}</span>
              <ChevronDown size={11} />
            </button>
            {currDropdown && (
              <div className="mp-dropdown-menu">
                {Object.values(CURRENCIES).map((c) => (
                  <button
                    key={c.code}
                    className={`mp-dropdown-item ${currentCurrency === c.code ? 'active' : ''}`}
                    onClick={() => {
                      onSelectCurrency(c.code);
                      setCurrDropdown(false);
                    }}
                  >
                    <span>{c.label}</span>
                    {currentCurrency === c.code && <span className="mp-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="mp-topbar-divider">|</span>

          <a href="#faq" className="mp-topbar-link">
            <span>Help Center</span>
          </a>

          <span className="mp-topbar-divider">|</span>

          <button 
            type="button"
            className="mp-topbar-link"
            onClick={onOpenAuthModal}
          >
            <User size={12} />
            <span>{currentUser ? currentUser.name : 'Sign In'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
