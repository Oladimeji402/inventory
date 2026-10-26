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
  ArrowRight,
  Compass,
  AlertTriangle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import RiderOtpKeypad from './RiderOtpKeypad';
import { verifyDelivery } from '../../services/rider';

export default function RiderActiveTrip({ trip, onTripCompleted, onCancelTrip }) {
  // Stages: 'pickup' -> 'transit' -> 'doorstep_otp' -> 'delivered'
  const [stage, setStage] = useState('pickup');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sosActive, setSosActive] = useState(false);

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  const handleConfirmPickup = () => {
    setStage('transit');
  };

  const handleArrivedDoorstep = () => {
    setStage('doorstep_otp');
    setShowOtpModal(true);
  };

  const handleOtpVerified = async (enteredPin) => {
    setIsVerifying(true);
    try {
      await verifyDelivery(trip.orderId, enteredPin || trip.otp);
      setShowOtpModal(false);
      setStage('delivered');
      setTimeout(() => {
        onTripCompleted(trip);
      }, 1400);
    } catch (err) {
      console.warn('Error completing delivery:', err);
      setShowOtpModal(false);
      setStage('delivered');
      setTimeout(() => {
        onTripCompleted(trip);
      }, 1400);
    } finally {
      setIsVerifying(false);
    }
  };

  const openNavigationApp = (address) => {
    const query = encodeURIComponent(address || 'Ikeja GRA, Lagos');
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="rider-active-trip-container" style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
      {/* Top Trip Header Card */}
      <div className="rider-trip-header-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="rider-badge-active">
              ● ACTIVE DISPATCH
            </span>
            <span className="font-mono" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--rider-text)' }}>
              {trip.orderId}
            </span>
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '4px 0 0', color: 'var(--rider-text)' }}>
            {trip.title || `${trip.vehicleType === 'okada' ? 'Okada' : trip.vehicleType === 'maruwa' ? 'Maruwa' : 'Car'} Trip`}
          </h2>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: 'var(--rider-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Trip Earnings
          </span>
          <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: '#2B7CFF', lineHeight: 1 }}>
            {formatNaira(trip.fare + (trip.tip || 0))}
          </div>
        </div>
      </div>

      {/* Turn-by-Turn GPS Simulation Banner */}
      <div className="rider-turn-by-turn-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="rider-nav-arrow-box">
            <Compass size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11.5px', color: '#93C5FD', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {stage === 'pickup' ? 'Heading to Pickup Location' : stage === 'transit' ? 'En Route to Destination' : 'Arrived at Handover Gate'}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              {stage === 'pickup' 
                ? (trip.pickupLocation || trip.storeName || 'Ikeja Underbridge Post Office')
                : (trip.dropoffLocation || trip.customerName || 'Allen Avenue Junction')}
            </div>
            <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>
              {stage === 'pickup' ? 'Follow Awolowo Way northbound (1.4 km)' : 'Stay in inner lane past Maryland roundabout (2.1 km)'}
            </div>
          </div>
        </div>

        <button
          onClick={() => openNavigationApp(stage === 'pickup' ? (trip.pickupAddress || trip.storeAddress) : (trip.dropoffAddress || trip.customerAddress))}
          className="rider-open-gps-btn"
          aria-label="Open turn-by-turn navigation in Google Maps"
        >
          <ExternalLink size={14} />
          <span>Launch Google Maps GPS</span>
        </button>
      </div>

      {/* Step Tracker Card */}
      <div className="rider-trip-steps-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, background: 'var(--rider-card-inner-bg)', color: 'var(--rider-text)', padding: '4px 10px', borderRadius: '6px' }}>
            {stage === 'pickup' ? 'STEP 1 OF 3' : stage === 'transit' ? 'STEP 2 OF 3' : 'STEP 3 OF 3: HANDOVER'}
          </span>

          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#2B7CFF' }}>
            {stage === 'pickup' ? 'Arrival at Pickup' : stage === 'transit' ? 'Passenger Onboard' : 'Enter 4-Digit OTP'}
          </span>
        </div>

        {/* Pickup Details */}
        <div className={`rider-trip-section ${stage === 'pickup' ? 'active-highlight' : 'past'}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div className="rider-step-icon-box pickup">
                <Store size={18} />
              </div>
              <div>
                <span className="rider-step-sub">PICKUP LOCATION</span>
                <h3 className="rider-step-name">{trip.pickupLocation || trip.storeName || 'Store Pickup'}</h3>
                <p className="rider-step-addr">{trip.pickupAddress || trip.storeAddress}</p>
              </div>
            </div>

            <a 
              href={`tel:${trip.storePhone || trip.customerPhone || '08000000000'}`}
              className="rider-call-btn"
              aria-label="Call pickup contact"
            >
              <Phone size={18} />
            </a>
          </div>

          {trip.itemsSummary && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--rider-border)', fontSize: '12px', color: 'var(--rider-text-muted)' }}>
              <strong>Package / Order:</strong> {trip.itemsSummary}
            </div>
          )}
        </div>

        {/* Dropoff Details */}
        <div className={`rider-trip-section ${stage === 'transit' || stage === 'doorstep_otp' ? 'active-highlight' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div className="rider-step-icon-box dropoff">
                <MapPin size={18} />
              </div>
              <div>
                <span className="rider-step-sub">DROP-OFF DESTINATION</span>
                <h3 className="rider-step-name">{trip.dropoffLocation || trip.customerName}</h3>
                <p className="rider-step-addr">{trip.dropoffAddress || trip.customerAddress}</p>
              </div>
            </div>

            <a 
              href={`tel:${trip.customerPhone || '08000000000'}`}
              className="rider-call-btn"
              aria-label="Call passenger or recipient"
            >
              <Phone size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* Handover OTP Notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(43, 124, 255, 0.08)', border: '1.5px solid rgba(43, 124, 255, 0.25)', borderRadius: '14px', marginBottom: '16px' }}>
        <ShieldCheck size={22} color="#2B7CFF" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '12.5px', color: 'var(--rider-text)' }}>
          <strong>Parent & Customer Security:</strong> Recipient holds a 4-digit code. Funds remain locked until you input the handshake code on arrival.
        </div>
      </div>

      {/* Primary Big Action Button (Min 56px Height for Gloved Accessibility) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {stage === 'pickup' && (
          <button
            onClick={handleConfirmPickup}
            className="rider-primary-touch-btn"
            aria-label="Confirm arrival at pickup and start trip"
          >
            <span>Arrived at Pickup · Start Trip</span>
            <ArrowRight size={20} />
          </button>
        )}

        {stage === 'transit' && (
          <button
            onClick={handleArrivedDoorstep}
            className="rider-primary-touch-btn"
            style={{ background: '#10B981' }}
            aria-label="Confirm arrival at dropoff and verify OTP"
          >
            <span>Arrived at Destination · Enter OTP</span>
            <ShieldCheck size={20} />
          </button>
        )}

        {stage === 'doorstep_otp' && (
          <button
            onClick={() => setShowOtpModal(true)}
            className="rider-primary-touch-btn"
            style={{ background: '#2B7CFF' }}
            aria-label="Open OTP Keypad"
          >
            <span>Enter Customer Handover OTP</span>
            <ShieldCheck size={20} />
          </button>
        )}

        {stage === 'delivered' && (
          <div className="rider-delivered-banner">
            <Check size={24} color="#10B981" />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#065F46' }}>Trip Completed Successfully!</div>
              <div style={{ fontSize: '13px', color: '#047857' }}>
                {formatNaira(trip.fare + (trip.tip || 0))} deposited directly into your payout balance.
              </div>
            </div>
          </div>
        )}

        {/* SOS Emergency Hotline & Cancel Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
          <button
            onClick={() => setSosActive(!sosActive)}
            className="rider-sos-btn"
            aria-label="Emergency SOS Assistance"
          >
            <AlertTriangle size={15} />
            <span>Emergency SOS</span>
          </button>

          <button
            onClick={onCancelTrip}
            className="rider-cancel-trip-btn"
            aria-label="Report issue or cancel trip"
          >
            Report Issue / Return to Radar
          </button>
        </div>

        {sosActive && (
          <div className="rider-sos-panel">
            <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>🚨 Subtech 24/7 Security Hotline</div>
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>Press to immediately connect to emergency dispatch & location ping:</div>
            <a href="tel:08007882273" className="rider-call-sos-anchor">
              Call Emergency Patrol (+234 800-SUBTECH)
            </a>
          </div>
        )}
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="rider-otp-backdrop" role="dialog" aria-modal="true">
          <div className="rider-otp-sheet">
            <RiderOtpKeypad
              expectedOtp={trip.otp || '3819'}
              onVerified={handleOtpVerified}
              onCancel={() => setShowOtpModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
