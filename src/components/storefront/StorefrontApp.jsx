import React, { useState, useMemo } from 'react';
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

const defaultStoreProfile = {
  name: 'Apex Health Pharmacy',
  slug: 'apex-pharmacy',
  category: 'Pharmacy & Healthcare',
  rating: '4.9',
  reviewsCount: '340',
  address: 'Plot 12, Isaac John St, Ikeja GRA, Lagos',
  deliveryTime: '18–25 mins',
  minOrder: '₦1,500',
  whatsapp: '+234 803 291 0029'
};

const defaultCatalog = [
  {
    id: 'PROD-01',
    name: 'Amoxicillin 500mg (20 Capsules)',
    category: 'Antibiotics',
    price: 3800,
    stock: 45,
    rating: '4.9',
    emoji: '💊'
  },
  {
    id: 'PROD-02',
    name: 'Paracetamol Extra (Pack of 10)',
    category: 'Pain Relief',
    price: 1200,
    stock: 60,
    rating: '4.8',
    emoji: '💊'
  },
  {
    id: 'PROD-03',
    name: 'Vitamin C 1000mg Effervescent (20s)',
    category: 'Supplements',
    price: 4500,
    stock: 14,
    rating: '4.9',
    emoji: '🍊'
  },
  {
    id: 'PROD-04',
    name: 'Baby Care Gentle Moisturizer (500ml)',
    category: 'Personal Care',
    price: 6200,
    stock: 22,
    rating: '4.7',
    emoji: '🧴'
  },
  {
    id: 'PROD-05',
    name: 'Digital Blood Pressure Monitor',
    category: 'Medical Devices',
    price: 24500,
    stock: 6,
    rating: '4.9',
    emoji: '🩺'
  },
  {
    id: 'PROD-06',
    name: 'First Aid Antiseptic Liquid (250ml)',
    category: 'First Aid',
    price: 2100,
    stock: 18,
    rating: '4.6',
    emoji: '🩹'
  },
  {
    id: 'PROD-07',
    name: 'Omega-3 Triple Strength Fish Oil (60s)',
    category: 'Supplements',
    price: 8900,
    stock: 12,
    rating: '4.8',
    emoji: '🐟'
  },
  {
    id: 'PROD-08',
    name: 'Hydrating Facial Sunscreen SPF 50+',
    category: 'Personal Care',
    price: 7400,
    stock: 9,
    rating: '4.9',
    emoji: '☀️'
  }
];

export default function StorefrontApp({ 
  storeProfile = defaultStoreProfile, 
  onExitToLanding 
}) {
  const [catalog, setCatalog] = useState(defaultCatalog);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

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

  return (
    <div className="storefront-root">
      {/* Sticky Top Header */}
      <StorefrontHeader 
        storeProfile={storeProfile}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onExitToLanding={onExitToLanding}
      />

      {/* Store Banner & Meta Card */}
      <div className="sf-banner">
        <div className="sf-banner-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#27BBAD', background: 'rgba(39, 187, 173, 0.1)', padding: '3px 10px', borderRadius: '100px' }}>
                {storeProfile.category}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12.5px', fontWeight: 700, color: '#f59e0b' }}>
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                {storeProfile.rating} ({storeProfile.reviewsCount}+ reviews)
              </span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 2px', letterSpacing: '-0.02em', color: '#0a0a0a' }}>
              {storeProfile.name}
            </h2>

            <div className="sf-banner-meta">
              <div className="sf-banner-meta-item">
                <MapPin size={13} color="#27BBAD" />
                <span>{storeProfile.address}</span>
              </div>
              <div className="sf-banner-meta-item">
                <Clock size={13} color="#27BBAD" />
                <span>Delivery: {storeProfile.deliveryTime}</span>
              </div>
            </div>
          </div>

          <a 
            href={`https://wa.me/${storeProfile.whatsapp.replace(/[^0-9]/g, '')}`} 
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
        </div>
      </div>

      {/* Search & Category Pills Bar */}
      <div className="sf-controls">
        {/* Search */}
        <div className="sf-search-box">
          <Search size={16} color="#a3a3a3" />
          <input
            type="text"
            placeholder="Search catalog items (e.g. Paracetamol, Vitamin C)..."
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
            <span style={{ background: '#27BBAD', color: '#ffffff', padding: '3px 8px', borderRadius: '100px', fontSize: '12px', fontWeight: 800 }}>
              {totalCartCount} items
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>
              View Bag · {formatNaira(totalCartPrice)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#27BBAD' }}>
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
      />

      {/* Order Confirmed & Real-Time Tracking Modal */}
      {confirmedOrder && (
        <StorefrontOrderSuccess
          order={confirmedOrder}
          onClose={() => setConfirmedOrder(null)}
          onBackToStore={() => setConfirmedOrder(null)}
        />
      )}
    </div>
  );
}
