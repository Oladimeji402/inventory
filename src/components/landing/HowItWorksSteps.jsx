import React, { useEffect, useRef } from 'react';
import { Store, Scan, Bike, ArrowRight } from 'lucide-react';
import { appLinks } from '../../config/surfaces';

const steps = [
  {
    num: '01',
    badge: 'Quick Setup',
    icon: Store,
    title: 'Claim Your Dedicated Store Subdomain',
    desc: 'Choose your custom URL (e.g. your-store.stv.com), set up the store profile, and go live in under 2 minutes.',
    actionText: 'Register Store',
  },
  {
    num: '02',
    badge: 'Live Sync',
    icon: Scan,
    title: 'Publish Inventory to a Live Catalog',
    desc: 'Add products or import your inventory. Shelf stock publishes online in real time so nearby shoppers only see what you actually have.',
    actionText: 'See How Sync Works',
  },
  {
    num: '03',
    badge: 'Instant Dispatch',
    icon: Bike,
    title: 'Take Orders & Auto-Dispatch Couriers',
    desc: 'When an order is paid, one tap alerts nearby verified couriers to pick up the pre-bagged parcel for 20-minute delivery.',
    actionText: 'Explore Delivery Fleet',
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
          <span className="lp-eyebrow">The Workflow</span>
          <h2 className="lp-h2">From shelf to doorstep in three frictionless steps.</h2>
          <p className="lp-body" style={{ marginTop: '16px' }}>
            No specialized terminals or complicated setup required. Operate entirely through your browser.
          </p>
        </div>

        <div className="lp-steps-grid lp-reveal lp-reveal-d1">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="lp-step-card">
                <div className="lp-step-top">
                  <span className="lp-step-num font-mono">{s.num}</span>
                  <span className="lp-step-badge">{s.badge}</span>
                </div>

                <div className="lp-step-icon-wrap">
                  <Icon size={22} />
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
