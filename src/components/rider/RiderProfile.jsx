import React from 'react';
import { 
  ShieldCheck, 
  Bike, 
  Phone, 
  MapPin, 
  Award, 
  FileText, 
  ArrowLeft,
  Check,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Car
} from 'lucide-react';
import { RIDER_VEHICLE_PROFILES } from './riderData';

export default function RiderProfile({ profile, currentVehicle = 'okada', onVehicleChange, onExitToLanding }) {
  const activeVehicle = RIDER_VEHICLE_PROFILES.find(v => v.id === currentVehicle) || RIDER_VEHICLE_PROFILES[0];

  return (
    <div className="rider-profile-wrapper" style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 16px 32px' }}>
      {/* Profile Header */}
      <div className="rider-profile-card">
        <div className="rider-profile-avatar-wrap">
          <div className="rider-profile-avatar">
            SO
          </div>
          <div className="rider-avatar-shield">
            <ShieldCheck size={16} />
          </div>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 2px', color: 'var(--rider-text)' }}>
          {profile?.full_name || 'Samuel Olawale'}
        </h2>
        <span className="font-mono" style={{ fontSize: '12px', color: 'var(--rider-text-muted)', display: 'block' }}>
          Courier & Mobility Captain #RDR-284 · Verified Partner
        </span>

        {/* Driver Vital Stats */}
        <div className="rider-profile-stats-row">
          <div className="rider-stat-col">
            <span className="rider-col-label">LIFETIME TRIPS</span>
            <span className="rider-col-val font-mono">1,420</span>
          </div>
          <div className="rider-stat-divider" />
          <div className="rider-stat-col">
            <span className="rider-col-label">SAFETY RATING</span>
            <span className="rider-col-val font-mono" style={{ color: '#F59E0B' }}>4.98 ★</span>
          </div>
          <div className="rider-stat-divider" />
          <div className="rider-stat-col">
            <span className="rider-col-label">ON-TIME RATE</span>
            <span className="rider-col-val font-mono" style={{ color: '#2B7CFF' }}>98.9%</span>
          </div>
        </div>
      </div>

      {/* Switch Active Operating Vehicle Mode */}
      <div className="rider-vehicle-switch-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--rider-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Operating Vehicle
          </span>
          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
            ● Roadworthy Certified
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {RIDER_VEHICLE_PROFILES.map(veh => {
            const isSelected = veh.id === currentVehicle;
            return (
              <button
                key={veh.id}
                onClick={() => onVehicleChange && onVehicleChange(veh.id)}
                className={`rider-veh-select-btn ${isSelected ? 'active' : ''}`}
                aria-pressed={isSelected}
              >
                <span style={{ fontSize: '22px' }}>{veh.emoji}</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? '#2B7CFF' : 'var(--rider-text)' }}>
                  {veh.label}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--rider-card-inner-bg)', borderRadius: '10px', fontSize: '12.5px', color: 'var(--rider-text)' }}>
          <div><strong>Registered Plate:</strong> {activeVehicle.registration}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--rider-text-muted)', marginTop: '2px' }}>{activeVehicle.safetyTag}</div>
        </div>
      </div>

      {/* Verification & Compliance Badges */}
      <div className="rider-compliance-card">
        <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 14px', color: 'var(--rider-text)' }}>
          State Government & Fleet Compliance
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="rider-compliance-row">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rider-text)' }}>Lagos State Riders Permit (LASDRI / VIS)</div>
              <div style={{ fontSize: '11.5px', color: 'var(--rider-text-muted)' }}>License ID: LAS-991829-R · Valid through Dec 2027</div>
            </div>
            <span className="rider-verified-badge">✓ Active</span>
          </div>

          <div className="rider-compliance-row">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rider-text)' }}>Police Criminal Background Clearance</div>
              <div style={{ fontSize: '11.5px', color: 'var(--rider-text-muted)' }}>Fingerprint biometric cleared for School Commutes</div>
            </div>
            <span className="rider-verified-badge">✓ Cleared</span>
          </div>

          <div className="rider-compliance-row">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rider-text)' }}>Assigned Operational Corridor</div>
              <div style={{ fontSize: '11.5px', color: 'var(--rider-text-muted)' }}>Ikeja GRA · Maryland · Allen Avenue · Airport Corridor</div>
            </div>
            <span className="rider-verified-badge" style={{ background: 'rgba(43, 124, 255, 0.1)', color: '#2B7CFF' }}>Primary Hub</span>
          </div>
        </div>
      </div>

      {/* Safety & SOS Support */}
      <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.06)', border: '1.5px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <AlertTriangle size={16} color="#EF4444" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#DC2626' }}>24/7 Roadside Assistance & Emergency Patrol</span>
        </div>
        <p style={{ fontSize: '12px', color: '#7F1D1D', margin: '0 0 10px', lineHeight: 1.4 }}>
          Tire puncture, road accident, or dispatch security concern? Our quick-response mobile patrol is stationed along Ikorodu Rd & Ikeja.
        </p>
        <a href="tel:08007882273" className="rider-sos-action-btn">
          Call Subtech Dispatch Patrol (Free Toll)
        </a>
      </div>

      {/* Exit Button */}
      <button
        onClick={onExitToLanding}
        className="rider-exit-btn"
        aria-label="Sign out and exit rider portal"
      >
        <ArrowLeft size={16} />
        <span>Exit Rider Portal / Sign Out</span>
      </button>
    </div>
  );
}
