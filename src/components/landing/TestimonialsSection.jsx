import React, { useEffect, useRef } from 'react';
import { Star, Store, Bike, MapPin } from 'lucide-react';

const testimonials = [
  {
    name: 'Adeola Balogun',
    role: 'MD, Horizon Supermarkets',
    location: 'Victoria Island, Lagos',
    type: 'store',
    stat: '+42%',
    statDesc: 'Order volume within 60 days',
    quote: 'Neighbors order from our store URL now. Stock is accurate, and riders pick up paid orders without us living in WhatsApp.',
  },
  {
    name: 'Chinedu Eze',
    role: 'Lead Pharmacist, MedCare Pharmacy',
    location: 'Ikeja GRA, Lagos',
    type: 'store',
    stat: '100%',
    statDesc: 'Prescription inventory accuracy',
    quote: 'Patients needing urgent medications can see confirmed in-stock items on our subdomain. A verified rider delivers directly to their location in under 20 minutes.',
  },
  {
    name: 'Tunde Bakare',
    role: 'Courier Fleet Lead (2,400+ Trips)',
    location: 'Surulere / Yaba Corridor',
    type: 'rider',
    stat: '₦380k+',
    statDesc: 'Monthly earnings (top corridor)',
    quote: 'On Subtech, parcels are already packaged and paid at the counter before I arrive. I batch multiple pickups in the same plaza and spend zero time waiting in queues.',
  }
];

export default function TestimonialsSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.lp-reveal') || [];
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.1 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="testimonials" className="lp-section lp-testimonials-section" ref={sectionRef}>
      <div className="lp-container">
        <div className="lp-section-header-center lp-reveal">
          <span className="lp-eyebrow">From Early Adopters</span>
          <h2 className="lp-h2">What store owners and couriers are saying.</h2>
          <p className="lp-body" style={{ marginTop: '16px' }}>
            Feedback from the first wave of pharmacy owners, supermarket managers, and delivery riders on the platform.
          </p>
        </div>

        <div className="lp-testimonials-grid lp-reveal lp-reveal-d1">
          {testimonials.map((t, i) => (
            <div key={i} className="lp-testimonial-card">
              {/* Star Rating */}
              <div className="lp-star-row">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={15} fill="#2B7CFF" color="#2B7CFF" />
                ))}
              </div>

              {/* Highlight Metric */}
              <div className="lp-testimonial-stat-row">
                <span className="lp-testimonial-stat font-mono">{t.stat}</span>
                <span className="lp-testimonial-stat-desc">{t.statDesc}</span>
              </div>

              {/* Quote */}
              <p className="lp-testimonial-quote">"{t.quote}"</p>

              {/* Author Footer */}
              <div className="lp-testimonial-author">
                <div className="lp-author-avatar font-mono">
                  {t.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div>
                  <div className="lp-author-name">{t.name}</div>
                  <div className="lp-author-role">
                    <MapPin size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                    {t.role} · {t.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
