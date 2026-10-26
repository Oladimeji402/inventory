import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  ShoppingBag,
  Flame,
  Star
} from 'lucide-react';

const slides = [
  {
    id: 'slide-tech',
    tag: 'AUTHORISED MEGA SALE',
    headline: 'Next-Gen Sound & High-Power Gear',
    subheadline: 'Up to 35% off Anker noise-cancelling headphones and laptop powerbanks with 1-year warranty.',
    ctaText: 'Explore Tech Deals',
    categoryTarget: 'electronics',
    badge: '35% OFF THIS WEEKEND',
    accentColor: '#3B82F6',
    bgGradient: 'linear-gradient(135deg, #091322 0%, #0d2347 50%, #1e3a8a 100%)',
    illustrationEmoji: '🎧',
    stats: ['Verified Tech Stores', '15–20m Dispatch', '1-Yr Warranty']
  },
  {
    id: 'slide-pharma',
    tag: 'COLD-CHAIN HEALTHCARE',
    headline: 'Licensed Pharmacies & Family Wellness',
    subheadline: 'NAFDAC-certified prescription antibiotics, pediatric care, and immune supplements delivered securely.',
    ctaText: 'Shop Pharmacy',
    categoryTarget: 'pharmacy',
    badge: '100% GENUINE GUARANTEE',
    accentColor: '#10B981',
    bgGradient: 'linear-gradient(135deg, #041f17 0%, #064e3b 50%, #047857 100%)',
    illustrationEmoji: '💊',
    stats: ['Dispensing Pharmacists', 'Tamper-Proof Seals', 'Doctor Approved']
  },
  {
    id: 'slide-groceries',
    tag: 'FARM TO DOORSTEP',
    headline: 'Organic Harvest & Morning Hearth Treats',
    subheadline: 'Jos Plateau avocados, dairy-free almond milk, and 72-layer butter croissants baked at dawn.',
    ctaText: 'Shop Fresh Daily',
    categoryTarget: 'supermarket',
    badge: 'FRESH ARRIVALS TODAY',
    accentColor: '#F59E0B',
    bgGradient: 'linear-gradient(135deg, #261604 0%, #78350f 50%, #b45309 100%)',
    illustrationEmoji: '🥐',
    stats: ['Temperature Controlled', 'Farm Direct', 'Crisp Quality']
  }
];

export default function MarketplaceHeroSlider({ 
  onSelectCategory, 
  onSelectProduct, 
  onAddToCart,
  flashDealProduct,
  formatPrice 
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const slide = slides[currentSlide];

  return (
    <div className="mp-hero-section">
      <div className="mp-hero-grid">
        {/* Main Interactive Carousel */}
        <div 
          className="mp-hero-slider-card"
          style={{ background: slide.bgGradient }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Subtle Ambient Glow */}
          <div 
            className="mp-hero-glow"
            style={{ background: `radial-gradient(circle, ${slide.accentColor}33 0%, transparent 70%)` }}
          />

          <div className="mp-hero-content">
            <div className="mp-hero-badge-pill" style={{ borderColor: `${slide.accentColor}55`, color: slide.accentColor }}>
              <Sparkles size={12} />
              <span>{slide.tag}</span>
            </div>

            <h1 className="mp-hero-headline">
              {slide.headline}
            </h1>

            <p className="mp-hero-subtext">
              {slide.subheadline}
            </p>

            <div className="mp-hero-stats-row">
              {slide.stats.map((stat) => (
                <div key={stat} className="mp-hero-stat-badge">
                  <ShieldCheck size={13} style={{ color: slide.accentColor }} />
                  <span>{stat}</span>
                </div>
              ))}
            </div>

            <div className="mp-hero-cta-group">
              <button
                type="button"
                className="mp-hero-primary-btn"
                style={{ background: slide.accentColor }}
                onClick={() => onSelectCategory(slide.categoryTarget)}
              >
                <span>{slide.ctaText}</span>
                <ArrowRight size={16} />
              </button>
              <div className="mp-hero-promo-badge">
                {slide.badge}
              </div>
            </div>
          </div>

          {/* Graphic / Visual on Right Side of Slide */}
          <div className="mp-hero-visual">
            <div className="mp-hero-emoji-bubble">
              <span className="mp-big-emoji">{slide.illustrationEmoji}</span>
              <div className="mp-hero-pulse-ring" style={{ borderColor: slide.accentColor }} />
            </div>
          </div>

          {/* Slider Prev & Next Controls */}
          <button
            type="button"
            className="mp-slider-nav-btn prev"
            onClick={() => setCurrentSlide((currentSlide - 1 + slides.length) % slides.length)}
            aria-label="Previous Slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="mp-slider-nav-btn next"
            onClick={() => setCurrentSlide((currentSlide + 1) % slides.length)}
            aria-label="Next Slide"
          >
            <ChevronRight size={20} />
          </button>

          {/* Dots Indicator */}
          <div className="mp-slider-dots">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                className={`mp-slider-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                style={idx === currentSlide ? { background: slide.accentColor, width: '28px' } : {}}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Side Promo Tiles */}
        <div className="mp-hero-side-tiles">
          {/* Tile 1: Featured Flash Item */}
          <div className="mp-side-tile mp-side-tile-1">
            <div className="mp-side-tile-badge">
              <Flame size={12} className="text-red-500 animate-pulse" />
              <span>FLASH SPECIAL</span>
            </div>
            <div className="mp-side-tile-body">
              <div className="mp-side-tile-text">
                <span className="mp-side-tile-sub">Volt Tech Hub</span>
                <h4>Anker 24,000mAh 65W Fast Bank</h4>
                <div className="mp-side-tile-price">
                  <span className="mp-current-price">{formatPrice(34000)}</span>
                  <span className="mp-old-price">{formatPrice(48000)}</span>
                </div>
              </div>
              <div className="mp-side-tile-thumb" style={{ background: '#dbeafe' }}>
                <span>🔋</span>
                <span className="mp-discount-tag">-29%</span>
              </div>
            </div>
            <button
              type="button"
              className="mp-side-tile-btn"
              onClick={() => {
                if (flashDealProduct) onSelectProduct(flashDealProduct);
              }}
            >
              <span>View Deal</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Tile 2: Fresh Morning Bakery / Pharmacy */}
          <div className="mp-side-tile mp-side-tile-2">
            <div className="mp-side-tile-badge mp-badge-fresh">
              <Sparkles size={12} className="text-amber-500" />
              <span>BAKED AT 6:00 AM</span>
            </div>
            <div className="mp-side-tile-body">
              <div className="mp-side-tile-text">
                <span className="mp-side-tile-sub">Gourmet Bakeries</span>
                <h4>Golden Butter Croissants (Pack of 4)</h4>
                <div className="mp-side-tile-price">
                  <span className="mp-current-price">{formatPrice(3800)}</span>
                  <span className="mp-old-price">{formatPrice(5000)}</span>
                </div>
              </div>
              <div className="mp-side-tile-thumb" style={{ background: '#fef3c7' }}>
                <span>🥐</span>
                <span className="mp-discount-tag">-24%</span>
              </div>
            </div>
            <button
              type="button"
              className="mp-side-tile-btn"
              onClick={() => onSelectCategory('bakery')}
            >
              <span>Order Breakfast</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
