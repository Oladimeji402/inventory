import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';

const faqs = [
  {
    q: 'How does offline mode work when our internet cuts out?',
    a: 'Subtech uses browser-native IndexedDB storage to keep sales operations local. If your Wi-Fi or data connection fails, cashiers can continue barcode scanning, ringing sales, and generating receipts without stoppage. The moment internet connectivity returns, all transactions and inventory adjustments synchronize automatically in the background.'
  },
  {
    q: 'How does the on-demand rider dispatch function?',
    a: 'When an in-store cashier or online customer completes a delivery order, one tap triggers an automated dispatch radar to verified couriers within a 1–3km radius. The closest available rider accepts, arrives to a pre-packaged parcel, and delivers directly with live GPS status updates and an OTP delivery confirmation.'
  },
  {
    q: 'Do I need proprietary POS hardware or dedicated machines?',
    a: 'No. Subtech runs directly in modern web browsers (Chrome, Safari, Edge) on any existing laptop, desktop, iPad, or Android tablet. It integrates seamlessly with standard USB and Bluetooth barcode scanners and thermal receipt printers.'
  },
  {
    q: "What does my store's custom web address look like?",
    a: 'Every registered merchant receives a dedicated branded URL (such as https://your-store.stv.com). This serves as your live digital catalog where neighborhood shoppers can view confirmed shelf stock and place orders directly.'
  },
  {
    q: 'How does Subtech prevent double-selling between counter and online?',
    a: 'Inventory levels are synchronized in real-time. Whenever an item is scanned and sold at your physical till counter, the quantity displayed on your digital catalog decrements instantly. When the last unit is sold, it marks as "Out of Stock" immediately.'
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
