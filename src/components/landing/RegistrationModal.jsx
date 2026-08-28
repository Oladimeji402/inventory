import React, { useState } from 'react';
import { 
  X, 
  Store, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  MapPin, 
  Phone, 
  Mail, 
  ShoppingBag,
  Sparkles,
  Terminal
} from 'lucide-react';

export default function RegistrationModal({ isOpen, onClose, initialSlug = '', onLaunchPOS }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: initialSlug ? initialSlug.replace(/-/g, ' ') : '',
    subdomain: initialSlug || '',
    category: 'Supermarket & Groceries',
    ownerName: '',
    email: '',
    phone: '',
    city: 'Lagos',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (e) => {
    const val = e.target.value;
    const generatedSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
    setFormData((prev) => ({
      ...prev,
      businessName: val,
      subdomain: generatedSlug
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1100);
  };

  const categories = [
    'Supermarket & Groceries',
    'Pharmacy & Healthcare',
    'Electronics & Gadgets',
    'Fashion & Boutique',
    'Bakery & Confectionery',
    'Beauty & Cosmetics',
    'Hardware & Building Materials',
    'General Retail'
  ];

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="modal-content-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {!isSuccess ? (
          <div>
            {/* Modal Header */}
            <div className="modal-header-box">
              <div className="modal-icon-badge bg-emerald-50 text-emerald-700">
                <Store size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Register Your Store on Subtech Ventures</h3>
                <p className="text-xs text-slate-500">Claim your dedicated store subdomain and activate your offline POS till.</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="modal-form-body">
              {step === 1 ? (
                <div className="form-step-pane">
                  <div className="form-group">
                    <label className="form-label">Business / Store Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Supermarket & Wine"
                      value={formData.businessName}
                      onChange={handleNameChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dedicated Store Subdomain *</label>
                    <div className="subdomain-input-group">
                      <span className="subdomain-addon">https://</span>
                      <input
                        type="text"
                        required
                        placeholder="apex-supermarket"
                        value={formData.subdomain}
                        onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        className="subdomain-inner-input font-mono"
                      />
                      <span className="subdomain-addon">.subtech.app</span>
                    </div>
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1 mt-1">
                      <CheckCircle2 size={13} />
                      <span>URL automatically reserved on Edge DNS</span>
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Store Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="form-select"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    type="button" 
                    className="btn-modal-next"
                    onClick={() => {
                      if (formData.businessName.trim() && formData.subdomain.trim()) {
                        setStep(2);
                      }
                    }}
                  >
                    <span>Continue to Contact & Location</span>
                    <ArrowRight size={17} />
                  </button>
                </div>
              ) : (
                <div className="form-step-pane">
                  <div className="form-group">
                    <label className="form-label">Owner / Store Manager Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">Business Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="owner@store.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+234 800 000 0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Store Physical Address (for Rider Pickups) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Shop 14, Commercial Plaza, Admiralty Way, Lekki"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button" 
                      className="btn-modal-back"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="btn-modal-submit flex-1"
                    >
                      {isSubmitting ? (
                        <span>Provisioning Edge Subdomain...</span>
                      ) : (
                        <>
                          <span>Activate Store & POS</span>
                          <Sparkles size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        ) : (
          /* Success View */
          <div className="modal-success-pane text-center py-4">
            <div className="success-icon-wrapper">
              <CheckCircle2 size={52} className="text-emerald-600 mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-3">Store Provisioned Successfully!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
              Your store profile and live catalog hub have been activated on the network.
            </p>

            <div className="provisioned-url-card my-4 p-3 rounded-lg bg-slate-50 border border-emerald-300">
              <div className="text-xs text-slate-500">Your Live Store Address:</div>
              <div className="font-mono text-emerald-800 font-bold text-base mt-0.5">
                https://{formData.subdomain || 'my-store'}.subtech.app
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button 
                className="btn-till-sandbox justify-center"
                onClick={() => {
                  onClose();
                  onLaunchPOS();
                }}
              >
                <Terminal size={16} />
                <span>Open POS Till Register</span>
              </button>
              <button 
                className="btn-primary-register justify-center"
                onClick={onClose}
              >
                <span>Close & Return to Hub</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
