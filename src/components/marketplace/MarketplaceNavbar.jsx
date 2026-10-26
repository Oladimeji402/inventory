import React, { useState } from 'react';
import { 
  Menu, 
  ChevronDown, 
  Flame, 
  Store, 
  Tag, 
  Truck, 
  Sparkles, 
  ArrowRight,
  Smartphone,
  Pill,
  ShoppingBasket,
  Shirt,
  Cookie,
  Home
} from 'lucide-react';
import { DEPARTMENTS } from './marketplaceData';

const iconMap = {
  Smartphone: Smartphone,
  Pill: Pill,
  ShoppingBasket: ShoppingBasket,
  Shirt: Shirt,
  Sparkles: Sparkles,
  Cookie: Cookie
};

export default function MarketplaceNavbar({
  activeNav,
  onSelectNav,
  selectedCategory,
  onSelectCategory,
  onOpenVendorModal,
  onOpenOrderTracking
}) {
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [hoveredDept, setHoveredDept] = useState(DEPARTMENTS[0]);

  return (
    <nav className="mp-navbar">
      <div className="mp-navbar-inner">
        {/* Mega Menu Toggle Button */}
        <div 
          className="mp-mega-menu-container"
          onMouseLeave={() => setMegaMenuOpen(false)}
        >
          <button
            type="button"
            className="mp-departments-btn"
            onClick={() => setMegaMenuOpen(!megaMenuOpen)}
            onMouseEnter={() => setMegaMenuOpen(true)}
          >
            <Menu size={17} />
            <span>All Departments</span>
            <ChevronDown size={13} className={megaMenuOpen ? 'rotate-180' : ''} />
          </button>

          {/* Mega Menu Dropdown Window */}
          {megaMenuOpen && (
            <div className="mp-mega-menu-window">
              <div className="mp-mega-menu-grid">
                {/* Department Categories List */}
                <div className="mp-mega-dept-list">
                  {DEPARTMENTS.map((dept) => {
                    const IconComp = iconMap[dept.icon] || Sparkles;
                    const isHovered = hoveredDept.id === dept.id;
                    return (
                      <div
                        key={dept.id}
                        className={`mp-mega-dept-item ${isHovered ? 'active' : ''}`}
                        onMouseEnter={() => setHoveredDept(dept)}
                        onClick={() => {
                          onSelectCategory(dept.id);
                          onSelectNav('shop');
                          setMegaMenuOpen(false);
                        }}
                      >
                        <div className="mp-mega-dept-icon" style={{ background: dept.bg, color: dept.color }}>
                          <IconComp size={15} />
                        </div>
                        <div className="mp-mega-dept-title-group">
                          <span className="mp-mega-dept-name">{dept.name}</span>
                          <span className="mp-mega-dept-count">{dept.itemCount}</span>
                        </div>
                        {dept.badge && (
                          <span className="mp-dept-pill-badge">{dept.badge}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Subcategories & Featured Promo Preview */}
                <div className="mp-mega-subcats-panel">
                  <div className="mp-mega-subcats-header">
                    <h4>{hoveredDept.name}</h4>
                    <button
                      type="button"
                      className="mp-view-all-dept-btn"
                      onClick={() => {
                        onSelectCategory(hoveredDept.id);
                        onSelectNav('shop');
                        setMegaMenuOpen(false);
                      }}
                    >
                      <span>Explore Department</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <ul className="mp-mega-subcats-list">
                    {hoveredDept.subcategories.map((sub) => (
                      <li key={sub}>
                        <button
                          type="button"
                          className="mp-subcat-link"
                          onClick={() => {
                            onSelectCategory(hoveredDept.id);
                            onSelectNav('shop');
                            setMegaMenuOpen(false);
                          }}
                        >
                          <span className="mp-subcat-dot" />
                          <span>{sub}</span>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {/* Promo Card inside Mega Menu */}
                  {hoveredDept.featuredPromo && (
                    <div className="mp-mega-promo-box">
                      <div className="mp-mega-promo-tag">LIMITED SPECIAL</div>
                      <h5>{hoveredDept.featuredPromo.title}</h5>
                      <p>{hoveredDept.featuredPromo.desc}</p>
                      <div className="mp-mega-coupon">
                        Use voucher: <code>{hoveredDept.featuredPromo.code}</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Navigation Links */}
        <div className="mp-nav-links">
          <button
            type="button"
            className={`mp-nav-item ${activeNav === 'home' ? 'active' : ''}`}
            onClick={() => {
              onSelectCategory('All');
              onSelectNav('home');
            }}
          >
            <Home size={14} />
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`mp-nav-item ${activeNav === 'vendors' ? 'active' : ''}`}
            onClick={() => onSelectNav('vendors')}
          >
            <Store size={14} />
            <span>All Stores</span>
          </button>

          <button
            type="button"
            className={`mp-nav-item ${activeNav === 'deals' ? 'active' : ''}`}
            onClick={() => onSelectNav('deals')}
          >
            <Flame size={14} className="text-red-500" />
            <span>Flash Deals</span>
            <span className="mp-nav-flame-badge">HOT</span>
          </button>

          <button
            type="button"
            className={`mp-nav-item ${activeNav === 'sales' ? 'active' : ''}`}
            onClick={() => onSelectNav('sales')}
          >
            <Tag size={14} />
            <span>Daily Best Sales</span>
          </button>

          <button
            type="button"
            className="mp-nav-item"
            onClick={onOpenOrderTracking}
          >
            <Truck size={14} />
            <span>Track Order</span>
          </button>

          <a
            href="/rides"
            className="mp-nav-item"
          >
            <span>🛺 Rides & Errands</span>
          </a>
        </div>

        {/* Right: Clean Sell on Subtech CTA */}
        <div className="mp-navbar-right">
          <button
            type="button"
            className="mp-seller-cta-btn"
            onClick={onOpenVendorModal}
          >
            <Sparkles size={13} />
            <span>Sell on Subtech</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
