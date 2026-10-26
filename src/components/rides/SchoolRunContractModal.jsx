import React, { useState } from 'react';
import { 
  X, 
  GraduationCap, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Users, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  Lock,
  Sparkles
} from 'lucide-react';
import { SCHOOL_RUN_CONTRACTS_PRESETS } from './ridesData';

export default function SchoolRunContractModal({
  isOpen,
  onClose,
  initialData,
  onActivateContract
}) {
  const [selectedPlan, setSelectedPlan] = useState('keke_weekly');
  const [childrenNames, setChildrenNames] = useState('David & Stephanie Adeleke');
  const [schoolName, setSchoolName] = useState(initialData?.schoolName || 'Corona School, Victoria Island');
  const [parentPhone, setParentPhone] = useState('+234 803 123 4567');
  const [homeAddress, setHomeAddress] = useState(initialData?.pickupAddress || 'Plot 8, Isaac John Street, Ikeja GRA');
  const [morningTime, setMorningTime] = useState(initialData?.morningPickupTime || '07:15');
  const [afternoonTime, setAfternoonDropoffTime] = useState(initialData?.afternoonDropoffTime || '14:30');
  const [contractTerm, setContractTerm] = useState('weekly'); // 'weekly' or 'monthly'
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const currentPreset = SCHOOL_RUN_CONTRACTS_PRESETS.find(p => p.id === selectedPlan) || SCHOOL_RUN_CONTRACTS_PRESETS[0];
  const price = contractTerm === 'weekly' ? currentPreset.priceWeekly : currentPreset.priceMonthly;

  function handleSubmit(e) {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => {
      onActivateContract({
        id: 'SCH-CTR-' + Math.floor(1000 + Math.random() * 9000),
        title: currentPreset.title,
        vehicleEmoji: currentPreset.emoji,
        childrenNames,
        schoolName,
        parentPhone,
        homeAddress,
        morningTime,
        afternoonTime,
        contractTerm,
        rateLocked: price,
        status: 'active',
        assignedDriver: 'Emmanuel Okon (TVS Deluxe · LND-889-BB · Guardian Cleared)',
        activeSince: new Date().toLocaleDateString()
      });
      onClose();
    }, 1500);
  }

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-school-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rd-modal-top">
          <div className="rd-modal-title-group">
            <span className="rd-school-modal-tag">
              <GraduationCap size={13} />
              <span>DEDICATED SCHOOL RUN SUBSCRIPTION</span>
            </span>
            <h3 className="rd-modal-title">
              Recurring Kids Commute Contract
            </h3>
            <p className="rd-modal-sub">
              Monday–Friday trusted daily transit with dedicated background-checked driver and parent SMS handshake OTP.
            </p>
          </div>

          <button 
            type="button" 
            className="rd-modal-close-btn" 
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="rd-school-success-box key-fade">
            <CheckCircle2 size={44} className="text-emerald-500" />
            <h3>School Run Contract Activated!</h3>
            <p>Your dedicated driver (Emmanuel Okon) has been reserved. You will receive an SMS reminder each evening with tomorrow's OTP.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rd-school-modal-body">
            {/* 1. Plan Selector (Maruwa vs Car) */}
            <div className="rd-school-plans-grid">
              {SCHOOL_RUN_CONTRACTS_PRESETS.map((p) => {
                const isSelected = selectedPlan === p.id;
                return (
                  <div
                    key={p.id}
                    className={`rd-school-plan-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedPlan(p.id)}
                  >
                    <div className="rd-plan-top">
                      <span className="text-2xl">{p.emoji}</span>
                      <strong className="rd-plan-title">{p.title}</strong>
                    </div>
                    <p className="rd-plan-sub">{p.recommendedFor}</p>
                    <div className="rd-plan-pricing">
                      <span className="rd-plan-amount">₦{(contractTerm === 'weekly' ? p.priceWeekly : p.priceMonthly).toLocaleString()}</span>
                      <span className="rd-plan-period">/{contractTerm === 'weekly' ? 'week' : 'month'}</span>
                    </div>
                    {isSelected && <span className="rd-plan-check">✓ Selected</span>}
                  </div>
                );
              })}
            </div>

            {/* Billing Term Toggle */}
            <div className="rd-term-toggle-row">
              <button
                type="button"
                className={`rd-term-btn ${contractTerm === 'weekly' ? 'active' : ''}`}
                onClick={() => setContractTerm('weekly')}
              >
                Weekly Billing (Every 5 Days)
              </button>
              <button
                type="button"
                className={`rd-term-btn ${contractTerm === 'monthly' ? 'active' : ''}`}
                onClick={() => setContractTerm('monthly')}
              >
                Monthly Term (Save 10%)
              </button>
            </div>

            {/* 2. Children & School Form Fields */}
            <div className="rd-school-fields-grid">
              <div className="rd-form-field">
                <label>Children's Full Names</label>
                <input
                  type="text"
                  required
                  value={childrenNames}
                  onChange={(e) => setChildrenNames(e.target.value)}
                  placeholder="e.g. Tunde & Kemi Adeleke"
                  className="rd-input"
                />
              </div>

              <div className="rd-form-field">
                <label>Parent / Guardian Phone (for OTP & SMS)</label>
                <input
                  type="tel"
                  required
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="rd-input"
                />
              </div>

              <div className="rd-form-field">
                <label>School Name & Gate</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Corona School, Victoria Island"
                  className="rd-input"
                />
              </div>

              <div className="rd-form-field">
                <label>Home Pickup Address</label>
                <input
                  type="text"
                  required
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="e.g. Plot 8, Isaac John Street, Ikeja GRA"
                  className="rd-input"
                />
              </div>

              <div className="rd-form-field">
                <label>Morning Departure Time</label>
                <input
                  type="time"
                  required
                  value={morningTime}
                  onChange={(e) => setMorningTime(e.target.value)}
                  className="rd-input"
                />
              </div>

              <div className="rd-form-field">
                <label>School Closing Pickup Time</label>
                <input
                  type="time"
                  required
                  value={afternoonTime}
                  onChange={(e) => setAfternoonDropoffTime(e.target.value)}
                  className="rd-input"
                />
              </div>
            </div>

            {/* Escrow & Trust Features */}
            <div className="rd-school-trust-panel">
              <div className="rd-trust-badge-item">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span>Dedicated Driver: Same vetted driver every morning. No random riders.</span>
              </div>
              <div className="rd-trust-badge-item">
                <Lock size={16} className="text-blue-500" />
                <span>Escrow Hold: Funds held in escrow and released weekly only upon your approval.</span>
              </div>
            </div>

            {/* Submit */}
            <div className="rd-school-submit-row">
              <div className="rd-total-col">
                <span className="rd-total-lbl">Total Deposit to Escrow</span>
                <strong className="rd-total-amount">₦{price.toLocaleString()}</strong>
              </div>

              <button type="submit" className="rd-activate-contract-btn">
                <span>Lock In School Run Contract</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
