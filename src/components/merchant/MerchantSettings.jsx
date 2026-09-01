import React, { useEffect, useState } from 'react';
import { Globe2, CreditCard, MapPin, Check } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { STORE_CATEGORIES, slugifyStoreName } from '../../lib/merchantConstants';

export default function MerchantSettings({ storeProfile, canManage = true, onSaveSettings }) {
  const [formData, setFormData] = useState({
    name: storeProfile.name || '',
    slug: storeProfile.slug || '',
    category: storeProfile.category || 'General Retail',
    address: storeProfile.address || '',
    whatsapp: storeProfile.whatsapp || '',
    bankName: storeProfile.bankName || '',
    accountNumber: storeProfile.accountNumber || '',
    accountName: storeProfile.accountName || '',
    hasPhysicalStore: storeProfile.hasPhysicalStore ?? true
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      name: storeProfile.name || '',
      slug: storeProfile.slug || '',
      category: storeProfile.category || 'General Retail',
      address: storeProfile.address || '',
      whatsapp: storeProfile.whatsapp || '',
      bankName: storeProfile.bankName || '',
      accountNumber: storeProfile.accountNumber || '',
      accountName: storeProfile.accountName || '',
      hasPhysicalStore: storeProfile.hasPhysicalStore ?? true
    });
  }, [storeProfile]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (formData.accountNumber && !/^[0-9]{10}$/.test(formData.accountNumber)) {
      setError('NUBAN must be 10 digits, or leave it blank.');
      return;
    }
    setSaving(true);
    const result = await onSaveSettings(formData);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSavedSuccess(true);
    window.setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Store Settings & Profile
        </h1>
        <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
          These fields save to your tenant. Changing the URL re-checks availability — it is not held for anyone else.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="merchant-card" style={{ padding: '28px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f0f0f0' }}>
            <Globe2 size={18} color="#2B7CFF" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Store identity & URL</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Store brand name *</label>
              <input
                type="text"
                required
                disabled={!canManage}
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                className="merchant-field-input"
              />
            </div>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Custom subdomain *</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  required
                  disabled={!canManage}
                  value={formData.slug}
                  onChange={(event) => setFormData({ ...formData, slug: slugifyStoreName(event.target.value) })}
                  className="merchant-field-input font-mono"
                  style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                />
                <span style={{ padding: '10px 14px', background: '#fafafa', border: '1.5px solid #e5e5e5', borderLeft: 'none', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', fontSize: '13px', color: '#737373', fontWeight: 600 }}>
                  .{BRAND.domain}
                </span>
              </div>
            </div>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Category</label>
              <select
                disabled={!canManage}
                value={formData.category}
                onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                className="merchant-field-select"
              >
                {STORE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="merchant-card" style={{ padding: '28px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f0f0f0' }}>
            <CreditCard size={18} color="#2B7CFF" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Payout account (NUBAN)</h3>
          </div>
          <p style={{ fontSize: '13px', color: '#737373', margin: '0 0 16px' }}>
            Saved on your store record. Marketplace payouts stay off until a licensed partner completes KYC.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Bank name</label>
              <input
                type="text"
                disabled={!canManage}
                value={formData.bankName}
                onChange={(event) => setFormData({ ...formData, bankName: event.target.value })}
                className="merchant-field-input"
              />
            </div>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Account number (NUBAN)</label>
              <input
                type="text"
                maxLength={10}
                disabled={!canManage}
                value={formData.accountNumber}
                onChange={(event) => setFormData({ ...formData, accountNumber: event.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="merchant-field-input font-mono"
              />
            </div>
            <div className="merchant-field-group" style={{ gridColumn: 'span 2' }}>
              <label className="merchant-field-label">Account name</label>
              <input
                type="text"
                disabled={!canManage}
                value={formData.accountName}
                onChange={(event) => setFormData({ ...formData, accountName: event.target.value })}
                className="merchant-field-input"
              />
            </div>
          </div>
        </div>

        <div className="merchant-card" style={{ padding: '28px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f0f0f0' }}>
            <MapPin size={18} color="#2B7CFF" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Location & pickup</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Physical store / dispatch address</label>
              <input
                type="text"
                disabled={!canManage}
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                className="merchant-field-input"
              />
            </div>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Customer WhatsApp</label>
              <input
                type="text"
                disabled={!canManage}
                value={formData.whatsapp}
                onChange={(event) => setFormData({ ...formData, whatsapp: event.target.value })}
                className="merchant-field-input font-mono"
              />
            </div>
            <div className="merchant-field-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={formData.hasPhysicalStore}
                  onChange={(event) => setFormData({ ...formData, hasPhysicalStore: event.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#2B7CFF' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a' }}>
                  Customers can pick up from a physical shop
                </span>
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          {error && <span style={{ color: '#b91c1c', fontSize: '13.5px' }}>{error}</span>}
          {savedSuccess && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2B7CFF', fontSize: '13.5px', fontWeight: 600 }}>
              <Check size={16} />
              <span>Settings saved</span>
            </span>
          )}
          {canManage && (
            <button type="submit" className="merchant-btn-primary" disabled={saving} style={{ padding: '10px 24px', fontSize: '14px' }}>
              <Check size={16} />
              <span>{saving ? 'Saving…' : 'Save Store Settings'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
