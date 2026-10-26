import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Heart, 
  GitCompare, 
  ChevronDown, 
  ChevronRight,
  X, 
  Store, 
  ArrowLeft,
  Sparkles,
  MapPin,
  Menu,
  User
} from 'lucide-react';
import { DEPARTMENTS, PRODUCTS, CORRIDORS } from './marketplaceData';

export default function MarketplaceHeader({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  selectedCorridor,
  onSelectCorridor,
  cartCount,
  cartTotal,
  wishlistCount,
  compareCount,
  onOpenCart,
  onOpenWishlist,
  onOpenCompare,
  onExitToLanding,
  onSelectProduct,
  onOpenMobileMenu,
  onOpenAuthModal,
  currentUser,
  formatPrice
}) {
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [corridorDropdownOpen, setCorridorDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // Suggestions based on search
  const suggestions = React.useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const q = searchTerm.toLowerCase();
    return PRODUCTS.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.categoryName.toLowerCase().includes(q) ||
      p.storeName.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDepartmentObj = DEPARTMENTS.find(d => d.id === selectedCategory);
  const categoryLabel = selectedDepartmentObj ? selectedDepartmentObj.name.split('&')[0].trim() : 'All';
  const currentCorridorObj = CORRIDORS.find(c => c.name === selectedCorridor) || CORRIDORS[0];

  return (
    <header className="mp-main-header">
      <div className="mp-header-inner">
        {/* Mobile Hamburger & Logo Block */}
        <div className="mp-header-left">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mp-hamburger-btn"
            onClick={onOpenMobileMenu}
            aria-label="Open mobile navigation menu"
          >
            <Menu size={22} />
          </button>

          {/* Brand Logo */}
          <div className="mp-brand-logo" onClick={() => onSelectCategory('All')}>
            <div className="mp-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M17 8C17 5.79 14.76 4 12 4S7 5.79 7 8c0 1.86 1.28 3.46 3.14 4.07L13 13c1.29.46 2 1.38 2 2.5C15 17.43 13.65 19 12 19s-3-1.57-3-3.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              <span className="mp-logo-pulse" />
            </div>
            <div className="mp-logo-text-block">
              <div className="mp-logo-title">
                Subtech<span>Ventures</span>
              </div>
              <div className="mp-logo-subtitle">STV Marketplace</div>
            </div>
          </div>
        </div>

        {/* Center: Streamlined Unified Search Bar */}
        <div className="mp-search-wrapper" ref={searchRef}>
          {/* Subtle Category Pill on Desktop */}
          <div className="mp-search-cat-pill-wrap">
            <button
              type="button"
              className="mp-search-cat-pill"
              onClick={() => setCatDropdownOpen(!catDropdownOpen)}
            >
              <span>{categoryLabel}</span>
              <ChevronDown size={11} className={catDropdownOpen ? 'rotate-180' : ''} />
            </button>

            {catDropdownOpen && (
              <div className="mp-category-menu">
                <button
                  className={`mp-category-menu-item ${selectedCategory === 'All' ? 'active' : ''}`}
                  onClick={() => {
                    onSelectCategory('All');
                    setCatDropdownOpen(false);
                  }}
                >
                  <span>All Categories</span>
                  {selectedCategory === 'All' && <span>✓</span>}
                </button>
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept.id}
                    className={`mp-category-menu-item ${selectedCategory === dept.id ? 'active' : ''}`}
                    onClick={() => {
                      onSelectCategory(dept.id);
                      setCatDropdownOpen(false);
                    }}
                  >
                    <span>{dept.name}</span>
                    {selectedCategory === dept.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Search size={16} className="text-slate-400 ml-3 flex-shrink-0" />

          {/* Search Input */}
          <div className="mp-search-input-box">
            <input
              type="text"
              placeholder="Search 12,000+ products, stores, local brands..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="mp-search-input-field"
              enterKeyHint="search"
            />
            {searchTerm && (
              <button
                type="button"
                className="mp-search-clear-btn"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Submit Search Button */}
          <button type="button" className="mp-search-submit-btn" aria-label="Search">
            <span>Search</span>
          </button>

          {/* Real-Time Live Search Suggestions Dropdown */}
          {searchFocused && suggestions.length > 0 && (
            <div className="mp-search-suggestions-popover">
              <div className="mp-suggestions-header">
                <span>Matching Marketplace Items ({suggestions.length})</span>
              </div>
              <div className="mp-suggestions-list">
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    className="mp-suggestion-row"
                    onClick={() => {
                      onSelectProduct(item);
                      setSearchFocused(false);
                    }}
                  >
                    <div className="mp-suggestion-thumb" style={{ background: item.bgGradient }}>
                      <span>{item.emoji}</span>
                    </div>
                    <div className="mp-suggestion-info">
                      <div className="mp-suggestion-name">{item.name}</div>
                      <div className="mp-suggestion-meta">
                        <span className="mp-suggestion-store">{item.storeName}</span>
                        <span className="mp-suggestion-cat">· {item.categoryName}</span>
                      </div>
                    </div>
                    <div className="mp-suggestion-price">
                      {formatPrice(item.price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Actions Block */}
        <div className="mp-header-actions">
          {/* Delivery Corridor Pill (Desktop) */}
          <div className="mp-header-corridor-wrap">
            <button
              type="button"
              className="mp-header-corridor-pill"
              onClick={() => setCorridorDropdownOpen(!corridorDropdownOpen)}
              title="Change Delivery Zone"
            >
              <MapPin size={13} className="text-blue-500" />
              <div className="mp-header-corridor-text">
                <span className="mp-corridor-zone-title">{currentCorridorObj.name.split('&')[0]}</span>
                <span className="mp-corridor-zone-eta">{currentCorridorObj.eta}</span>
              </div>
              <ChevronDown size={11} className="text-slate-400" />
            </button>

            {corridorDropdownOpen && (
              <div className="mp-corridor-menu">
                <div className="mp-corridor-menu-header">
                  <span>Neighborhood Delivery Corridors</span>
                </div>
                {CORRIDORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`mp-corridor-menu-item ${selectedCorridor === c.name ? 'active' : ''}`}
                    onClick={() => {
                      onSelectCorridor(c.name);
                      setCorridorDropdownOpen(false);
                    }}
                  >
                    <div>
                      <div className="mp-corridor-menu-title">{c.name}</div>
                      <div className="mp-corridor-menu-meta">{c.distance} · {c.eta}</div>
                    </div>
                    {selectedCorridor === c.name && <span className="mp-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compare Button (Desktop only) */}
          <button 
            type="button" 
            className="mp-action-btn mp-compare-btn"
            onClick={onOpenCompare}
            title="Product Comparison"
          >
            <div className="mp-action-icon-wrap">
              <GitCompare size={19} />
              {compareCount > 0 && (
                <span className="mp-action-badge">{compareCount}</span>
              )}
            </div>
          </button>

          {/* Wishlist Button */}
          <button 
            type="button" 
            className="mp-action-btn mp-wishlist-btn"
            onClick={onOpenWishlist}
            title="Saved Wishlist"
          >
            <div className="mp-action-icon-wrap">
              <Heart size={19} />
              {wishlistCount > 0 && (
                <span className="mp-action-badge mp-badge-heart">{wishlistCount}</span>
              )}
            </div>
          </button>

          {/* Cart Button */}
          <button 
            type="button" 
            className="mp-action-btn mp-cart-btn"
            onClick={onOpenCart}
            title="Shopping Cart"
          >
            <div className="mp-action-icon-wrap">
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <span className="mp-action-badge mp-badge-cart">{cartCount}</span>
              )}
            </div>
            <div className="mp-cart-info">
              <span className="mp-cart-total-val">{formatPrice(cartTotal)}</span>
            </div>
          </button>

          {/* Shopper Account (Desktop only) */}
          <button
            type="button"
            className="mp-action-btn mp-user-btn"
            onClick={onOpenAuthModal}
            title={currentUser ? currentUser.name : "Sign In / Account"}
          >
            <div className="mp-action-icon-wrap">
              <User size={19} />
            </div>
          </button>

          {/* Exit / Return to Platform Button (Desktop only) */}
          <button
            type="button"
            className="mp-exit-platform-btn"
            onClick={onExitToLanding}
            title="Return to Main Website"
          >
            <ArrowLeft size={14} />
            <span>Main Site</span>
          </button>
        </div>
      </div>

      {/* Mobile Second Row: Location Strip */}
      <div className="mp-mobile-location-strip">
        <button
          type="button"
          className="mp-mobile-loc-btn"
          onClick={onOpenMobileMenu}
        >
          <MapPin size={12} className="text-blue-500" />
          <span>Delivering to: <strong>{currentCorridorObj.name.split('&')[0]}</strong> ({currentCorridorObj.eta})</span>
          <ChevronRight size={12} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
}
