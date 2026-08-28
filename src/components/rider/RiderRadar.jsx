import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  MapPin, 
  Store, 
  Navigation, 
  Clock, 
  Zap, 
  Check, 
  X,
  Sparkles
} from 'lucide-react';

const mockIncomingTrip = {
  orderId: 'ORD-9821',
  storeName: 'Apex Health Pharmacy',
  storeAddress: 'Plot 12, Isaac John St, Ikeja GRA',
  storePhone: '+234 803 291 0029',
  customerName: 'Amara Kalu',
  customerAddress: 'Apt 4B, Admiralty Way, Lekki Phase 1',
  customerPhone: '+234 802 119 4482',
  distanceKm: '2.4 km',
  estimatedMinutes: 18,
  fare: 1850,
  tip: 300,
  itemsSummary: '1x Amoxicillin 500mg, 1x Vitamin C 1000mg',
  otp: '3819'
};

export default function RiderRadar({ isOnline, onAcceptTrip }) {
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [countdown, setCountdown] = useState(30);

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  // Simulate an incoming trip after rider goes online
  useEffect(() => {
    if (!isOnline) {
      setIncomingOffer(null);
      return;
    }

    const timer = setTimeout(() => {
      setIncomingOffer(mockIncomingTrip);
      setCountdown(30);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isOnline]);

  // Countdown timer for incoming trip offer
  useEffect(() => {
    if (!incomingOffer) return;

    if (countdown > 0) {
      const interval = setInterval(() => setCountdown(c => c - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setIncomingOffer(null); // expired
    }
  }, [incomingOffer, countdown]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Radar Scanner View */}
      <div className="rider-radar-container">
        <span style={{ fontSize: '12px', fontWeight: 800, color: isOnline ? '#27BBAD' : '#737373', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {isOnline ? 'Scanning Neighborhood Corridor (1–3km)...' : 'You are currently offline'}
        </span>

        {isOnline ? (
          <div className="radar-circle-wrap">
            <div className="radar-pulse-ring" />
            <div className="radar-pulse-ring" />
            <div className="radar-pulse-ring" />
            <div className="radar-center-bike">
              <Bike size={32} />
            </div>
          </div>
        ) : (
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '30px 0', color: '#737373' }}>
            <Bike size={36} />
          </div>
        )}

        <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px', color: '#0a0a0a' }}>
          {isOnline ? 'Looking for Instant Store Dispatches' : 'Toggle Online to Start Receiving Trips'}
        </h3>
        <p style={{ fontSize: '13px', color: '#737373', margin: 0, maxWidth: '320px', lineHeight: 1.5 }}>
          {isOnline 
            ? 'Stay within Ikeja GRA corridor for highest trip frequency & 100% tip retention.'
            : 'Turn your duty status ON in the top bar to connect to nearby retail stores.'}
        </p>
      </div>

      {/* Incoming Trip Request Modal / Card */}
      {incomingOffer && (
        <div className="rider-incoming-card">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 800, color: '#27BBAD', background: 'rgba(39, 187, 173, 0.1)', padding: '4px 10px', borderRadius: '100px' }}>
              <Zap size={13} />
              NEW DELIVERY REQUEST
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 800, color: countdown <= 10 ? '#e11d48' : '#0a0a0a' }}>
              <Clock size={14} />
              <span>{countdown}s</span>
            </div>
          </div>

          {/* Guaranteed Fare Big Banner */}
          <div style={{ background: '#0a0a0a', color: '#ffffff', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#a3a3a3', textTransform: 'uppercase', fontWeight: 600 }}>Guaranteed Trip Earning</span>
              <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: '#27BBAD' }}>
                {formatNaira(incomingOffer.fare + incomingOffer.tip)}
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '12px', color: '#a3a3a3' }}>
              <div>{incomingOffer.distanceKm} corridor</div>
              <div style={{ color: '#ffffff', fontWeight: 700 }}>~{incomingOffer.estimatedMinutes} mins</div>
            </div>
          </div>

          {/* Route Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {/* Pickup */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#27BBAD', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <Store size={13} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>Pickup (Store)</div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0a0a0a' }}>{incomingOffer.storeName}</div>
                <div style={{ fontSize: '12px', color: '#737373' }}>{incomingOffer.storeAddress}</div>
              </div>
            </div>

            {/* Dropoff */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#0a0a0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <MapPin size={13} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>Dropoff (Doorstep)</div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0a0a0a' }}>{incomingOffer.customerName}</div>
                <div style={{ fontSize: '12px', color: '#737373' }}>{incomingOffer.customerAddress}</div>
              </div>
            </div>
          </div>

          {/* Accept / Decline Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <button
              onClick={() => setIncomingOffer(null)}
              style={{ padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e5e5', background: '#ffffff', color: '#737373', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Decline
            </button>
            <button
              onClick={() => onAcceptTrip(incomingOffer)}
              style={{ padding: '14px', borderRadius: '12px', border: 'none', background: '#27BBAD', color: '#ffffff', fontSize: '15px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(39, 187, 173, 0.4)', fontFamily: 'inherit' }}
            >
              <Check size={18} />
              <span>Accept Delivery</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
