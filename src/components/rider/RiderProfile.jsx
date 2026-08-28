import React from 'react';
import { 
  ShieldCheck, 
  Bike, 
  Phone, 
  MapPin, 
  Award, 
  FileText, 
  ArrowLeft,
  Check
} from 'lucide-react';

export default function RiderProfile({ onExitToLanding }) {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      {/* Profile Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#27BBAD', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, margin: '0 auto 12px' }}>
          SO
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0a0a0a' }}>Samuel Olawale</h2>
          <ShieldCheck size={18} color="#27BBAD" />
        </div>
        <span className="font-mono" style={{ fontSize: '12px', color: '#737373', display: 'block', marginTop: '2px' }}>
          Courier ID: RIDER-284 · Ikeja GRA Node
        </span>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Lifetime Trips</div>
            <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800 }}>642</div>
          </div>
          <div style={{ width: '1px', background: '#e5e5e5' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Safety Rating</div>
            <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>4.95 ★</div>
          </div>
          <div style={{ width: '1px', background: '#e5e5e5' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>On-Time Rate</div>
            <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: '#27BBAD' }}>98.4%</div>
          </div>
        </div>
      </div>

      {/* Vehicle & Verification Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px', color: '#0a0a0a' }}>
          Vehicle & Compliance
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#737373' }}>Vehicle Registered</span>
            <strong>Yamaha YBR 125cc (Lagos: KJA-482-XD)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#737373' }}>Riders License</span>
            <strong style={{ color: '#27BBAD' }}>✓ Verified (Active)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#737373' }}>Thermal Delivery Box</span>
            <strong style={{ color: '#27BBAD' }}>✓ Inspected (Approved)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#737373' }}>Assigned Corridor</span>
            <strong>Ikeja GRA · Maryland · Allen Avenue</strong>
          </div>
        </div>
      </div>

      {/* Exit Button */}
      <button
        onClick={onExitToLanding}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: '1.5px solid #e5e5e5',
          background: '#ffffff',
          color: '#0a0a0a',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontFamily: 'inherit'
        }}
      >
        <ArrowLeft size={16} />
        <span>Exit Rider Portal</span>
      </button>
    </div>
  );
}
