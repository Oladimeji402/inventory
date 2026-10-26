import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radio, 
  MapPin, 
  Star, 
  ShieldCheck, 
  Clock, 
  Check, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { SAMPLE_RIDERS } from './ridesData';

export default function RiderBiddingModal({
  tripRequest,
  onClose,
  onAcceptBid
}) {
  const [bids, setBids] = useState([]);
  const [searching, setSearching] = useState(true);
  const [counterInputOpen, setCounterInputOpen] = useState(null); // driver id
  const [userCounterPrice, setUserCounterPrice] = useState(tripRequest.customerOfferedPrice);

  useEffect(() => {
    // Filter sample riders by requested vehicle type or similar
    const matchedRiders = SAMPLE_RIDERS.filter(
      r => r.vehicleType === tripRequest.vehicleType || tripRequest.vehicleType === 'maruwa'
    ).slice(0, 3);

    // Initial instant bid (matches customer price)
    const timer1 = setTimeout(() => {
      if (matchedRiders[0]) {
        setBids(prev => [
          ...prev,
          {
            id: 'BID-1',
            rider: matchedRiders[0],
            offeredPrice: tripRequest.customerOfferedPrice,
            isExactMatch: true,
            note: 'Ready for instant pickup right outside your corridor.',
            arrivedAt: 'Just now'
          }
        ]);
      }
    }, 1200);

    // Second bid (slight counter offer)
    const timer2 = setTimeout(() => {
      if (matchedRiders[1]) {
        const counter = tripRequest.customerOfferedPrice + (tripRequest.serviceMode === 'school_run' ? 2000 : 200);
        setBids(prev => [
          ...prev,
          {
            id: 'BID-2',
            rider: matchedRiders[1],
            offeredPrice: counter,
            isExactMatch: false,
            note: 'TVS King Deluxe with clean rain curtains & full safety helmet.',
            arrivedAt: '12s ago'
          }
        ]);
      }
    }, 2800);

    // Third bid
    const timer3 = setTimeout(() => {
      const extraRider = SAMPLE_RIDERS[3]; // Chidi or Sunday
      if (extraRider) {
        const counter = tripRequest.customerOfferedPrice + (tripRequest.serviceMode === 'school_run' ? 4000 : 400);
        setBids(prev => [
          ...prev,
          {
            id: 'BID-3',
            rider: extraRider,
            offeredPrice: counter,
            isExactMatch: false,
            note: 'Premium vehicle with AC and child booster seat.',
            arrivedAt: '25s ago'
          }
        ]);
        setSearching(false);
      }
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [tripRequest]);

  function handleAccept(bid) {
    onAcceptBid({
      ...tripRequest,
      assignedRider: bid.rider,
      agreedFare: bid.offeredPrice,
      otpCode: Math.floor(1000 + Math.random() * 9000).toString(),
      status: 'en_route',
      acceptedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  function handleSendCounter(bidId, rider) {
    // update bid price
    setBids(prev => prev.map(b => b.id === bidId ? { ...b, offeredPrice: Number(userCounterPrice), isExactMatch: true, note: 'You counter-offered this rate' } : b));
    setCounterInputOpen(null);
  }

  return (
    <div className="rd-modal-backdrop" onClick={onClose}>
      <div className="rd-bidding-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rd-modal-top">
          <div className="rd-modal-title-group">
            <span className="rd-live-radar-tag">
              <span className="rd-radar-ping" />
              <span>LIVE RIDER BIDDING RADAR</span>
            </span>
            <h3 className="rd-modal-title">
              {tripRequest.serviceMode === 'scheduled' ? 'Scheduled Pickup Bids' : 'Nearby Driver Offers'}
            </h3>
          </div>

          <button 
            type="button" 
            className="rd-modal-close-btn" 
            onClick={onClose}
            aria-label="Cancel request"
          >
            <X size={18} />
          </button>
        </div>

        {/* Trip Summary Card */}
        <div className="rd-bidding-trip-summary">
          <div className="rd-summary-route">
            <div className="rd-summary-point">
              <span className="rd-dot pickup" />
              <div>
                <span className="rd-summary-lbl">PICKUP</span>
                <strong className="rd-summary-val">{tripRequest.pickupAddress}</strong>
              </div>
            </div>
            <div className="rd-summary-point">
              <span className="rd-dot dropoff" />
              <div>
                <span className="rd-summary-lbl">DESTINATION</span>
                <strong className="rd-summary-val">{tripRequest.dropoffAddress}</strong>
              </div>
            </div>
          </div>

          <div className="rd-summary-meta">
            <div className="rd-meta-badge">
              <span>{tripRequest.vehicleEmoji} {tripRequest.vehicleName}</span>
            </div>
            <div className="rd-meta-price">
              <span>Your Offer:</span>
              <strong>₦{tripRequest.customerOfferedPrice.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Radar Scanning Status */}
        <div className="rd-radar-status-bar">
          <Radio size={16} className="text-blue-500 animate-pulse" />
          <span>
            {searching 
              ? `Broadcasting your ₦${tripRequest.customerOfferedPrice.toLocaleString()} offer to verified riders in ${tripRequest.pickupCorridor.split(',')[0]}...` 
              : `Found ${bids.length} nearby riders ready to accept or negotiate.`}
          </span>
        </div>

        {/* Bids List */}
        <div className="rd-bids-list">
          {bids.length === 0 ? (
            <div className="rd-bids-empty">
              <div className="rd-empty-spinner" />
              <h4>Alerting nearby Okada & Maruwa riders...</h4>
              <p>Riders in your corridor usually respond within 5–15 seconds.</p>
            </div>
          ) : (
            bids.map((bid) => {
              const diff = bid.offeredPrice - tripRequest.customerOfferedPrice;
              const isCounterOpen = counterInputOpen === bid.id;

              return (
                <div key={bid.id} className="rd-bid-card key-fade">
                  <div className="rd-bid-main">
                    {/* Driver Avatar */}
                    <div className="rd-bid-avatar">
                      <span className="text-2xl">{bid.rider.avatar}</span>
                      <span className="rd-bid-veh-icon">
                        {bid.rider.vehicleType === 'okada' && '🏍️'}
                        {bid.rider.vehicleType === 'maruwa' && '🛺'}
                        {bid.rider.vehicleType === 'car' && '🚗'}
                      </span>
                    </div>

                    {/* Driver Info */}
                    <div className="rd-bid-info">
                      <div className="rd-bid-driver-name-row">
                        <strong className="rd-bid-driver-name">{bid.rider.name}</strong>
                        <div className="rd-bid-rating">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span>{bid.rider.rating}</span>
                          <span className="text-slate-400 text-[11px]">({bid.rider.tripsCount})</span>
                        </div>
                      </div>

                      <div className="rd-bid-vehicle-detail">
                        <span>{bid.rider.vehicleModel}</span>
                        <span className="rd-plate-tag">{bid.rider.plateNumber}</span>
                      </div>

                      <div className="rd-bid-badges-row">
                        <span className="rd-bid-badge">
                          <ShieldCheck size={11} className="text-emerald-500" />
                          <span>{bid.rider.badge.split('·')[0]}</span>
                        </span>
                        <span className="rd-bid-distance">
                          <Clock size={11} className="text-blue-500" />
                          <span>{bid.rider.distanceEta}</span>
                        </span>
                      </div>

                      {bid.note && (
                        <p className="rd-bid-note">💬 "{bid.note}"</p>
                      )}
                    </div>

                    {/* Fare Offer & Accept */}
                    <div className="rd-bid-fare-col">
                      <div className="rd-bid-amount-box">
                        <strong className="rd-bid-amount">₦{bid.offeredPrice.toLocaleString()}</strong>
                        {bid.isExactMatch ? (
                          <span className="rd-exact-match-tag">Matched your offer</span>
                        ) : (
                          <span className="rd-counter-tag">
                            +{diff > 0 ? `₦${diff.toLocaleString()}` : ''}
                          </span>
                        )}
                      </div>

                      <div className="rd-bid-actions-btns">
                        <button
                          type="button"
                          className="rd-accept-bid-btn"
                          onClick={() => handleAccept(bid)}
                        >
                          <Check size={14} />
                          <span>Accept Offer</span>
                        </button>

                        {!bid.isExactMatch && (
                          <button
                            type="button"
                            className="rd-counter-btn"
                            onClick={() => {
                              setCounterInputOpen(isCounterOpen ? null : bid.id);
                              setUserCounterPrice(tripRequest.customerOfferedPrice);
                            }}
                          >
                            <span>Bargain</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline Counter Bargain Input */}
                  {isCounterOpen && (
                    <div className="rd-inline-counter-box key-fade">
                      <span>Propose counter-offer to {bid.rider.name.split(' ')[0]}:</span>
                      <div className="rd-inline-input-group">
                        <span className="rd-curr">₦</span>
                        <input
                          type="number"
                          value={userCounterPrice}
                          onChange={(e) => setUserCounterPrice(e.target.value)}
                          className="rd-inline-input"
                        />
                        <button
                          type="button"
                          className="rd-inline-send-btn"
                          onClick={() => handleSendCounter(bid.id, bid.rider)}
                        >
                          <span>Send</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="rd-modal-footer">
          <div className="rd-footer-escrow">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Escrow Guarantee: Payment held by Subtech until passenger confirms safe arrival or delivery handover.</span>
          </div>
          <button 
            type="button" 
            className="rd-cancel-request-btn"
            onClick={onClose}
          >
            Cancel Trip Request
          </button>
        </div>
      </div>
    </div>
  );
}
