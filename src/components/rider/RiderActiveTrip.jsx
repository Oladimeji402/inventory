import React, { useState } from 'react';
import { 
  Store, 
  MapPin, 
  Phone, 
  Navigation, 
  Check, 
  Package, 
  Bike, 
  ShieldCheck,
  Clock,
  ArrowRight
} from 'lucide-react';
import RiderOtpKeypad from './RiderOtpKeypad';

export default function RiderActiveTrip({ trip, onTripCompleted, onCancelTrip }) {
  // Stages: 'pickup' -> 'transit' -> 'doorstep_otp' -> 'delivered'
  const [stage, setStage] = useState('pickup');
  const [showOtpModal, setShowOtpModal] = useState(false);

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  const handleConfirmPickup = () => {
    setStage('transit');
  };

  const handleArrivedDoorstep = () => {
    setStage('doorstep_otp');
    setShowOtpModal(true);
  };

  const handleOtpVerified = () => {
    setShowOtpModal(false);
    setStage('delivered');
    setTimeout(() => {
      onTripCompleted(trip);
    }, 1200);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      {/* Top Trip Header Bar */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e5e5e5', borderRadius: '16px', padding: '18px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Delivery
          </span>
          <h3 className="font-mono" style={{ fontSize: '17px', fontWeight: 800, margin: '2px 0 0', color: '#0a0a0a' }}>
            {trip.orderId}
          </h3>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>Trip Earnings</span>
          <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#2B7CFF' }}>
            {formatNaira(trip.fare)}
          </div>
        </div>
      </div>

      {/* Step Tracker Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ 
            fontSize: '11.5px', 
            fontWeight: 800, 
            background: '#0a0a0a', 
            color: '#ffffff', 
            padding: '2px 8px', 
            borderRadius: '6px' 
          }}>
            {stage === 'pickup' ? 'STEP 1' : stage === 'transit' ? 'STEP 2' : 'STEP 3'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0a0a0a' }}>
            {stage === 'pickup' ? 'Pickup at Merchant Store' : stage === 'transit' ? 'In Transit to Customer' : 'Doorstep Handover'}
          </span>
        </div>

        {/* Pickup Section */}
        <div style={{ 
          padding: '14px', 
          background: stage === 'pickup' ? 'rgba(43, 124, 255, 0.05)' : '#fafafa', 
          border: '1.5px solid', 
          borderColor: stage === 'pickup' ? '#2B7CFF' : '#f0f0f0', 
          borderRadius: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#2B7CFF', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Store size={16} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>Pickup Location</span>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '2px 0 0', color: '#0a0a0a' }}>{trip.storeName}</h4>
                <p style={{ fontSize: '12px', color: '#525252', margin: '2px 0 0' }}>{trip.storeAddress}</p>
              </div>
            </div>

            <a 
              href={`tel:${trip.storePhone || '08000000000'}`}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e5e5e5', background: '#ffffff', color: '#0a0a0a', textDecoration: 'none' }}
            >
              <Phone size={14} />
            </a>
          </div>

          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e5e5e5', fontSize: '12px', color: '#525252' }}>
            <strong>Package:</strong> {trip.itemsSummary}
          </div>
        </div>

        {/* Dropoff Section */}
        <div style={{ 
          padding: '14px', 
          background: stage === 'transit' || stage === 'doorstep_otp' ? 'rgba(43, 124, 255, 0.05)' : '#fafafa', 
          border: '1.5px solid', 
          borderColor: stage === 'transit' || stage === 'doorstep_otp' ? '#2B7CFF' : '#f0f0f0', 
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0a0a0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={16} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>Dropoff Destination</span>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '2px 0 0', color: '#0a0a0a' }}>{trip.customerName}</h4>
                <p style={{ fontSize: '12px', color: '#525252', margin: '2px 0 0' }}>{trip.customerAddress}</p>
              </div>
            </div>

            <a 
              href={`tel:${trip.customerPhone || '08000000000'}`}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e5e5e5', background: '#ffffff', color: '#0a0a0a', textDecoration: 'none' }}
            >
              <Phone size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Main Big Touch Action Button */}
      {stage === 'pickup' && (
        <button
          onClick={handleConfirmPickup}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            background: '#2B7CFF',
            color: '#ffffff',
            border: 'none',
            fontSize: '15.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(43, 124, 255, 0.35)',
            fontFamily: 'inherit'
          }}
        >
          <Check size={18} />
          <span>Confirm Package Collected</span>
        </button>
      )}

      {stage === 'transit' && (
        <button
          onClick={handleArrivedDoorstep}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            background: '#0a0a0a',
            color: '#ffffff',
            border: 'none',
            fontSize: '15.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            fontFamily: 'inherit'
          }}
        >
          <Navigation size={18} />
          <span>Arrived at Customer Doorstep</span>
        </button>
      )}

      {stage === 'doorstep_otp' && (
        <button
          onClick={() => setShowOtpModal(true)}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            background: '#2B7CFF',
            color: '#ffffff',
            border: 'none',
            fontSize: '15.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(43, 124, 255, 0.35)',
            fontFamily: 'inherit'
          }}
        >
          <ShieldCheck size={18} />
          <span>Enter 4-Digit Handover OTP</span>
        </button>
      )}

      {/* OTP Input Modal Overlay */}
      {showOtpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <RiderOtpKeypad 
            expectedOtp={trip.otp || '3819'}
            onVerified={handleOtpVerified}
            onCancel={() => setShowOtpModal(false)}
          />
        </div>
      )}
    </div>
  );
}
