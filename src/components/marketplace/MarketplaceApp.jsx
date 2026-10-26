import React, { useState, useMemo, useEffect } from 'react';
import './Marketplace.css';
import { 
  CURRENCIES, 
  CORRIDORS, 
  DEPARTMENTS, 
  VENDORS, 
  PRODUCTS, 
  BRANDS, 
  TESTIMONIALS,
  MOCK_ORDERS
} from './marketplaceData';

import MarketplaceTopBar from './MarketplaceTopBar';
import MarketplaceHeader from './MarketplaceHeader';
import MarketplaceNavbar from './MarketplaceNavbar';
import MarketplaceHeroSlider from './MarketplaceHeroSlider';
import MarketplaceTrustBar from './MarketplaceTrustBar';
import MarketplaceFlashDeals from './MarketplaceFlashDeals';
import MarketplaceCategoryGrid from './MarketplaceCategoryGrid';
import MarketplaceVendorsShowcase from './MarketplaceVendorsShowcase';
import MarketplaceProductTabs from './MarketplaceProductTabs';
import MarketplaceBannerStrip from './MarketplaceBannerStrip';
import MarketplaceBestSellers3Col from './MarketplaceBestSellers3Col';
import MarketplaceBrandsSlider from './MarketplaceBrandsSlider';
import MarketplaceTestimonials from './MarketplaceTestimonials';
import MarketplaceFooter from './MarketplaceFooter';

import MarketplaceCartDrawer from './MarketplaceCartDrawer';
import MarketplaceQuickViewModal from './MarketplaceQuickViewModal';
import MarketplaceWishlistDrawer from './MarketplaceWishlistDrawer';
import MarketplaceCompareModal from './MarketplaceCompareModal';
import MarketplaceOrderTrackingModal from './MarketplaceOrderTrackingModal';
import MarketplaceVendorModal from './MarketplaceVendorModal';
import MarketplaceAuthModal from './MarketplaceAuthModal';
import MarketplaceMobileDrawer from './MarketplaceMobileDrawer';

