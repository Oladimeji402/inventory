import React, { useState } from 'react';
import { 
  Phone, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Share2, 
  AlertCircle, 
  Clock, 
  Car, 
  Bike, 
  ChevronRight,
  KeyRound,
  Sparkles
} from 'lucide-react';

export default function ActiveTripCard({
  trip,
  onCompleteTrip,
  onCancelTrip
}) {
  const [currentStage, setCurrentStage] = useState('en_route'); // 'en_route', 'arrived', 'in_transit', 'completed'
  const [copiedLink, setCopiedLink] = useState(false);

  function advanceStage() {
    if (currentStage === 'en_route') setCurrentStage('arrived');
    else if (currentStage === 'arrived') setCurrentStage('in_transit');
    else if (currentStage === 'in_transit') {
      setCurrentStage('completed');
      setTimeout(() => onCompleteTrip(trip.id), 1200);
    }
  }

  function handleShareTrip() {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const stageLabels = {
    en_route: { label: 'Rider En Route to Pickup', color: '#3B82F6', eta: '3–5 mins' },
    arrived: { label: 'Rider Arrived at Gate', color: '#F59E0B', eta: 'Waiting outside' },
    in_transit: { label: 'In Transit to Destination', color: '#10B981', eta: 'Trip underway' },
    completed: { label: 'Trip Completed & Verified', color: '#10B981', eta: 'Safe arrival' }
  };

  const stage = stageLabels[currentStage];

  return (
    <div className="rd-active-trip-card key-fade">
      {/* Top Status Header */}
      <div className="rd-trip-header">
        <div className="rd-trip-status-pill" style={{ background: `${stage.color}15`, color: stage.color, borderColor: `${stage.color}40` }}>
          <span className="rd-pulse-dot" style={{ background: stage.color }} />
          <span>{stage.label}</span>
        </div>
        <span className="rd-trip-eta">{stage.eta}</span>
      </div>

      {/* Driver & Vehicle Detail */}
      <div className="rd-trip-driver-box">
        <div className="rd-driver-avatar-circle">
          <span className="text-3xl">{trip.assignedRider.avatar}</span>
          <span className="rd-driver-veh-badge">
            {trip.assignedRider.vehicleType === 'okada' && '🏍️'}
            {trip.assignedRider.vehicleType === 'maruwa' && '🛺'}
            {trip.assignedRider.vehicleType === 'car' && '🚗'}
          </span>
        </div>

        <div className="rd-driver-meta-col">
          <div className="rd-driver-title-row">
            <h4 className="rd-driver-fullname">{trip.assignedRider.name}</h4>
            <span className="rd-fare-locked">₦{trip.agreedFare.toLocaleString()} Locked</span>
          </div>

          <div className="rd-driver-vehicle-text">
            <span>{trip.assignedRider.vehicleModel}</span>
            <strong className="rd-plate-badge">{trip.assignedRider.plateNumber}</strong>
          </div>

          <div className="rd-driver-badges-inline">
            <span className="rd-verified-chip">
              <ShieldCheck size={11} className="text-emerald-500" />
              <span>Verified Rider</span>
            </span>
            <span className="rd-rating-chip">⭐ {trip.assignedRider.rating} ({trip.assignedRider.tripsCount} trips)</span>
          </div>
        </div>

        <div className="rd-driver-call-col">
          <a
            href={`tel:${trip.assignedRider.phone}`}
            className="rd-call-driver-btn"
            title="Call Driver"
          >
            <Phone size={18} />
          </a>
        </div>
      </div>

      {/* Safety Handshake OTP Banner (Crucial for School Runs & Errands) */}
      <div className="rd-otp-banner">
        <div className="rd-otp-left">
          <div className="rd-otp-icon-wrap">
            <KeyRound size={16} />
          </div>
          <div>
            <span className="rd-otp-label">HANDOVER SECURITY OTP</span>
            <p className="rd-otp-desc">
              {trip.serviceMode === 'school_run' 
                ? 'School security & driver verify this code on pickup & drop-off.' 
                : 'Give this code to your driver to begin journey.'}
            </p>
          </div>
        </div>

        <div className="rd-otp-digits-box">
          <span className="rd-otp-code">{trip.otpCode}</span>
        </div>
      </div>

      {/* Route Coordinates */}
      <div className="rd-trip-route-display">
        <div className="rd-route-node">
          <span className="rd-dot pickup" />
          <div className="rd-node-text">
            <span className="rd-node-sub">PICKUP</span>
            <strong>{trip.pickupAddress}</strong>
          </div>
        </div>
        <div className="rd-route-node">
          <span className="rd-dot dropoff" />
          <div className="rd-node-text">
            <span className="rd-node-sub">DESTINATION</span>
            <strong>{trip.dropoffAddress}</strong>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Controls for Pair Programming & Testing */}
      <div className="rd-trip-actions-row">
        <button
          type="button"
          className="rd-advance-stage-btn"
          onClick={advanceStage}
        >
          <span>
            {currentStage === 'en_route' && 'Simulate: Driver Arrived at Gate'}
            {currentStage === 'arrived' && 'Simulate: Journey Started'}
            {currentStage === 'in_transit' && 'Simulate: Safe Arrival & Complete'}
            {currentStage === 'completed' && 'Trip Completed'}
          </span>
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          className="rd-share-trip-btn"
          onClick={handleShareTrip}
          title="Share live GPS link to WhatsApp"
        >
          <Share2 size={14} />
          <span>{copiedLink ? 'Copied Link!' : 'Share Live GPS'}</span>
        </button>
      </div>
    </div>
  );
}
