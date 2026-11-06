import React, { useEffect, useState, useMemo } from 'react';
import './Storefront.css';
import StorefrontHeader from './StorefrontHeader';
import StorefrontProductCard from './StorefrontProductCard';
import StorefrontCartDrawer from './StorefrontCartDrawer';
import StorefrontOrderSuccess from './StorefrontOrderSuccess';
import { 
  Search, 
  MapPin, 
  Clock, 
  Phone, 
  Star, 
  ShieldCheck, 
  ShoppingBag,
  Sparkles,
  Store
} from 'lucide-react';

import { fetchStorefrontStore, fetchStorefrontCatalog } from '../../services/storefront';

export default function StorefrontApp({
  storeSlug,
  onExitToLanding,
  customer = null,
  onTrackOrder
}) {
  const [profile, setProfile] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadStore() {
      if (!storeSlug) return;
      setLoading(true);
      const [remoteStore, remoteProducts] = await Promise.all([
        fetchStorefrontStore(storeSlug),
        fetchStorefrontCatalog(storeSlug)
      ]);
      if (cancelled) return;
      setProfile(remoteStore || null);
      setCatalog(Array.isArray(remoteProducts) ? remoteProducts : []);
      setLoading(false);
    }
    loadStore();
    return () => { cancelled = true; };
  }, [storeSlug]);

  // Cart operations
  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.id !== productId));
    } else {
      setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
    }
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleCheckoutComplete = (newOrder) => {
    setConfirmedOrder(newOrder);
    setCart([]);
    setIsCartOpen(false);
  };

  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalCartPrice = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(catalog.map(c => c.category)));
    return ['All', ...unique];
  }, [catalog]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return catalog.filter(p => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [catalog, searchTerm, selectedCategory]);

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  if (loading) {
    return <div className="storefront-root" aria-busy="true" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#737373' }}>Loading store…</div>;
  }

  if (!profile) {
    return (
      <div className="storefront-root" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <Store size={36} color="#a3a3a3" />
          <h1 style={{ fontSize: 22, margin: '12px 0 6px' }}>This store is not available</h1>
          <p style={{ color: '#737373', margin: '0 0 18px' }}>It may be closed, suspended, or the link may be wrong.</p>
          {onExitToLanding && <button type="button" className="sf-cart-btn" onClick={onExitToLanding}>Back</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="storefront-root">
      {/* Sticky Top Header */}
      <StorefrontHeader 
        storeProfile={profile}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onExitToLanding={onExitToLanding}
      />

      {/* Store Banner & Meta Card */}
      <div className="sf-banner">
        <div className="sf-banner-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#2B7CFF', background: 'rgba(43, 124, 255, 0.1)', padding: '3px 10px', borderRadius: '100px' }}>
                {profile.category}
              </span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 2px', letterSpacing: '-0.02em', color: '#0a0a0a' }}>
              {profile.name}
            </h2>

            <div className="sf-banner-meta">
              <div className="sf-banner-meta-item">
                <MapPin size={13} color="#2B7CFF" />
                <span>{profile.address}</span>
              </div>
              {profile.deliveryTime && (
                <div className="sf-banner-meta-item">
                  <Clock size={13} color="#2B7CFF" />
                  <span>Delivery: {profile.deliveryTime}</span>
                </div>
              )}
            </div>
          </div>

          {(profile.whatsapp || '').replace(/[^0-9]/g, '') && (
          <a 
            href={`https://wa.me/${(profile.whatsapp || '').replace(/[^0-9]/g, '')}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              background: '#25D366',
              color: '#ffffff',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <Phone size={14} />
            <span>Chat on WhatsApp</span>
          </a>
          )}
        </div>
      </div>

      {/* Search & Category Pills Bar */}
      <div className="sf-controls">
        {/* Search */}
        <div className="sf-search-box">
          <Search size={16} color="#a3a3a3" />
          <input
            type="text"
            placeholder="Search products"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sf-search-input"
          />
        </div>

        {/* Category Pills */}
        <div className="sf-categories">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`sf-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog Grid */}
      <main className="sf-products-container">
        {filteredProducts.length === 0 && (
          <p style={{ textAlign: 'center', color: '#737373', padding: '48px 0' }}>
            {catalog.length === 0 ? 'This store has no products in stock right now.' : 'No products match your search.'}
          </p>
        )}
        <div className="sf-product-grid">
          {filteredProducts.map((p) => {
            const cartItem = cart.find(i => i.id === p.id);
            const qty = cartItem ? cartItem.quantity : 0;
            return (
              <StorefrontProductCard
                key={p.id}
                product={p}
                quantityInCart={qty}
                onAddToCart={handleAddToCart}
                onUpdateQuantity={handleUpdateQuantity}
              />
            );
          })}
        </div>
      </main>

      {/* Sticky Bottom Cart Floating Pill (When Cart has items) */}
      {totalCartCount > 0 && (
        <div className="sf-bottom-bar" onClick={() => setIsCartOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#2B7CFF', color: '#ffffff', padding: '3px 8px', borderRadius: '100px', fontSize: '12px', fontWeight: 800 }}>
              {totalCartCount} items
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>
              View Bag · {formatNaira(totalCartPrice)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#2B7CFF' }}>
            <span>Checkout</span>
            <span>→</span>
          </div>
        </div>
      )}

      {/* Slide-over Cart Drawer */}
      <StorefrontCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onCheckoutComplete={handleCheckoutComplete}
        storeSlug={storeSlug}
        storeProfile={profile}
        customer={customer}
      />

      {/* Order Confirmed & Real-Time Tracking Modal */}
      {confirmedOrder && (
        <StorefrontOrderSuccess
          order={confirmedOrder}
          onTrackOrder={customer && onTrackOrder ? () => onTrackOrder(confirmedOrder.id) : null}
          onClose={() => setConfirmedOrder(null)}
          onBackToStore={() => setConfirmedOrder(null)}
        />
      )}
    </div>
  );
}
