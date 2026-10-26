import React, { useState } from 'react';
import { 
  Store, 
  CheckCircle, 
  Star, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Heart,
  ExternalLink,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { VENDORS, PRODUCTS } from './marketplaceData';

export default function MarketplaceVendorsShowcase({
  onOpenStorefront,
  onSelectProduct,
  formatPrice
}) {
  const [followedMap, setFollowedMap] = useState({});

  function toggleFollow(e, vendorId) {
    e.stopPropagation();
    setFollowedMap((prev) => ({
      ...prev,
      [vendorId]: !prev[vendorId]
    }));
  }

  return (
    <section className="mp-vendors-section" id="all-vendors">
      <div className="mp-section-title-wrap">
        <div>
          <div className="mp-section-eyebrow">
            <Store size={14} className="text-blue-500" />
            <span>VERIFIED MULTI-VENDOR DIRECTORY</span>
          </div>
          <h2 className="mp-section-title">Top Rated Neighborhood Merchants</h2>
          <p className="mp-section-sub">Licensed pharmacies, authorized tech distributors, and local artisanal producers.</p>
        </div>
      </div>

      <div className="mp-vendors-grid">
        {VENDORS.map((vendor) => {
          const isFollowed = !!followedMap[vendor.id];
          // Get up to 3 products belonging to this vendor
          const vendorProds = PRODUCTS.filter((p) => p.storeId === vendor.id).slice(0, 3);

          return (
            <div 
              key={vendor.id} 
              className="mp-vendor-card"
              onClick={() => onOpenStorefront(vendor.slug)}
            >
              {/* Cover Banner */}
              <div 
                className="mp-vendor-cover"
                style={{ background: vendor.bannerGradient }}
              >
                <div className="mp-vendor-cover-overlay" />
                <div className="mp-vendor-cover-top">
                  <span className="mp-vendor-eta-pill">
                    <Clock size={12} />
                    <span>{vendor.deliveryTime}</span>
                  </span>
                  <button
                    type="button"
                    className={`mp-vendor-follow-btn ${isFollowed ? 'following' : ''}`}
                    onClick={(e) => toggleFollow(e, vendor.id)}
                  >
                    <Heart size={12} className={isFollowed ? 'fill-red-500 text-red-500' : ''} />
                    <span>{isFollowed ? 'Following' : 'Follow'}</span>
                  </button>
                </div>
              </div>

              {/* Vendor Info Section */}
              <div className="mp-vendor-body">
                {/* Avatar with Verified Badge */}
                <div className="mp-vendor-avatar-wrap">
                  <div 
                    className="mp-vendor-avatar"
                    style={{ background: vendor.avatarBg }}
                  >
                    <span>{vendor.avatarEmoji}</span>
                  </div>
                  {vendor.verified && (
                    <div className="mp-vendor-verified-badge" title="Verified Merchant">
                      <CheckCircle size={14} />
                    </div>
                  )}
                </div>

                {/* Vendor Header Text */}
                <div className="mp-vendor-meta">
                  <div className="mp-vendor-name-row">
                    <h3 className="mp-vendor-title">{vendor.name}</h3>
                  </div>
                  <div className="mp-vendor-category-tag">{vendor.category}</div>
                  <p className="mp-vendor-bio">{vendor.tagline}</p>
                </div>

                {/* Rating & Address */}
                <div className="mp-vendor-specs-row">
                  <div className="mp-vendor-rating-box">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span className="mp-vendor-score">{vendor.rating}</span>
                    <span className="mp-vendor-revs">({vendor.reviewsCount})</span>
                  </div>
                  <div className="mp-vendor-location">
                    <MapPin size={12} />
                    <span>{vendor.corridor.split('&')[0]}</span>
                  </div>
                </div>

                {/* Live Shelf Product Previews */}
                <div className="mp-vendor-prods-preview">
                  <span className="mp-vendor-preview-title">Popular from Shelf:</span>
                  <div className="mp-vendor-mini-prods-row">
                    {vendorProds.map((prod) => (
                      <div 
                        key={prod.id} 
                        className="mp-vendor-mini-prod"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(prod);
                        }}
                        title={prod.name}
                      >
                        <div className="mp-mini-prod-img" style={{ background: prod.bgGradient }}>
                          <span>{prod.emoji}</span>
                        </div>
                        <div className="mp-mini-prod-info">
                          <span className="mp-mini-prod-name">{prod.name}</span>
                          <span className="mp-mini-prod-price">{formatPrice(prod.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mp-vendor-actions-row">
                  <button
                    type="button"
                    className="mp-vendor-visit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStorefront(vendor.slug);
                    }}
                  >
                    <span>Visit Storefront</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
