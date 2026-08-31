import React, { useState } from 'react';
import { 
  Store, 
  Globe2, 
  CreditCard, 
  MapPin, 
  Phone, 
  Check, 
  Terminal,
  ShieldCheck
} from 'lucide-react';

export default function MerchantSettings({ storeProfile, onSaveSettings }) {
  const [formData, setFormData] = useState({
    name: storeProfile.name || 'Kemi Organics & Groceries',
    slug: storeProfile.slug || 'kemi-organics',
    category: storeProfile.category || 'Supermarket & Food',
    address: storeProfile.address || 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos',
    whatsapp: storeProfile.whatsapp || '+234 803 123 4567',
    bankName: storeProfile.bankName || 'Guaranty Trust Bank (GTBank)',
    accountNumber: storeProfile.accountNumber || '0123456789',
    accountName: storeProfile.accountName || 'Kemi Organics Ventures',
    hasPhysicalStore: storeProfile.hasPhysicalStore ?? true
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Store Settings & Profile
        </h1>
        <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
          Manage your custom subdomain, payout bank details, and store options.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Brand & Subdomain */}
        <div className="merchant-card" style={{ padding: '28px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f0f0f0' }}>
            <Globe2 size={18} color="#27BBAD" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Store Identity & Subdomain</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Store Brand Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="merchant-field-input"
              />
            </div>

            <div className="merchant-field-group">
              <label className="merchant-field-label">Custom Subdomain *</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="merchant-field-input font-mono"
                  style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                />
                <span style={{ padding: '10px 14px', background: '#fafafa', border: '1.5px solid #e5e5e5', borderLeft: 'none', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', fontSize: '13px', color: '#737373', fontWeight: 600 }}>
                  .stv.com
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Bank Payout Account */}
        <div className="merchant-card" style={{ padding: '28px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f0f0f0' }}>
            <CreditCard size={18} color="#27BBAD" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Automated Bank Payout Details</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="merchant-field-input"
              />
            </div>

            <div className="merchant-field-group">
              <label className="merchant-field-label">Account Number (NUBAN)</label>
              <input
                type="text"
                maxLength={10}
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="merchant-field-input font-mono"
              />
            </div>

            <div className="merchant-field-group" style={{ gridColumn: 'span 2' }}>
              <label className="merchant-field-label">Account Beneficiary Name</label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="merchant-field-input"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Physical Location & Store Features */}
        <div className="merchant-card" style={{ padding: '28px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f0f0f0' }}>
            <MapPin size={18} color="#27BBAD" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Location & Fulfillment Options</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Physical Store / Dispatch Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="merchant-field-input"
              />
            </div>

            <div className="merchant-field-group">
              <label className="merchant-field-label">Customer Support WhatsApp Line</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="merchant-field-input font-mono"
              />
            </div>

            <div className="merchant-field-group" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.hasPhysicalStore}
                  onChange={(e) => setFormData({ ...formData, hasPhysicalStore: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#27BBAD' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a' }}>
                  Enable Counterpoint Offline POS Module (for stores with physical counter tills)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          {savedSuccess && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#27BBAD', fontSize: '13.5px', fontWeight: 600 }}>
              <Check size={16} />
              <span>Settings saved successfully!</span>
            </span>
          )}
          <button type="submit" className="merchant-btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }}>
            <Check size={16} />
            <span>Save Store Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
