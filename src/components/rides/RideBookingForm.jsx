import React, { useState } from 'react';
import { 
  Zap, 
  Clock, 
  GraduationCap, 
  MapPin, 
  Navigation, 
  DollarSign, 
  ArrowRight, 
  Plus, 
  Minus, 
  Info, 
  ShieldCheck, 
  Calendar, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { VEHICLE_TYPES, SERVICE_MODES, CORRIDORS } from './ridesData';

export default function RideBookingForm({
  onRequestBids,
  onOpenSchoolModal,
  selectedCorridor,
  onSelectCorridor
}) {
  const [selectedVehicle, setSelectedVehicle] = useState('maruwa'); // Maruwa popular default
  const [serviceMode, setServiceMode] = useState('now'); // 'now', 'scheduled', 'school_run'
  
  // Locations
  const [pickupAddress, setPickupAddress] = useState('Plot 8, Isaac John Street, Ikeja GRA');
  const [pickupCorridor, setPickupCorridor] = useState(selectedCorridor || 'Ikeja GRA, Allen & Maryland');
  const [dropoffAddress, setDropoffAddress] = useState('Lekki Phase 1 Gate, Admiralty Way');
  const [dropoffCorridor, setDropoffCorridor] = useState('Lekki Phase 1, Admiralty & Ikate');
  
  // Scheduled Details ("Come and pick me by 4pm")
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('16:00'); // 4:00 PM
  
  // School Run details
  const [schoolName, setSchoolName] = useState('Corona School, Victoria Island');
  const [childrenCount, setChildrenCount] = useState(2);
  const [morningPickupTime, setMorningPickupTime] = useState('07:15');
  const [afternoonDropoffTime, setAfternoonDropoffTime] = useState('14:30');
  
  // Price bargaining (InDrive style)
  const currentVehicleObj = VEHICLE_TYPES.find(v => v.id === selectedVehicle) || VEHICLE_TYPES[1];
  
  // Dynamic baseline based on vehicle and mode
  const baselineFare = React.useMemo(() => {
    let base = currentVehicleObj.basePrice;
    if (serviceMode === 'scheduled') base += 300; // reservation premium
    if (serviceMode === 'school_run') base = currentVehicleObj.id === 'maruwa' ? 22000 : 45000; // weekly contract base
    return base;
  }, [currentVehicleObj, serviceMode]);

  const [proposedPrice, setProposedPrice] = useState(baselineFare);
  const [tripNote, setTripNote] = useState('');

  // Update proposed price when vehicle or service mode changes
  React.useEffect(() => {
    setProposedPrice(baselineFare);
  }, [baselineFare]);

  function adjustPrice(delta) {
    const step = serviceMode === 'school_run' ? 1000 : 100;
    const min = serviceMode === 'school_run' ? 15000 : currentVehicleObj.minBid;
    setProposedPrice(prev => Math.max(min, prev + delta * step));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (serviceMode === 'school_run') {
      onOpenSchoolModal({
        vehicle: currentVehicleObj,
        schoolName,
        childrenCount,
        morningPickupTime,
        afternoonDropoffTime,
        pickupAddress,
        pickupCorridor,
        proposedWeeklyPrice: proposedPrice,
        tripNote
      });
      return;
    }

    onRequestBids({
      id: 'TRIP-' + Math.floor(10000 + Math.random() * 90000),
      vehicleType: currentVehicleObj.id,
      vehicleName: currentVehicleObj.name,
      vehicleEmoji: currentVehicleObj.emoji,
      serviceMode,
      pickupAddress,
      pickupCorridor,
      dropoffAddress,
      dropoffCorridor,
      scheduledDate: serviceMode === 'scheduled' ? scheduledDate : null,
      scheduledTime: serviceMode === 'scheduled' ? scheduledTime : null,
      customerOfferedPrice: proposedPrice,
      tripNote: tripNote || (serviceMode === 'scheduled' ? `Pick up at ${scheduledTime}` : 'Direct ride')
    });
  }

  return (
    <div className="rd-booking-card">
      {/* ── 1. SERVICE MODE TOGGLE ──────────────────────────────────── */}
      <div className="rd-mode-tabs">
        {SERVICE_MODES.map((m) => {
          const isActive = serviceMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={`rd-mode-tab ${isActive ? 'active' : ''}`}
              onClick={() => setServiceMode(m.id)}
            >
              <div className="rd-mode-tab-content">
                <div className="rd-mode-tab-title">
                  {m.id === 'now' && <Zap size={14} className="text-amber-500" />}
                  {m.id === 'scheduled' && <Clock size={14} className="text-blue-500" />}
                  {m.id === 'school_run' && <GraduationCap size={14} className="text-emerald-500" />}
                  <span>{m.title}</span>
                </div>
                <span className="rd-mode-tab-sub">{m.tagline}</span>
              </div>
              {isActive && <span className="rd-tab-active-indicator" />}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="rd-form-body">
        {/* ── 2. VEHICLE FLEET PICKER ───────────────────────────────── */}
        <div className="rd-section-block">
          <label className="rd-section-label">
            <span>Select Vehicle Type</span>
            <span className="rd-label-hint">Okada · Maruwa · Cars available</span>
          </label>
          
          <div className="rd-vehicles-grid">
            {VEHICLE_TYPES.map((v) => {
              const isSelected = selectedVehicle === v.id;
              return (
                <div
                  key={v.id}
                  className={`rd-vehicle-tile ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedVehicle(v.id)}
                >
                  <div className="rd-vehicle-top">
                    <span className="rd-vehicle-emoji">{v.emoji}</span>
                    <span className="rd-vehicle-badge" style={{ color: v.tagColor, borderColor: `${v.tagColor}40` }}>
                      {v.speedBadge}
                    </span>
                  </div>

                  <div className="rd-vehicle-name-row">
                    <h4 className="rd-vehicle-title">{v.name}</h4>
                    <span className="rd-vehicle-sub">{v.subtitle}</span>
                  </div>

                  <p className="rd-vehicle-desc">{v.description}</p>

                  <div className="rd-vehicle-footer">
                    <span className="rd-vehicle-capacity">{v.capacity}</span>
                    <strong className="rd-vehicle-price">
                      {serviceMode === 'school_run' 
                        ? `From ₦${v.id === 'maruwa' ? '22k' : '45k'}/wk`
                        : `From ₦${v.basePrice.toLocaleString()}`}
                    </strong>
                  </div>

                  {isSelected && (
                    <div className="rd-vehicle-check">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 3. ROUTE & PICKUP DETAILS ─────────────────────────────── */}
        <div className="rd-section-block">
          <label className="rd-section-label">
            <span>Pickup & Destination Corridors</span>
          </label>

          <div className="rd-route-box">
            {/* Pickup */}
            <div className="rd-route-row">
              <div className="rd-dot-marker pickup" />
              <div className="rd-route-inputs">
                <span className="rd-input-label">PICKUP LOCATION</span>
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Street address or estate gate..."
                  className="rd-route-text-input"
                />
                <select
                  value={pickupCorridor}
                  onChange={(e) => setPickupCorridor(e.target.value)}
                  className="rd-corridor-select"
                >
                  {CORRIDORS.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rd-route-connector" />

            {/* Destination / School */}
            <div className="rd-route-row">
              <div className="rd-dot-marker dropoff" />
              <div className="rd-route-inputs">
                <span className="rd-input-label">
                  {serviceMode === 'school_run' ? 'SCHOOL DESTINATION' : 'DESTINATION / DROP-OFF'}
                </span>
                <input
                  type="text"
                  required
                  value={serviceMode === 'school_run' ? schoolName : dropoffAddress}
                  onChange={(e) => serviceMode === 'school_run' ? setSchoolName(e.target.value) : setDropoffAddress(e.target.value)}
                  placeholder={serviceMode === 'school_run' ? "Child's school name and gate..." : "Destination address, bus stop or plaza..."}
                  className="rd-route-text-input"
                />
                <select
                  value={dropoffCorridor}
                  onChange={(e) => setDropoffCorridor(e.target.value)}
                  className="rd-corridor-select"
                >
                  {CORRIDORS.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. CONDITIONAL MODE SPECIFICS ──────────────────────────── */}
        {/* Mode A: Scheduled Time ("Pick me by 4pm") */}
        {serviceMode === 'scheduled' && (
          <div className="rd-scheduled-panel key-fade">
            <div className="rd-panel-header">
              <Clock size={16} className="text-blue-500" />
              <div>
                <strong>Schedule Advance Pickup Time</strong>
                <p>A rider in your corridor will be reserved specifically for your scheduled hour.</p>
              </div>
            </div>

            <div className="rd-scheduled-grid">
              <div className="rd-field">
                <label>Date</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="rd-time-input"
                />
              </div>
              <div className="rd-field">
                <label>Pickup Time (e.g. 4:00 PM)</label>
                <input
                  type="time"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="rd-time-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Mode B: School Run Contract Specifics */}
        {serviceMode === 'school_run' && (
          <div className="rd-school-panel key-fade">
            <div className="rd-panel-header">
              <GraduationCap size={18} className="text-emerald-500" />
              <div>
                <strong>Monday–Friday Recurring School Commute</strong>
                <p>Dedicated background-checked Maruwa or Car driver. Parent SMS handover OTP on arrival.</p>
              </div>
            </div>

            <div className="rd-scheduled-grid">
              <div className="rd-field">
                <label>Morning Pickup (Home to School)</label>
                <input
                  type="time"
                  required
                  value={morningPickupTime}
                  onChange={(e) => setMorningPickupTime(e.target.value)}
                  className="rd-time-input"
                />
              </div>
              <div className="rd-field">
                <label>Afternoon Return (School to Home)</label>
                <input
                  type="time"
                  required
                  value={afternoonDropoffTime}
                  onChange={(e) => setAfternoonDropoffTime(e.target.value)}
                  className="rd-time-input"
                />
              </div>
            </div>

            <div className="rd-field mt-3">
              <label>Number of Children Sharing Ride</label>
              <div className="rd-stepper-row">
                <button 
                  type="button" 
                  className="rd-stepper-btn" 
                  onClick={() => setChildrenCount(Math.max(1, childrenCount - 1))}
                >
                  <Minus size={14} />
                </button>
                <span className="rd-stepper-val">{childrenCount} {childrenCount === 1 ? 'Child' : 'Children'}</span>
                <button 
                  type="button" 
                  className="rd-stepper-btn" 
                  onClick={() => setChildrenCount(Math.min(4, childrenCount + 1))}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. IN-APP PRICE BARGAINING (INDRIVE STYLE) ─────────────── */}
        <div className="rd-section-block rd-bargain-box">
          <div className="rd-bargain-header">
            <div>
              <span className="rd-bargain-tag">PRICE NEGOTIATION · YOU NAME THE FARE</span>
              <h4 className="rd-bargain-title">
                {serviceMode === 'school_run' ? 'Proposed Weekly Contract Budget' : 'Propose Your Trip Offer'}
              </h4>
            </div>
            <div className="rd-suggested-pill">
              <span>Baseline: ₦{baselineFare.toLocaleString()}</span>
            </div>
          </div>

          <div className="rd-price-counter-row">
            <button
              type="button"
              className="rd-price-btn minus"
              onClick={() => adjustPrice(-1)}
              title="Lower proposed price"
            >
              <Minus size={18} />
              <span>{serviceMode === 'school_run' ? '-₦1,000' : '-₦100'}</span>
            </button>

            <div className="rd-price-display">
              <span className="rd-currency">₦</span>
              <input
                type="number"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(Number(e.target.value) || 0)}
                className="rd-price-input"
              />
              <span className="rd-price-suffix">
                {serviceMode === 'school_run' ? '/week' : ''}
              </span>
            </div>

            <button
              type="button"
              className="rd-price-btn plus"
              onClick={() => adjustPrice(1)}
              title="Increase proposed price"
            >
              <Plus size={18} />
              <span>{serviceMode === 'school_run' ? '+₦1,000' : '+₦100'}</span>
            </button>
          </div>

          <p className="rd-bargain-hint">
            💡 Drivers in {pickupCorridor.split(',')[0]} will see your offer of <strong>₦{proposedPrice.toLocaleString()}{serviceMode === 'school_run' ? '/wk' : ''}</strong> and can accept instantly or send counter-bids.
          </p>

          {/* Errand Instructions / Note */}
          <div className="rd-note-field">
            <input
              type="text"
              value={tripNote}
              onChange={(e) => setTripNote(e.target.value)}
              placeholder="Driver instructions (e.g. 'Wait at gate 2', '2 kids with bags', 'Bring helmet')..."
              className="rd-note-input"
            />
          </div>
        </div>

        {/* ── 6. SUBMIT BUTTON ───────────────────────────────────────── */}
        <div className="rd-submit-row">
          <button type="submit" className="rd-submit-btn">
            <span className="rd-submit-btn-title">
              {serviceMode === 'school_run' 
                ? 'Review & Launch School Run Contract' 
                : 'Find Nearby Riders & Receive Bids'}
            </span>
            <div className="rd-btn-icon-wrap">
              <ArrowRight size={18} />
            </div>
          </button>
        </div>

        {/* Safety trust badge */}
        <div className="rd-trust-row">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>All Subtech Okada, Maruwa & Taxi riders are verified with Government ID, guarantor, and background check.</span>
        </div>
      </form>
    </div>
  );
}
