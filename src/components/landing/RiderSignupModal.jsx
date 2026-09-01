import React, { useState } from 'react';
import { 
  X, 
  Bike, 
  CheckCircle2, 
  ArrowRight, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Sparkles,
  Coins
} from 'lucide-react';

export default function RiderSignupModal({ isOpen, onClose, onOpenRiderPortal }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    vehicleType: 'Motorcycle (100cc-200cc)',
    city: 'Lagos',
    primaryZone: 'Lekki / Victoria Island / Ikoyi',
    driversLicenseNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1100);
  };

  const vehicleOptions = [
    'Motorcycle (100cc-200cc)',
    'Electric Scooter / Bike',
    'Bicycle (Short Urban Courier)',
    'Compact Delivery Van / Car'
  ];

  const zones = [
    'Lekki / Victoria Island / Ikoyi',
    'Ikeja / GRA / Maryland / Alausa',
    'Surulere / Yaba / Ebute Metta',
    'Abuja Central / Garki / Wuse',
    'Port Harcourt GRA / Old GRA'
  ];

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="modal-content-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {!isSuccess ? (
          <div>
            <div className="modal-header-block text-center">
              <div className="modal-step-badge" style={{ background: '#0a0a0a', color: '#ffffff' }}>
                <span>Subtech Courier Fleet</span>
              </div>
              <h3 className="modal-title">Deliver with Subtech Courier</h3>
              <p className="modal-subtitle">
                Keep 100% of customer tips, earn guaranteed corridor trip fares, and cash out instantly.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="modal-form-step">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Samuel Olawale"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">WhatsApp Phone Number *</label>
                  <div className="input-with-icon">
                    <Phone size={18} className="input-icon" />
                    <input 
                      type="tel"
                      required
                      placeholder="+234 800 000 0000"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="form-input font-mono"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <select 
                    value={formData.vehicleType}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value }))}
                    className="form-select"
                  >
                    {vehicleOptions.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Primary Delivery Corridor (Zone)</label>
                <select 
                  value={formData.primaryZone}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryZone: e.target.value }))}
                  className="form-select"
                >
                  {zones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div className="rider-perks-box p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1">
                  <Coins size={15} />
                  <span>Rider Benefits:</span>
                </div>
                <div>&bull; Keep 100% of customer tips &bull; Zero commission fee &bull; Direct bank cashouts daily</div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="lp-btn-primary w-full mt-4 justify-center"
                style={{ width: '100%', padding: '14px', background: '#0a0a0a' }}
              >
                {isSubmitting ? (
                  <span>Registering Courier Profile...</span>
                ) : (
                  <>
                    <span>Submit & Open Rider App</span>
                    <Sparkles size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="modal-success-pane text-center py-4">
            <CheckCircle2 size={52} color="#2B7CFF" className="mx-auto" />
            <h3 className="text-xl font-bold text-slate-900 mt-3">Welcome to Subtech Courier!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
              Your courier terminal has been activated for <strong>{formData.primaryZone}</strong>.
            </p>

            <button 
              className="lp-btn-primary justify-center mt-6"
              style={{ width: '100%', padding: '14px', background: '#2B7CFF' }}
              onClick={() => {
                onClose();
                if (onOpenRiderPortal) onOpenRiderPortal();
              }}
            >
              <Bike size={16} />
              <span>Launch Rider Dispatch Portal</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
