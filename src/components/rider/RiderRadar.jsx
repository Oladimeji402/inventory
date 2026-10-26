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
  Sparkles,
  Phone,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { INITIAL_DISPATCHES } from './riderData';
import { fetchAvailableDispatches } from '../../services/rider';

export default function RiderRadar({ isOnline, onAcceptTrip, selectedVehicle = 'all' }) {
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [activeVehicleFilter, setActiveVehicleFilter] = useState(selectedVehicle);
  const [customCounter, setCustomCounter] = useState(null);
  const [counterSentToast, setCounterSentToast] = useState('');

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  // Load incoming dispatches when online
  useEffect(() => {
    if (!isOnline) {
      setIncomingOffer(null);
      return;
    }

    let isMounted = true;
    const checkDispatches = async () => {
      try {
        const res = await fetchAvailableDispatches();
        if (!isMounted) return;
        const list = res?.data || INITIAL_DISPATCHES;
        // Filter by vehicle if not 'all'
        const matches = list.filter(item => 
          activeVehicleFilter === 'all' || item.vehicleType === activeVehicleFilter
        );
        if (matches.length > 0) {
          setIncomingOffer(matches[0]);
          setCustomCounter(null);
          setCountdown(30);
        }
      } catch (err) {
        if (isMounted) {
          setIncomingOffer(INITIAL_DISPATCHES[0]);
          setCountdown(30);
        }
      }
    };

    const initialTimer = setTimeout(checkDispatches, 1200);
    const interval = setInterval(checkDispatches, 20000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isOnline, activeVehicleFilter]);

  // Countdown timer for incoming trip offer
  useEffect(() => {
    if (!incomingOffer) return;

    if (countdown > 0) {
      const interval = setInterval(() => setCountdown(c => c - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setIncomingOffer(null);
    }
  }, [incomingOffer, countdown]);

  const handleCounterBid = (extraAmount) => {
    if (!incomingOffer) return;
    const newPrice = incomingOffer.fare + extraAmount;
    setCustomCounter(newPrice);
    setCounterSentToast(`Counter-offer of ${formatNaira(newPrice)} sent to ${incomingOffer.customerName}! Waiting for passenger approval...`);

    // Simulate passenger accepting the rider's counter-offer after 2 seconds
    setTimeout(() => {
      setCounterSentToast(`Passenger accepted your counter-offer of ${formatNaira(newPrice)}! Dispatch confirmed.`);
      setTimeout(() => {
        onAcceptTrip({
          ...incomingOffer,
          fare: newPrice
        });
      }, 1000);
    }, 2000);
  };

  const handleQuickNextDemoOffer = () => {
    const currentIndex = INITIAL_DISPATCHES.findIndex(d => d.orderId === incomingOffer?.orderId);
    const nextIndex = (currentIndex + 1) % INITIAL_DISPATCHES.length;
    setIncomingOffer(INITIAL_DISPATCHES[nextIndex]);
    setCountdown(30);
    setCustomCounter(null);
  };

  return (
    <div className="rider-radar-wrapper" style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
      {/* Vehicle Category Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          className={`rider-chip-filter ${activeVehicleFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveVehicleFilter('all')}
        >
          All Requests
        </button>
        <button
          className={`rider-chip-filter ${activeVehicleFilter === 'okada' ? 'active' : ''}`}
          onClick={() => setActiveVehicleFilter('okada')}
        >
          🏍️ Okada
        </button>
        <button
          className={`rider-chip-filter ${activeVehicleFilter === 'maruwa' ? 'active' : ''}`}
          onClick={() => setActiveVehicleFilter('maruwa')}
        >
          🛺 Maruwa
        </button>
        <button
          className={`rider-chip-filter ${activeVehicleFilter === 'car' ? 'active' : ''}`}
          onClick={() => setActiveVehicleFilter('car')}
        >
          🚗 Taxi/Car
        </button>
      </div>

      {counterSentToast && (
        <div style={{ padding: '12px 16px', background: 'rgba(43, 124, 255, 0.1)', border: '1.5px solid #2B7CFF', borderRadius: '12px', color: '#1D4ED8', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles size={16} color="#2B7CFF" />
          <span>{counterSentToast}</span>
        </div>
      )}

      {/* Radar Scanner View */}
      <div className="rider-radar-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="rider-radar-badge">
            {isOnline ? '🟢 LIVE RADAR' : '⚪ OFFLINE'}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--rider-text-muted)' }}>
            {isOnline ? 'Scanning 1–3km Ikeja Corridor' : 'Duty Switch is OFF'}
          </span>
        </div>

        {isOnline ? (
          <div className="radar-circle-wrap">
            <div className="radar-pulse-ring" />
            <div className="radar-pulse-ring" />
            <div className="radar-pulse-ring" />
            <div className="radar-center-bike">
              <Bike size={34} />
            </div>
          </div>
        ) : (
          <div className="radar-offline-circle">
            <Bike size={36} />
          </div>
        )}

        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: 'var(--rider-text)' }}>
          {isOnline ? 'Broadcasting Location to Nearby Customers' : 'Toggle Online to Start Receiving Trips'}
        </h3>
        <p style={{ fontSize: '13.5px', color: 'var(--rider-text-muted)', margin: '0 0 16px', maxWidth: '380px', lineHeight: 1.5 }}>
          {isOnline 
            ? 'Receiving day-to-day rides, market errands, and pharmacy dispatches. InDrive-style bargaining active.'
            : 'Turn your duty status ON in the top bar to connect with nearby commuters and errands.'}
        </p>

        {isOnline && !incomingOffer && (
          <button
            onClick={handleQuickNextDemoOffer}
            className="rider-secondary-btn"
            style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer' }}
          >
            ⚡ Simulate Incoming Passenger Request
          </button>
        )}
      </div>

      {/* Incoming Trip Request InDrive-Style Card */}
      {incomingOffer && (
        <div className="rider-incoming-card" role="region" aria-label="Incoming trip dispatch request">
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="rider-trip-type-tag">
                {incomingOffer.vehicleType === 'okada' ? '🏍️ OKADA' : incomingOffer.vehicleType === 'maruwa' ? '🛺 MARUWA' : '🚗 CAR'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--rider-text-muted)' }}>
                {incomingOffer.title}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 800, color: countdown <= 10 ? '#EF4444' : 'var(--rider-text)' }}>
              <Clock size={16} />
              <span>{countdown}s</span>
            </div>
          </div>

          {/* Guaranteed / Passenger Offered Fare Banner */}
          <div className="rider-fare-banner">
            <div>
              <span style={{ fontSize: '11px', color: '#a3a3a3', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Customer Offered Fare
              </span>
              <div className="font-mono" style={{ fontSize: '32px', fontWeight: 800, color: '#2B7CFF', lineHeight: 1.1, marginTop: '2px' }}>
                {formatNaira(customCounter || incomingOffer.fare)}
              </div>
              {incomingOffer.tip > 0 && (
                <div style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>
                  + {formatNaira(incomingOffer.tip)} direct tip included (100% kept)
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right', fontSize: '12.5px', color: '#d4d4d4' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>{incomingOffer.distanceKm}</div>
              <div>~{incomingOffer.estimatedMinutes} mins drive</div>
              <div style={{ fontSize: '11px', color: '#a3a3a3', marginTop: '2px' }}>{incomingOffer.corridor}</div>
            </div>
          </div>

          {/* Passenger Details */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--rider-card-inner-bg)', border: '1px solid var(--rider-border)', borderRadius: '12px', padding: '12px 14px', margin: '14px 0' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--rider-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Passenger / Sender</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--rider-text)' }}>{incomingOffer.customerName}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '4px 8px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 800 }}>
              <span>★</span>
              <span>{incomingOffer.customerRating || '4.95'}</span>
            </div>
          </div>

          {/* Route Details */}
          <div className="rider-route-timeline">
            {/* Pickup */}
            <div className="rider-route-point">
              <div className="rider-pin-icon pickup">
                <Store size={14} />
              </div>
              <div>
                <span className="rider-point-label">PICKUP POINT</span>
                <div className="rider-point-title">{incomingOffer.pickupLocation || incomingOffer.storeName || 'Pickup Location'}</div>
                <div className="rider-point-address">{incomingOffer.pickupAddress || incomingOffer.storeAddress}</div>
              </div>
            </div>

            {/* Dropoff */}
            <div className="rider-route-point">
              <div className="rider-pin-icon dropoff">
                <MapPin size={14} />
              </div>
              <div>
                <span className="rider-point-label">DESTINATION</span>
                <div className="rider-point-title">{incomingOffer.dropoffLocation || incomingOffer.customerName}</div>
                <div className="rider-point-address">{incomingOffer.dropoffAddress || incomingOffer.customerAddress}</div>
              </div>
            </div>
          </div>

          {/* Special Notes / Errand Details */}
          {incomingOffer.notes && (
            <div style={{ margin: '12px 0 16px', padding: '10px 12px', background: 'var(--rider-card-inner-bg)', borderLeft: '3px solid #2B7CFF', borderRadius: '0 8px 8px 0', fontSize: '12.5px', color: 'var(--rider-text)', fontStyle: 'italic' }}>
              "{incomingOffer.notes}"
            </div>
          )}

          {/* InDrive-Style Counter-Offer Chips (Handlebar/Glove Friendly) */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--rider-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1-Tap Counter-Bid (InDrive Style)
              </span>
              <span style={{ fontSize: '11px', color: '#2B7CFF', fontWeight: 700 }}>
                Bargain Higher Fare
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(incomingOffer.counterBids || [incomingOffer.fare + 200, incomingOffer.fare + 500, incomingOffer.fare + 1000]).map((counterFare, i) => {
                const diff = counterFare - incomingOffer.fare;
                return (
                  <button
                    key={i}
                    onClick={() => handleCounterBid(diff)}
                    className="rider-counter-chip"
                    aria-label={`Counter offer plus ₦${diff}`}
                  >
                    <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 800 }}>+{formatNaira(diff)}</span>
                    <span className="font-mono" style={{ fontSize: '14px', fontWeight: 800 }}>{formatNaira(counterFare)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons: 56px Minimum Tap Target for Accessibility */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: '12px' }}>
            <button
              onClick={() => setIncomingOffer(null)}
              className="rider-decline-btn"
              aria-label="Decline offer"
            >
              Decline
            </button>

            <button
              onClick={() => onAcceptTrip(incomingOffer)}
              className="rider-accept-btn"
              aria-label={`Accept dispatch at ${formatNaira(incomingOffer.fare)}`}
            >
              <Check size={20} />
              <span>Accept at {formatNaira(incomingOffer.fare)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
