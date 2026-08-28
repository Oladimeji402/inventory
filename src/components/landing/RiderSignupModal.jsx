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

export default function RiderSignupModal({ isOpen, onClose }) {
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
            {/* Modal Header */}
            <div className="modal-header-box">
              <div className="modal-icon-badge bg-amber-50 text-amber-700">
                <Bike size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Join Subtech Ventures Rider Fleet</h3>
                <p className="text-xs text-slate-500">Receive instant store-to-door dispatch jobs with guaranteed daily payouts.</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="modal-form-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tunde Oladipo"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Phone / WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 801 234 5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="rider@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Vehicle Type *</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="form-select"
                  >
                    {vehicleOptions.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary City Zone *</label>
                  <select
                    value={formData.primaryZone}
                    onChange={(e) => setFormData({ ...formData, primaryZone: e.target.value })}
                    className="form-select"
                  >
                    {zones.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Driver License / ID Number</label>
                <input
                  type="text"
                  placeholder="e.g. DL-98320492"
                  value={formData.driversLicenseNumber}
                  onChange={(e) => setFormData({ ...formData, driversLicenseNumber: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="rider-perks-box p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold mb-1">
                  <Coins size={15} />
                  <span>Rider Benefits:</span>
                </div>
                <div>&bull; Keep 100% of customer tips &bull; Zero monthly fee &bull; Direct bank cashouts daily</div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn-modal-submit btn-orange-submit w-full mt-4"
              >
                {isSubmitting ? (
                  <span>Registering Rider Profile...</span>
                ) : (
                  <>
                    <span>Submit Rider Application</span>
                    <Sparkles size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="modal-success-pane text-center py-4">
            <CheckCircle2 size={52} className="text-amber-600 mx-auto" />
            <h3 className="text-xl font-bold text-slate-900 mt-3">Welcome to the Rider Fleet!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
              Your application has been received. Your rider activation SMS and app link for <strong>rider.subtech.app</strong> have been sent to {formData.phone || 'your phone'}.
            </p>

            <button 
              className="btn-primary-register mt-6"
              onClick={onClose}
            >
              <span>Back to Subtech Ventures Hub</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
