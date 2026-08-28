import React, { useState, useEffect, useRef } from 'react';
import { Store, Bike, TrendingUp, Coins, ArrowRight } from 'lucide-react';

export default function InteractiveCalculator({ onOpenStoreModal, onOpenRiderModal }) {
  const [calcType, setCalcType] = useState('merchant'); // 'merchant' | 'rider'
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

  // Merchant State
  const [monthlyRevenue, setMonthlyRevenue] = useState(3500000); // in Naira
  const [deliverySharePct, setDeliverySharePct] = useState(35); // 35%
  const [traditionalFeePct, setTraditionalFeePct] = useState(25); // 25% aggregator fee

  // Calculations for Merchant
  const deliverySales = monthlyRevenue * (deliverySharePct / 100);
  const aggregatorLoss = deliverySales * (traditionalFeePct / 100);
  const subtechCost = deliverySales * 0.035; // Flat ~3.5% software & transaction fee
  const merchantMonthlySavings = aggregatorLoss - subtechCost;
  const merchantAnnualSavings = merchantMonthlySavings * 12;

  // Rider State
  const [deliveriesPerDay, setDeliveriesPerDay] = useState(14);
  const [avgPayoutPerTrip, setAvgPayoutPerTrip] = useState(1600); // ₦1,600
  const [workingDays, setWorkingDays] = useState(24);

  // Calculations for Rider
  const riderMonthlyGross = deliveriesPerDay * avgPayoutPerTrip * workingDays;
  const estimatedTipsMonthly = deliveriesPerDay * 300 * workingDays;
  const riderTotalMonthly = riderMonthlyGross + estimatedTipsMonthly;

  const formatNaira = (num) => {
    return '₦' + Math.round(num).toLocaleString();
  };

  return (
    <section id="calculator" className="lp-section lp-calculator-section" ref={sectionRef}>
      <div className="lp-container">
        {/* Header without pill */}
        <div className="lp-section-header-center lp-reveal">
          <span className="lp-eyebrow">Unit Economics</span>
          <h2 className="lp-h2">Calculate your actual profit advantage.</h2>
          <p className="lp-body" style={{ marginTop: '16px' }}>
            See how much more revenue your business retains with direct storefronts and native dispatches versus 25–30% aggregator commissions.
          </p>

          {/* Mode Switcher */}
          <div className="lp-segmented-control" style={{ marginTop: '32px' }}>
            <button
              className={`lp-segment-btn ${calcType === 'merchant' ? 'active' : ''}`}
              onClick={() => setCalcType('merchant')}
            >
              <Store size={16} />
              <span>Store Savings</span>
            </button>
            <button
              className={`lp-segment-btn ${calcType === 'rider' ? 'active' : ''}`}
              onClick={() => setCalcType('rider')}
            >
              <Bike size={16} />
              <span>Courier Earnings</span>
            </button>
          </div>
        </div>

        {/* Calculator Main Box */}
        <div className="lp-calc-box lp-reveal lp-reveal-d1">
          {calcType === 'merchant' ? (
            <div className="lp-calc-grid">
              {/* Sliders Side */}
              <div className="lp-calc-inputs">
                <div className="lp-calc-group">
                  <div className="lp-calc-label-row">
                    <label className="lp-calc-label">Monthly Gross Sales:</label>
                    <span className="lp-calc-val font-mono">
                      {formatNaira(monthlyRevenue)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500000}
                    max={20000000}
                    step={250000}
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                    className="lp-range-slider"
                  />
                  <div className="lp-calc-limits">
                    <span>₦500k</span>
                    <span>₦10M</span>
                    <span>₦20M+</span>
                  </div>
                </div>

                <div className="lp-calc-group">
                  <div className="lp-calc-label-row">
                    <label className="lp-calc-label">Delivered Orders (% of Total):</label>
                    <span className="lp-calc-val font-mono">
                      {deliverySharePct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={deliverySharePct}
                    onChange={(e) => setDeliverySharePct(Number(e.target.value))}
                    className="lp-range-slider"
                  />
                  <div className="lp-calc-limits">
                    <span>10% (mostly counter)</span>
                    <span>50%</span>
                    <span>90% (heavy delivery)</span>
                  </div>
                </div>

                <div className="lp-calc-group">
                  <div className="lp-calc-label-row">
                    <label className="lp-calc-label">Aggregator Commission You Currently Pay:</label>
                    <span className="lp-calc-val font-mono" style={{ color: '#e11d48' }}>
                      {traditionalFeePct}% per order
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={35}
                    step={1}
                    value={traditionalFeePct}
                    onChange={(e) => setTraditionalFeePct(Number(e.target.value))}
                    className="lp-range-slider"
                  />
                  <div className="lp-calc-limits">
                    <span>15%</span>
                    <span>25% (industry avg)</span>
                    <span>35%</span>
                  </div>
                </div>
              </div>

              {/* Output Result Side */}
              <div className="lp-calc-results">
                <div className="lp-calc-results-header">
                  <TrendingUp size={18} color="#27BBAD" />
                  <span className="lp-calc-results-eyebrow">Projected Annual Margin Retained</span>
                </div>

                <div className="lp-calc-big-stat">
                  <span className="lp-calc-big-num font-mono">
                    {formatNaira(merchantAnnualSavings)}
                  </span>
                  <span className="lp-calc-big-sub">Retained per year with your Subtech storefront</span>
                </div>

                <div className="lp-calc-breakdown">
                  <div className="lp-calc-breakdown-row">
                    <span>Aggregator Cut (Lost Monthly):</span>
                    <span className="font-mono" style={{ color: '#e11d48', fontWeight: 600 }}>
                      -{formatNaira(aggregatorLoss)}/mo
                    </span>
                  </div>
                  <div className="lp-calc-breakdown-row">
                    <span>Subtech Platform Fee:</span>
                    <span className="font-mono" style={{ color: '#27BBAD', fontWeight: 600 }}>
                      {formatNaira(subtechCost)}/mo
                    </span>
                  </div>
                  <div className="lp-calc-breakdown-total">
                    <span>Net Monthly Profit Kept:</span>
                    <span className="font-mono" style={{ color: '#27BBAD', fontWeight: 800, fontSize: '17px' }}>
                      +{formatNaira(merchantMonthlySavings)}/mo
                    </span>
                  </div>
                </div>

                <button 
                  className="lp-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onOpenStoreModal()}
                >
                  <span>Start Keeping Your Margin</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="lp-calc-grid">
              {/* Rider Sliders Side */}
              <div className="lp-calc-inputs">
                <div className="lp-calc-group">
                  <div className="lp-calc-label-row">
                    <label className="lp-calc-label">Completed Deliveries Per Day:</label>
                    <span className="lp-calc-val font-mono">
                      {deliveriesPerDay} trips / day
                    </span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={35}
                    step={1}
                    value={deliveriesPerDay}
                    onChange={(e) => setDeliveriesPerDay(Number(e.target.value))}
                    className="lp-range-slider"
                  />
                  <div className="lp-calc-limits">
                    <span>4 trips (part-time)</span>
                    <span>18 trips</span>
                    <span>35 trips (full-time)</span>
                  </div>
                </div>

                <div className="lp-calc-group">
                  <div className="lp-calc-label-row">
                    <label className="lp-calc-label">Average Payout Per Delivery:</label>
                    <span className="lp-calc-val font-mono">
                      {formatNaira(avgPayoutPerTrip)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={3500}
                    step={100}
                    value={avgPayoutPerTrip}
                    onChange={(e) => setAvgPayoutPerTrip(Number(e.target.value))}
                    className="lp-range-slider"
                  />
                  <div className="lp-calc-limits">
                    <span>₦1,000 (short drop)</span>
                    <span>₦2,000</span>
                    <span>₦3,500 (heavy/rush)</span>
                  </div>
                </div>

                <div className="lp-calc-group">
                  <div className="lp-calc-label-row">
                    <label className="lp-calc-label">Active Working Days Per Month:</label>
                    <span className="lp-calc-val font-mono">
                      {workingDays} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={30}
                    step={1}
                    value={workingDays}
                    onChange={(e) => setWorkingDays(Number(e.target.value))}
                    className="lp-range-slider"
                  />
                  <div className="lp-calc-limits">
                    <span>8 days (weekends)</span>
                    <span>20 days</span>
                    <span>30 days</span>
                  </div>
                </div>
              </div>

              {/* Rider Output Result Side */}
              <div className="lp-calc-results">
                <div className="lp-calc-results-header">
                  <Coins size={18} color="#27BBAD" />
                  <span className="lp-calc-results-eyebrow">Estimated Monthly Courier Payout</span>
                </div>

                <div className="lp-calc-big-stat">
                  <span className="lp-calc-big-num font-mono">
                    {formatNaira(riderTotalMonthly)}
                  </span>
                  <span className="lp-calc-big-sub">Estimated net take-home earnings per month</span>
                </div>

                <div className="lp-calc-breakdown">
                  <div className="lp-calc-breakdown-row">
                    <span>Trip Delivery Fares:</span>
                    <span className="font-mono" style={{ fontWeight: 600, color: 'var(--lp-text)' }}>
                      {formatNaira(riderMonthlyGross)}
                    </span>
                  </div>
                  <div className="lp-calc-breakdown-row">
                    <span>Estimated Tips (100% Yours):</span>
                    <span className="font-mono" style={{ color: '#27BBAD', fontWeight: 600 }}>
                      +{formatNaira(estimatedTipsMonthly)}
                    </span>
                  </div>
                  <div className="lp-calc-breakdown-total">
                    <span>Daily Average Rate:</span>
                    <span className="font-mono" style={{ color: '#27BBAD', fontWeight: 800, fontSize: '17px' }}>
                      {formatNaira(riderTotalMonthly / workingDays)} / day
                    </span>
                  </div>
                </div>

                <button 
                  className="lp-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onOpenRiderModal()}
                >
                  <span>Apply to Ride With Subtech</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
