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
  LayoutDashboard
} from 'lucide-react';

export default function RegistrationModal({ isOpen, onClose, initialSlug = '', onOpenMerchantPortal }) {
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
    <div className="registration-modal-overlay" onClick={onClose}>
      <div className="registration-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="btn-close-modal" onClick={onClose}>
          <X size={18} />
        </button>

        {!isSuccess ? (
          <div>
            {/* Modal Header */}
            <div className="modal-header-block text-center">
              <div className="modal-step-badge">
                <span>Step {step} of 2</span>
              </div>
              <h3 className="modal-title">Register Your Store on Subtech</h3>
              <p className="modal-subtitle">
                Get your instant digital storefront, order management dashboard, and on-demand courier dispatch.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {step === 1 ? (
                <div className="modal-form-step">
                  <div className="form-group">
                    <label className="form-label">Business / Store Name *</label>
                    <div className="input-with-icon">
                      <Store size={18} className="input-icon" />
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Apex Health Pharmacy"
                        value={formData.businessName}
                        onChange={handleNameChange}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Your Live Web Address (Subdomain) *</label>
                    <div className="subdomain-preview-input">
                      <span className="subdomain-prefix font-mono">https://</span>
                      <input 
                        type="text"
                        required
                        placeholder="apex-pharmacy"
                        value={formData.subdomain}
                        onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                        className="subdomain-slug-input font-mono"
                      />
                      <span className="subdomain-suffix font-mono">.stv.com</span>
                    </div>
                    <span className="form-hint">
                      This will be your live online store link for customer checkouts.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Store Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
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
                      if (formData.businessName && formData.subdomain) setStep(2);
                    }}
                  >
                    <span>Continue to Contact Info</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                /* Step 2 */
                <div className="modal-form-step">
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Owner / Manager Name *</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Adeola Balogun"
                        value={formData.ownerName}
                        onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">WhatsApp Number *</label>
                      <div className="input-with-icon">
                        <Phone size={18} className="input-icon" />
                        <input 
                          type="tel"
                          required
                          placeholder="+234 800 000 0000"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Business Email *</label>
                    <div className="input-with-icon">
                      <Mail size={18} className="input-icon" />
                      <input 
                        type="email"
                        required
                        placeholder="orders@apexpharmacy.com"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Store / Pickup Address *</label>
                    <div className="input-with-icon">
                      <MapPin size={18} className="input-icon" />
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Plot 14, Admiralty Way, Lekki Phase 1, Lagos"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    <span className="form-hint">Used for 1–3km on-demand courier dispatch radar.</span>
                  </div>

                  <div className="modal-actions-row">
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
                        <span>Provisioning Storefront...</span>
                      ) : (
                        <>
                          <span>Activate My Store</span>
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
              <CheckCircle2 size={52} color="#2B7CFF" className="mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-3">Store Provisioned Successfully!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
              Your digital storefront and merchant management hub are ready.
            </p>

            <div className="provisioned-url-card my-4 p-3 rounded-lg bg-slate-50 border border-emerald-300">
              <div className="text-xs text-slate-500">Your Live Storefront URL:</div>
              <div className="font-mono font-bold text-base mt-0.5" style={{ color: '#2B7CFF' }}>
                https://{formData.subdomain || 'my-store'}.stv.com
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button 
                className="lp-btn-primary justify-center"
                style={{ width: '100%' }}
                onClick={() => {
                  onClose();
                  if (onOpenMerchantPortal) onOpenMerchantPortal();
                }}
              >
                <LayoutDashboard size={16} />
                <span>Open Merchant Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
