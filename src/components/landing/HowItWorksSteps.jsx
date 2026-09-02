import React, { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { appLinks } from '../../config/surfaces';

const steps = [
  {
    num: '01',
    badge: 'Two Minutes',
    title: 'Pick your shop\'s web address',
    desc: 'Choose a link like your-shop.stv.com and fill in your shop details. That\'s it — you\'re live.',
    actionText: 'Register My Shop',
  },
  {
    num: '02',
    badge: 'Stays Accurate',
    title: 'Add what you sell',
    desc: 'Add your products, or import your stock list. Whatever you have on the shelf is what shoppers see online.',
    actionText: 'See How It Stays Accurate',
  },
  {
    num: '03',
    badge: 'Automatic',
    title: 'Get paid, riders handle the rest',
    desc: 'When someone pays for an order, a nearby rider is notified automatically to pick it up and deliver it.',
    actionText: 'See The Delivery Side',
  }
];

export default function HowItWorksSteps() {
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

  const handleAction = (idx) => {
    if (idx === 0) window.location.href = appLinks.merchantSignup();
    else if (idx === 1) document.querySelector('#live-demo')?.scrollIntoView({ behavior: 'smooth' });
    else document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="how-it-works" className="lp-section lp-how-section" ref={sectionRef}>
      <div className="lp-container">
        <div className="lp-section-header-center lp-reveal">
          <span className="lp-eyebrow">How It Works</span>
          <h2 className="lp-h2">From shelf to doorstep in three steps.</h2>
          <p className="lp-body" style={{ marginTop: '16px' }}>
            No special till or hardware needed. It all runs from your phone or computer's browser.
          </p>
        </div>

        <div className="lp-steps-grid lp-reveal lp-reveal-d1">
          {steps.map((s, i) => {
            return (
              <div key={s.num} className="lp-step-card">
                <div className="lp-step-top">
                  <span className="lp-step-num">{s.num}</span>
                  <span className="lp-step-badge">{s.badge}</span>
                </div>

                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>

                <button className="lp-step-action-btn" onClick={() => handleAction(i)}>
                  <span>{s.actionText}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
