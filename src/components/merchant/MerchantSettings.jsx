import React, { useEffect, useState } from 'react';
import { Globe2, CreditCard, MapPin, Check } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { STORE_CATEGORIES, slugifyStoreName } from '../../lib/merchantConstants';
import Card from '../../shared/ui/Card';
import { useToast } from '../../shared/ui/Toast';

export default function MerchantSettings({ storeProfile, canManage = true, onSaveSettings }) {
  const showToast = useToast();
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
    showToast('Settings saved', 'success');
  };

  return (
    <div>
      <div className="merchant-page-header">
        <h1>Store Settings &amp; Profile</h1>
        <p>These fields save to your tenant. Changing the URL re-checks availability — it is not held for anyone else.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Store identity & URL" action={<Globe2 size={18} color="var(--mx-primary)" />}>
          <div className="merchant-settings-grid">
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
              <div className="merchant-domain-input">
                <input
                  type="text"
                  required
                  disabled={!canManage}
                  value={formData.slug}
                  onChange={(event) => setFormData({ ...formData, slug: slugifyStoreName(event.target.value) })}
                  className="merchant-field-input font-mono"
                />
                <span>.{BRAND.domain}</span>
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
        </Card>

        <Card
          title="Payout account (NUBAN)"
          subtitle="Saved on your store record. Marketplace payouts stay off until a licensed partner completes KYC."
          action={<CreditCard size={18} color="var(--mx-primary)" />}
        >
          <div className="merchant-settings-grid">
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
        </Card>

        <Card title="Location & pickup" action={<MapPin size={18} color="var(--mx-primary)" />}>
          <div className="merchant-settings-grid">
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
            <label className="merchant-checkbox-row" style={{ gridColumn: 'span 2' }}>
              <input
                type="checkbox"
                disabled={!canManage}
                checked={formData.hasPhysicalStore}
                onChange={(event) => setFormData({ ...formData, hasPhysicalStore: event.target.checked })}
              />
              <span>Customers can pick up from a physical shop</span>
            </label>
          </div>
        </Card>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          {error && <span className="merchant-form-error">{error}</span>}
          {canManage && (
            <button type="submit" className="merchant-btn-primary" disabled={saving} style={{ padding: '10px 24px', fontSize: 14 }}>
              <Check size={16} />
              <span>{saving ? 'Saving…' : 'Save Store Settings'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
