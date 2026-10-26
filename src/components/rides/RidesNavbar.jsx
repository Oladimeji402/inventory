import React from 'react';
import { 
  ArrowLeft, 
  Clock, 
  GraduationCap, 
  MapPin, 
  Store, 
  User, 
  Sparkles,
  ShoppingBag,
  Bike
} from 'lucide-react';
import { appLinks } from '../../config/surfaces';

export default function RidesNavbar({
  activeTab,
  onSelectTab,
  activeTripsCount,
  activeContractsCount,
  onOpenContractsModal,
  onExitToLanding
}) {
  return (
    <header className="rd-header">
      <div className="rd-header-inner">
        {/* Left: Brand Logo */}
        <div className="rd-header-left">
          <div className="rd-brand-logo" onClick={onExitToLanding}>
            <div className="rd-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M17 8C17 5.79 14.76 4 12 4S7 5.79 7 8c0 1.86 1.28 3.46 3.14 4.07L13 13c1.29.46 2 1.38 2 2.5C15 17.43 13.65 19 12 19s-3-1.57-3-3.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
            <div className="rd-logo-text">
              <span className="rd-brand-name">Subtech<span>Mobility</span></span>
              <span className="rd-brand-tag">Okada · Maruwa · Cars</span>
            </div>
          </div>
        </div>

        {/* Center: Surface Switcher (Desktop) */}
        <nav className="rd-surface-nav">
          <a href="/shop" className="rd-surface-pill">
            <ShoppingBag size={13} />
            <span>Marketplace</span>
          </a>
          <div className="rd-surface-pill active">
            <Bike size={13} />
            <span>Rides & Errands</span>
          </div>
          <a href="/start" className="rd-surface-pill">
            <Store size={13} />
            <span>Retail OS</span>
          </a>
        </nav>

        {/* Right: Quick Actions */}
        <div className="rd-header-right">
          {/* School Run Contracts Button */}
          <button
            type="button"
            className="rd-contracts-btn"
            onClick={onOpenContractsModal}
            title="School Run Contracts"
          >
            <GraduationCap size={15} />
            <span className="rd-btn-label">School Runs</span>
            {activeContractsCount > 0 && (
              <span className="rd-badge-count">{activeContractsCount}</span>
            )}
          </button>

          {/* Active Trips Pill */}
          {activeTripsCount > 0 && (
            <div className="rd-active-trips-pill">
              <span className="rd-pulse-dot" />
              <span>{activeTripsCount} Active {activeTripsCount === 1 ? 'Trip' : 'Trips'}</span>
            </div>
          )}

          {/* Back to Home Button */}
          <button
            type="button"
            className="rd-back-btn"
            onClick={onExitToLanding}
            title="Back to Platform Home"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Main Site</span>
          </button>
        </div>
      </div>
    </header>
  );
}
