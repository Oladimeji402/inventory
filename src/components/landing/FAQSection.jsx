import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';

const faqs = [
  {
    q: "What does my store's custom web address look like?",
    a: 'Every registered merchant receives a dedicated branded URL (such as https://your-store.stv.com). This is your live catalog where neighborhood shoppers can view confirmed stock and place orders.'
  },
  {
    q: 'How does the on-demand rider dispatch function?',
    a: 'When a customer completes a delivery order, one tap triggers an automated dispatch radar to verified couriers within a 1–3km radius. The closest available rider accepts, arrives to a pre-packaged parcel, and delivers with live GPS and an OTP confirmation.'
  },
  {
    q: 'How does Subtech keep online stock accurate?',
    a: 'Inventory is a single catalog. When an item sells — online or in-store — the quantity on your storefront updates immediately. When the last unit is gone, it marks as out of stock.'
  },
  {
    q: 'Do I need a till or special hardware to start?',
    a: 'No. The storefront, backoffice, and rider dispatch run in a modern browser. A counter till is an optional add-on later if you want in-store checkout — it is not required to go live.'
  },
  {
    q: 'How do couriers receive payments, and what fees apply?',
    a: 'Couriers receive clear per-trip payments based on distance and order density. Payouts are automated directly to the rider\'s connected Nigerian bank account or mobile wallet. Riders keep 100% of customer tips and pay zero monthly software subscription fees.'
  }
];

export default function FAQSection() {
  const [open, setOpen] = useState(0);
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
    <section id="faq" className="lp-section lp-faq-section" ref={sectionRef}>
      <div className="lp-container">
        <div className="lp-section-header-center lp-reveal">
          <span className="lp-eyebrow">Common Questions</span>
          <h2 className="lp-h2">Frequently asked questions.</h2>
          <p className="lp-body" style={{ marginTop: '16px' }}>
            Everything you need to know about setting up your storefront, inventory sync, and delivery dispatch.
          </p>
        </div>

        <div className="lp-faq-list lp-reveal lp-reveal-d1">
          {faqs.map((faq, i) => (
            <div key={i} className={`lp-faq-item ${open === i ? 'open' : ''}`}>
              <button
                className="lp-faq-question-btn"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="lp-faq-question-text">{faq.q}</span>
                <div className="lp-faq-toggle-icon">
                  <Plus size={16} />
                </div>
              </button>
              <div className="lp-faq-answer-container">
                <div className="lp-faq-answer-content">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