export default function MarketplaceApp({ onOpenStorefront, onExitToLanding }) {
  // Localization & Corridor
  const [currentCurrency, setCurrentCurrency] = useState('NGN');
  const [selectedCorridor, setSelectedCorridor] = useState('Ikeja GRA & Maryland');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNav, setActiveNav] = useState('home');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Interactive Cart, Wishlist, Compare
  const [cartItems, setCartItems] = useState([
    {
      ...PRODUCTS[0], // Anker Soundcore Space One
      qty: 1
    },
    {
      ...PRODUCTS[3], // Amoxicillin 500mg
      qty: 2
    }
  ]);
  const [wishlistIds, setWishlistIds] = useState(new Set(['PROD-02', 'PROD-05']));
  const [compareIds, setCompareIds] = useState(new Set(['PROD-01', 'PROD-02']));

  // Modals & Drawers
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [orderTrackingModalOpen, setOrderTrackingModalOpen] = useState(false);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState('NC-9842');
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Toast Feedback
  const [toastMessage, setToastMessage] = useState(null);

  function showToast(msg) {
    setToastMessage(msg);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToastMessage(null), 3000);
  }

  // Currency Converter Formatter
  const formatPrice = React.useCallback((amountInNgn) => {
    const cur = CURRENCIES[currentCurrency] || CURRENCIES.NGN;
    if (cur.code === 'NGN') {
      return `₦${Number(amountInNgn).toLocaleString()}`;
    }
    const converted = amountInNgn * cur.rate;
    return `${cur.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currentCurrency]);

  // Cart operations
  function handleAddToCart(product) {
    const quantityToAdd = product.qty || 1;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + quantityToAdd } : item
        );
      }
      return [...prev, { ...product, qty: quantityToAdd }];
    });
    showToast(`Added "${product.name}" to cart`);
  }

  function handleUpdateQty(productId, newQty) {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, qty: newQty } : item))
    );
  }

  function handleRemoveItem(productId) {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
    showToast('Removed item from cart');
  }

  function handleClearCart() {
    setCartItems([]);
  }

  // Wishlist operations
  function handleToggleWishlist(product) {
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
        showToast(`Removed from wishlist`);
      } else {
        next.add(product.id);
        showToast(`Saved to wishlist ❤️`);
      }
      return next;
    });
  }

  // Compare operations
  function handleToggleCompare(product) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
        showToast('Removed from compare list');
      } else {
        if (next.size >= 4) {
          showToast('You can compare up to 4 items at a time');
          return prev;
        }
        next.add(product.id);
        showToast('Added to compare list');
      }
      return next;
    });
  }

  // Filtered Products for Catalog
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const wishlistProducts = useMemo(() => {
    return PRODUCTS.filter((p) => wishlistIds.has(p.id));
  }, [wishlistIds]);

  const compareProducts = useMemo(() => {
    return PRODUCTS.filter((p) => compareIds.has(p.id));
  }, [compareIds]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  }, [cartItems]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.qty, 0);
  }, [cartItems]);

  // Scroll to section on nav change
  function handleSelectNav(navKey) {
    setActiveNav(navKey);
    if (navKey === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (navKey === 'vendors') {
      document.getElementById('all-vendors')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navKey === 'deals') {
      document.getElementById('flash-deals')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navKey === 'sales' || navKey === 'shop') {
      document.getElementById('marketplace-catalog')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navKey === 'brands') {
      document.querySelector('.mp-brands-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div className="marketplace-root stv-theme neocart-theme">
      {/* 1. Top Bar */}
      <MarketplaceTopBar
        currentCurrency={currentCurrency}
        onSelectCurrency={setCurrentCurrency}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        currentUser={currentUser}
      />

      {/* 2. Main High-Impact Header */}
      <MarketplaceHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedCorridor={selectedCorridor}
        onSelectCorridor={(c) => {
          setSelectedCorridor(c);
          showToast(`Switched delivery zone to ${c}`);
        }}
        cartCount={cartCount}
        cartTotal={cartTotal}
        wishlistCount={wishlistIds.size}
        compareCount={compareIds.size}
        onOpenCart={() => setCartDrawerOpen(true)}
        onOpenWishlist={() => setWishlistDrawerOpen(true)}
        onOpenCompare={() => setCompareModalOpen(true)}
        onExitToLanding={onExitToLanding}
        onSelectProduct={(p) => setQuickViewProduct(p)}
        onOpenMobileMenu={() => setMobileDrawerOpen(true)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        currentUser={currentUser}
        formatPrice={formatPrice}
      />

      {/* 3. Mega-Menu Navigation Bar (Desktop) */}
      <MarketplaceNavbar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          document.getElementById('marketplace-catalog')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenVendorModal={() => setVendorModalOpen(true)}
        onOpenOrderTracking={() => {
          setActiveTrackingOrderId('NC-9842');
          setOrderTrackingModalOpen(true);
        }}
      />

      {/* Main Page Body Sections */}
      <main className="mp-main-content">
        {/* 4. Hero Carousel Slider & Side Cards */}
        <MarketplaceHeroSlider
          onSelectCategory={(catId) => {
            setSelectedCategory(catId);
            document.getElementById('marketplace-catalog')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onSelectProduct={(p) => setQuickViewProduct(p)}
          onAddToCart={handleAddToCart}
          flashDealProduct={PRODUCTS[1]}
          formatPrice={formatPrice}
        />

        {/* 5. 4-Column Trust & Features Bar */}
        <MarketplaceTrustBar />

        {/* 6. Flash Deals Countdown Rush */}
        <MarketplaceFlashDeals
          products={PRODUCTS}
          onSelectProduct={(p) => setQuickViewProduct(p)}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          onToggleCompare={handleToggleCompare}
          wishlistIds={wishlistIds}
          compareIds={compareIds}
          onOpenStorefront={onOpenStorefront}
          formatPrice={formatPrice}
        />

        {/* 7. Department Categories Grid */}
        <MarketplaceCategoryGrid
          selectedCategory={selectedCategory}
          onSelectCategory={(catId) => {
            setSelectedCategory(catId);
            document.getElementById('marketplace-catalog')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 8. Top Rated Multi-Vendor Store Directory Showcase */}
        <MarketplaceVendorsShowcase
          onOpenStorefront={onOpenStorefront}
          onSelectProduct={(p) => setQuickViewProduct(p)}
          formatPrice={formatPrice}
        />

        {/* 9. Dual Promotional Mid-Banners */}
        <MarketplaceBannerStrip
          onOpenVendorModal={() => setVendorModalOpen(true)}
          onCopyCoupon={() => showToast('Coupon code STV20 copied!')}
        />

        {/* 10. Main Product Catalog Tabs & Sorting */}
        <MarketplaceProductTabs
          products={filteredProducts}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onSelectProduct={(p) => setQuickViewProduct(p)}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          onToggleCompare={handleToggleCompare}
          wishlistIds={wishlistIds}
          compareIds={compareIds}
          onOpenStorefront={onOpenStorefront}
          formatPrice={formatPrice}
        />

        {/* 11. 3-Column Best Sellers / Top Rated / Deals Showcase */}
        <MarketplaceBestSellers3Col
          products={PRODUCTS}
          onSelectProduct={(p) => setQuickViewProduct(p)}
          onAddToCart={handleAddToCart}
          formatPrice={formatPrice}
        />

        {/* 12. Authorized Brand Partners Infinite Slider */}
        <MarketplaceBrandsSlider />

        {/* 13. Verified Customer Testimonials */}
        <MarketplaceTestimonials />
      </main>

      {/* 14. Full Multi-Column Footer with Newsletter */}
      <MarketplaceFooter
        onOpenOrderTracking={() => {
          setActiveTrackingOrderId('NC-9842');
          setOrderTrackingModalOpen(true);
        }}
        onOpenVendorModal={() => setVendorModalOpen(true)}
        onExitToLanding={onExitToLanding}
      />

      {/* Slide-out Cart Drawer */}
      <MarketplaceCartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cartItems={cartItems}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onTrackOrder={(orderId) => {
          setActiveTrackingOrderId(orderId);
          setOrderTrackingModalOpen(true);
        }}
        formatPrice={formatPrice}
      />

      {/* Quick View Product Modal */}
      <MarketplaceQuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={quickViewProduct ? wishlistIds.has(quickViewProduct.id) : false}
        onOpenStorefront={onOpenStorefront}
        formatPrice={formatPrice}
      />

      {/* Slide-out Wishlist Drawer */}
      <MarketplaceWishlistDrawer
        isOpen={wishlistDrawerOpen}
        onClose={() => setWishlistDrawerOpen(false)}
        wishlistItems={wishlistProducts}
        onRemoveFromWishlist={(id) => {
          setWishlistIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          showToast('Removed from wishlist');
        }}
        onMoveToCart={(product) => {
          handleAddToCart(product);
          setWishlistIds((prev) => {
            const next = new Set(prev);
            next.delete(product.id);
            return next;
          });
        }}
        formatPrice={formatPrice}
      />

      {/* Product Comparison Modal */}
      <MarketplaceCompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        compareItems={compareProducts}
        onRemoveFromCompare={(id) => {
          setCompareIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          showToast('Removed from compare list');
        }}
        onAddToCart={handleAddToCart}
        formatPrice={formatPrice}
      />

      {/* Live Order Tracking Modal */}
      <MarketplaceOrderTrackingModal
        isOpen={orderTrackingModalOpen}
        onClose={() => setOrderTrackingModalOpen(false)}
        initialOrderId={activeTrackingOrderId}
      />

      {/* Merchant / Vendor Onboarding Modal */}
      <MarketplaceVendorModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
      />

      {/* Shopper Auth Modal */}
      <MarketplaceAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.name}!`);
        }}
      />

      {/* Mobile Navigation Drawer */}
      <MarketplaceMobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          document.getElementById('marketplace-catalog')?.scrollIntoView({ behavior: 'smooth' });
        }}
        selectedCorridor={selectedCorridor}
        onSelectCorridor={(c) => {
          setSelectedCorridor(c);
          showToast(`Switched delivery zone to ${c}`);
        }}
        currentCurrency={currentCurrency}
        onSelectCurrency={setCurrentCurrency}
        onOpenOrderTracking={() => {
          setActiveTrackingOrderId('NC-9842');
          setOrderTrackingModalOpen(true);
        }}
        onOpenVendorModal={() => setVendorModalOpen(true)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        currentUser={currentUser}
      />

      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="mp-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
