import React from 'react';
import { Star, CheckCircle, MessageSquareQuote } from 'lucide-react';
import { TESTIMONIALS } from './marketplaceData';

export default function MarketplaceTestimonials() {
  return (
    <section className="mp-testimonials-section">
      <div className="mp-section-title-wrap text-center" style={{ justifyContent: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="mp-section-eyebrow">
          <MessageSquareQuote size={14} className="text-emerald-500" />
          <span>VERIFIED COMMUNITY REVIEWS</span>
        </div>
        <h2 className="mp-section-title">Loved by Neighborhood Shoppers</h2>
        <p className="mp-section-sub">Over 48,000 orders fulfilled with an average delivery time of 19 minutes.</p>
      </div>

      <div className="mp-testimonials-grid">
        {TESTIMONIALS.map((rev) => (
          <div key={rev.id} className="mp-testimonial-card">
            <div className="mp-testimonial-stars">
              {[...Array(rev.rating)].map((_, i) => (
                <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
              ))}
            </div>

            <p className="mp-testimonial-quote">"{rev.comment}"</p>

            <div className="mp-testimonial-author">
              <div className="mp-testimonial-avatar">
                <span>{rev.avatar}</span>
              </div>
              <div className="mp-testimonial-info">
                <div className="mp-author-name-row">
                  <span className="mp-author-name">{rev.name}</span>
                  {rev.verified && (
                    <span className="mp-verified-pill" title="Verified Order">
                      <CheckCircle size={11} /> Verified
                    </span>
                  )}
                </div>
                <span className="mp-author-role">{rev.role}</span>
                <span className="mp-author-store">Purchased from {rev.store}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
