import React, { useState, useMemo } from 'react';
import './Marketplace.css';
import MarketplaceHeader from './MarketplaceHeader';
import MarketplaceStoresGrid from './MarketplaceStoresGrid';
import MarketplaceTrending from './MarketplaceTrending';
import { 
  Zap, 
  Store, 
  Bike, 
  ShieldCheck, 
  ShoppingBag,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const corridorList = [
  'Ikeja GRA & Maryland',
  'Lekki Phase 1 & Admiralty',
  'Victoria Island & Ikoyi',
  'Yaba Tech & Surulere'
];

const mockStores = [
  {
    id: 'STORE-1',
    name: 'Apex Health Pharmacy',
    slug: 'apex-pharmacy',
    category: 'Pharmacy & Wellness',
    emoji: '💊',
    rating: '4.9',
    deliveryTime: '18–25 mins',
    address: 'Plot 12, Isaac John St, Ikeja GRA',
    corridor: 'Ikeja GRA & Maryland'
  },
  {
    id: 'STORE-2',
    name: 'GreenGrocer Organic Mart',
    slug: 'greengrocer',
    category: 'Supermarket & Food',
    emoji: '🥑',
    rating: '4.8',
    deliveryTime: '20–30 mins',
    address: '14 Joel Ogunnaike St, Ikeja GRA',
    corridor: 'Ikeja GRA & Maryland'
  },
  {
    id: 'STORE-3',
    name: 'Volt Tech & Audio Hub',
    slug: 'volt-tech',
    category: 'Consumer Electronics',
    emoji: '🎧',
    rating: '4.9',
    deliveryTime: '15–20 mins',
    address: 'Plot 8, Allen Avenue, Ikeja',
    corridor: 'Ikeja GRA & Maryland'
  },
  {
    id: 'STORE-4',
    name: 'MedPlus Express Lekki',
    slug: 'medplus-lekki',
    category: 'Pharmacy & Wellness',
    emoji: '🏥',
    rating: '4.9',
    deliveryTime: '15–22 mins',
    address: 'Admiralty Way, Lekki Phase 1',
    corridor: 'Lekki Phase 1 & Admiralty'
  },
  {
    id: 'STORE-5',
    name: 'Gourmet Bakeries & Treats',
    slug: 'gourmet-bakery',
    category: 'Bakery & Confectionery',
    emoji: '🥐',
    rating: '4.7',
    deliveryTime: '18–25 mins',
    address: 'Plot 22, Fola Osibo St, Lekki 1',
    corridor: 'Lekki Phase 1 & Admiralty'
  },
  {
    id: 'STORE-6',
    name: 'BeautyLuxe Cosmetics',
    slug: 'beautyluxe',
    category: 'Beauty & Skincare',
    emoji: '💄',
    rating: '4.8',
    deliveryTime: '20–30 mins',
    address: 'Ahmadu Bello Way, Victoria Island',
    corridor: 'Victoria Island & Ikoyi'
  }
];

const mockTrendingProducts = [
  { id: 'T-1', name: 'Amoxicillin 500mg (20 Caps)', price: 3800, storeName: 'Apex Health Pharmacy', storeSlug: 'apex-pharmacy', emoji: '💊', corridor: 'Ikeja GRA & Maryland' },
  { id: 'T-2', name: 'Almond Milk Cold-Pressed 1L', price: 4500, storeName: 'GreenGrocer Organic', storeSlug: 'greengrocer', emoji: '🥛', corridor: 'Ikeja GRA & Maryland' },
  { id: 'T-3', name: 'Anker Power Bank 20,000mAh', price: 28000, storeName: 'Volt Tech Hub', storeSlug: 'volt-tech', emoji: '🔋', corridor: 'Ikeja GRA & Maryland' },
  { id: 'T-4', name: 'Vitamin C 1000mg Effervescent', price: 4500, storeName: 'Apex Health Pharmacy', storeSlug: 'apex-pharmacy', emoji: '🍊', corridor: 'Ikeja GRA & Maryland' },
  { id: 'T-5', name: 'Fresh Butter Croissants (Pack of 4)', price: 3200, storeName: 'Gourmet Bakeries', storeSlug: 'gourmet-bakery', emoji: '🥐', corridor: 'Lekki Phase 1 & Admiralty' },
  { id: 'T-6', name: 'Hydrating Sunscreen SPF 50+', price: 7400, storeName: 'MedPlus Express', storeSlug: 'medplus-lekki', emoji: '☀️', corridor: 'Lekki Phase 1 & Admiralty' }
];

export default function MarketplaceApp({ onOpenStorefront, onExitToLanding }) {
  const [selectedCorridor, setSelectedCorridor] = useState('Ikeja GRA & Maryland');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { label: 'All Stores', key: 'All' },
    { label: 'Pharmacies & Health', key: 'Pharmacy & Wellness' },
    { label: 'Supermarkets & Food', key: 'Supermarket & Food' },
    { label: 'Electronics & Audio', key: 'Consumer Electronics' },
    { label: 'Bakeries & Cafes', key: 'Bakery & Confectionery' },
    { label: 'Beauty & Skincare', key: 'Beauty & Skincare' },
  ];

  const filteredStores = useMemo(() => {
    return mockStores.filter(store => {
      const matchesCorridor = store.corridor === selectedCorridor;
      const matchesCategory = selectedCategory === 'All' || store.category === selectedCategory;
      const matchesSearch = !searchTerm || store.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCorridor && matchesCategory && matchesSearch;
    });
  }, [selectedCorridor, selectedCategory, searchTerm]);

  const filteredTrending = useMemo(() => {
    return mockTrendingProducts.filter(p => p.corridor === selectedCorridor);
  }, [selectedCorridor]);

  return (
    <div className="marketplace-root">
      {/* Top Header */}
      <MarketplaceHeader
        selectedCorridor={selectedCorridor}
        onSelectCorridor={setSelectedCorridor}
        corridorList={corridorList}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onExitToLanding={onExitToLanding}
      />

      {/* Hero Promo Banner */}
      <div className="mp-promo-banner">
        <div className="mp-promo-card">
          <div style={{ maxWidth: '480px' }}>
            <span className="mp-promo-badge">
              <Zap size={13} />
              Hyperlocal 1–3km Corridor Delivery
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '10px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Everything in {selectedCorridor.split('&')[0]} delivered in under 30 minutes.
            </h2>
            <p style={{ fontSize: '13.5px', color: '#a3a3a3', margin: 0, lineHeight: 1.5 }}>
              Browse real shelf inventory from pharmacies, supermarkets, and specialty shops near you.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.06)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#27BBAD', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bike size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700 }}>Direct Courier Radar</div>
              <div style={{ fontSize: '12px', color: '#27BBAD' }}>Verified neighborhood riders on duty</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="mp-categories-bar">
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`mp-cat-btn ${selectedCategory === cat.key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.key)}
          >
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Local Stores Grid */}
      <MarketplaceStoresGrid
        stores={filteredStores}
        onSelectStore={(store) => {
          if (onOpenStorefront) onOpenStorefront(store.slug);
        }}
      />

      {/* Trending Items Aggregator */}
      <MarketplaceTrending
        products={filteredTrending}
        onSelectProductStore={(slug) => {
          if (onOpenStorefront) onOpenStorefront(slug);
        }}
      />
    </div>
  );
}
