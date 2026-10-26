import React, { useState } from 'react';
import { 
  GraduationCap, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Phone, 
  ArrowRight,
  Filter,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SCHOOL_CONTRACTS } from './riderData';

export default function RiderSchoolContracts({ isOnline }) {
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'maruwa' | 'car'
  const [appliedContracts, setAppliedContracts] = useState({});
  const [toastMsg, setToastMsg] = useState('');

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  const filteredContracts = SCHOOL_CONTRACTS.filter(contract => {
    if (selectedFilter === 'all') return true;
    return contract.vehicleRequested === selectedFilter;
  });

  const handleApply = (contractId, familyName) => {
    setAppliedContracts(prev => ({
      ...prev,
      [contractId]: true
    }));
    setToastMsg(`Application sent to ${familyName}! Escrow contract will activate once parent reviews your driver credentials.`);
    setTimeout(() => setToastMsg(''), 5000);
  };

  return (
    <div className="rider-contracts-container" style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 16px 32px' }}>
      {/* High-Value School Commute Banner */}
      <div className="rider-contract-hero-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F59E0B', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={18} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#F59E0B' }}>
            Daily School Run Contracts Hub
          </span>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: '#ffffff', lineHeight: 1.3 }}>
          Guaranteed Mon–Fri Income with Escrow Protection
        </h2>
        <p style={{ fontSize: '13px', color: '#d4d4d4', margin: '0 0 14px', lineHeight: 1.5 }}>
          Parents in your corridor are looking for trusted, verified drivers for morning school drops & afternoon pickups. Earn between <strong>₦25,000 to ₦48,000 every week</strong> deposited safely into Escrow.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11.5px', color: '#fef08a' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(254, 240, 138, 0.15)', padding: '4px 8px', borderRadius: '6px' }}>
            <ShieldCheck size={13} />
            Handshake SMS OTP with Parent
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(254, 240, 138, 0.15)', padding: '4px 8px', borderRadius: '6px' }}>
            <Calendar size={13} />
            Weekly Friday Cashout
          </span>
        </div>
      </div>

      {toastMsg && (
        <div className="rider-toast" style={{ margin: '14px 0', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1.5px solid #10B981', borderRadius: '12px', color: '#065F46', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Filter Chips (Vehicle) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '18px 0 14px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          className={`rider-chip-filter ${selectedFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('all')}
        >
          All Requests ({SCHOOL_CONTRACTS.length})
        </button>
        <button
          className={`rider-chip-filter ${selectedFilter === 'maruwa' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('maruwa')}
        >
          🛺 Maruwa (Keke)
        </button>
        <button
          className={`rider-chip-filter ${selectedFilter === 'car' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('car')}
        >
          🚗 Private AC Car
        </button>
      </div>

      {/* Contract Listings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredContracts.map(contract => {
          const isApplied = appliedContracts[contract.id];

          return (
            <div key={contract.id} className="rider-contract-card">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span className="rider-badge-vehicle">
                      {contract.vehicleLabel}
                    </span>
                    <span style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>
                      {contract.childrenSummary}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--rider-text)' }}>
                    {contract.family}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#737373', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span>Parent: {contract.parentName}</span>
                    <span>·</span>
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>{contract.parentRating} ★</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>Weekly Retainer</div>
                  <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
                    {formatNaira(contract.weeklyRate)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#737373' }}>
                    {formatNaira(contract.monthlyRate)}/month
                  </div>
                </div>
              </div>

              {/* Corridor & Times */}
              <div className="rider-contract-route-box">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#2B7CFF', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0, marginTop: '2px' }}>
                    A
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#737373', fontSize: '11px', display: 'block', fontWeight: 700 }}>HOME PICKUP</span>
                    <strong>{contract.homePickup}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0, marginTop: '2px' }}>
                    B
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#737373', fontSize: '11px', display: 'block', fontWeight: 700 }}>SCHOOL DROP-OFF</span>
                    <strong>{contract.schoolDestination}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--rider-border)', fontSize: '12px', color: 'var(--rider-text)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} color="#2B7CFF" />
                    <span>{contract.morningTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} color="#10B981" />
                    <span>{contract.afternoonTime}</span>
                  </div>
                </div>
              </div>

              {/* Safety Requirements */}
              <div style={{ margin: '12px 0 16px' }}>
                <span style={{ fontSize: '11px', color: '#737373', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Safety Escrow Terms
                </span>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--rider-text)', lineHeight: 1.5 }}>
                  {contract.securityTerms.map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ul>
              </div>

              {/* 56px Big Touch Target Action Button */}
              <button
                className={`rider-primary-btn ${isApplied ? 'applied' : ''}`}
                onClick={() => handleApply(contract.id, contract.family)}
                disabled={isApplied}
                style={{
                  height: '56px',
                  width: '100%',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isApplied ? 'default' : 'pointer',
                  background: isApplied ? '#10B981' : 'var(--rider-btn-bg, #0a0a0a)',
                  color: '#ffffff',
                  border: 'none',
                  fontFamily: 'inherit'
                }}
              >
                {isApplied ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Application Submitted (Pending Parent Review)</span>
                  </>
                ) : (
                  <>
                    <span>Apply for {contract.family} School Commute</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
