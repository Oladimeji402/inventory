import React, { useState } from 'react';
import { 
  X, 
  Home, 
  Store, 
  Flame, 
  Tag, 
  Truck, 
  HelpCircle, 
  User, 
  MapPin, 
  ChevronRight, 
  ChevronDown, 
  Sparkles,
  Smartphone,
  Pill,
  ShoppingBasket,
  Shirt,
  Cookie,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { DEPARTMENTS, CORRIDORS, CURRENCIES } from './marketplaceData';

const iconMap = {
  Smartphone: Smartphone,
  Pill: Pill,
  ShoppingBasket: ShoppingBasket,
  Shirt: Shirt,
  Sparkles: Sparkles,
  Cookie: Cookie
};

export default function MarketplaceMobileDrawer({
  isOpen,
  onClose,
  activeNav,
  onSelectNav,
  selectedCategory,
  onSelectCategory,
  selectedCorridor,
  onSelectCorridor,
  currentCurrency,
  onSelectCurrency,
  onOpenOrderTracking,
  onOpenVendorModal,
  onOpenAuthModal,
  currentUser
}) {
  const [departmentsExpanded, setDepartmentsExpanded] = useState(true);
  const [corridorsExpanded, setCorridorsExpanded] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="mp-mobile-drawer-backdrop" onClick={onClose}>
      <div 
        className="mp-mobile-drawer-sheet" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header / User Banner */}
        <div className="mp-mobile-drawer-top">
          <div className="mp-mobile-user-card">
            <div className="mp-mobile-avatar">
              <User size={18} />
            </div>
            <div className="mp-mobile-user-info">
              {currentUser ? (
                <>
                  <span className="mp-mobile-greeting">Welcome back,</span>
                  <strong className="mp-mobile-username">{currentUser.name}</strong>
                </>
              ) : (
                <button
                  type="button"
                  className="mp-mobile-signin-btn"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                >
                  <span>Sign In / Register</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          </div>

          <button 
            type="button" 
            className="mp-mobile-drawer-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mp-mobile-drawer-scroll">
          {/* Active Delivery Zone Accordion */}
          <div className="mp-mobile-section">
            <button
              type="button"
              className="mp-mobile-accordion-header"
              onClick={() => setCorridorsExpanded(!corridorsExpanded)}
            >
              <div className="mp-mobile-sec-title">
                <MapPin size={15} className="text-blue-500" />
                <span>Zone: {selectedCorridor.split('&')[0]}</span>
              </div>
              <ChevronDown 
                size={15} 
                className={`transition-transform duration-200 ${corridorsExpanded ? 'rotate-180' : ''}`} 
              />
            </button>

            {corridorsExpanded && (
              <div className="mp-mobile-corridors-list">
                {CORRIDORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`mp-mobile-corridor-item ${selectedCorridor === c.name ? 'active' : ''}`}
                    onClick={() => {
                      onSelectCorridor(c.name);
                      setCorridorsExpanded(false);
                    }}
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.eta} · {c.distance}</div>
                    </div>
                    {selectedCorridor === c.name && <span className="text-blue-600 font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Navigation Links */}
          <div className="mp-mobile-nav-group">
            <button
              type="button"
              className={`mp-mobile-nav-link ${activeNav === 'home' ? 'active' : ''}`}
              onClick={() => {
                onSelectCategory('All');
                onSelectNav('home');
                onClose();
              }}
            >
              <Home size={17} />
              <span>Home</span>
            </button>

            <button
              type="button"
              className={`mp-mobile-nav-link ${activeNav === 'vendors' ? 'active' : ''}`}
              onClick={() => {
                onSelectNav('vendors');
                onClose();
              }}
            >
              <Store size={17} />
              <span>All Stores & Vendors</span>
            </button>

            <button
              type="button"
              className={`mp-mobile-nav-link ${activeNav === 'deals' ? 'active' : ''}`}
              onClick={() => {
                onSelectNav('deals');
                onClose();
              }}
            >
              <Flame size={17} className="text-red-500" />
              <span>Flash Deals & Rush</span>
              <span className="mp-mobile-badge-hot">HOT</span>
            </button>

            <button
              type="button"
              className={`mp-mobile-nav-link ${activeNav === 'sales' ? 'active' : ''}`}
              onClick={() => {
                onSelectNav('sales');
                onClose();
              }}
            >
              <Tag size={17} />
              <span>Daily Best Sales</span>
            </button>

            <button
              type="button"
              className="mp-mobile-nav-link"
              onClick={() => {
                onClose();
                onOpenOrderTracking();
              }}
            >
              <Truck size={17} />
              <span>Track Live Delivery</span>
            </button>

            <a 
              href="#faq"
              className="mp-mobile-nav-link"
              onClick={onClose}
            >
              <HelpCircle size={17} />
              <span>Help & FAQ</span>
            </a>
          </div>

          {/* Collapsible Departments List */}
          <div className="mp-mobile-section">
            <button
              type="button"
              className="mp-mobile-accordion-header"
              onClick={() => setDepartmentsExpanded(!departmentsExpanded)}
            >
              <div className="mp-mobile-sec-title">
                <Sparkles size={15} className="text-emerald-500" />
                <span>Shop by Department</span>
              </div>
              <ChevronDown 
                size={15} 
                className={`transition-transform duration-200 ${departmentsExpanded ? 'rotate-180' : ''}`} 
              />
            </button>

            {departmentsExpanded && (
              <div className="mp-mobile-depts-list">
                <button
                  type="button"
                  className={`mp-mobile-dept-item ${selectedCategory === 'All' ? 'active' : ''}`}
                  onClick={() => {
                    onSelectCategory('All');
                    onSelectNav('shop');
                    onClose();
                  }}
                >
                  <span className="text-xs font-bold">All Departments</span>
                  {selectedCategory === 'All' && <span className="text-blue-600 font-bold">✓</span>}
                </button>

                {DEPARTMENTS.map((dept) => {
                  const IconComp = iconMap[dept.icon] || Sparkles;
                  const isActive = selectedCategory === dept.id;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      className={`mp-mobile-dept-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onSelectCategory(dept.id);
                        onSelectNav('shop');
                        onClose();
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                          style={{ background: dept.bg, color: dept.color }}
                        >
                          <IconComp size={13} />
                        </div>
                        <span className="text-xs font-medium text-slate-800">{dept.name}</span>
                      </div>
                      {isActive && <span className="text-blue-600 font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Currency Switcher */}
          <div className="mp-mobile-section">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Currency
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.values(CURRENCIES).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`mp-mobile-currency-btn ${currentCurrency === c.code ? 'active' : ''}`}
                  onClick={() => onSelectCurrency(c.code)}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>

          {/* Sell on Subtech CTA */}
          <div className="mp-mobile-cta-box">
            <div className="flex items-center gap-2 mb-1">
              <Store size={16} className="text-emerald-400" />
              <strong className="text-xs font-bold text-white">Sell on Subtech (STV)</strong>
            </div>
            <p className="text-[11px] text-slate-300 mb-2.5">
              Launch your local digital storefront with instant courier dispatch.
            </p>
            <button
              type="button"
              className="mp-mobile-seller-btn"
              onClick={() => {
                onClose();
                onOpenVendorModal();
              }}
            >
              <span>Merchant Registration</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
