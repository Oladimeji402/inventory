import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import AuthLayout from './AuthLayout';
import SearchableSelect from '../../../shared/ui/SearchableSelect';
import { BRAND } from '../../../config/brand';
import { useNigeriaLocations } from '../../../hooks/useNigeriaLocations';
import {
  ENTITY_TYPES,
  STORE_CATEGORIES,
  requiresCacNumber,
  slugifyStoreName
} from '../../../lib/merchantConstants';

const emptyForm = {
  tradingName: '',
  legalName: '',
  entityType: 'informal_trader',
  cacNumber: '',
  tin: '',
  state: 'Lagos',
  city: '',
  address: '',
  hasPhysicalStore: true,
  category: 'General Retail',
  slug: '',
  businessDescription: '',
  websiteOrSocial: '',
  bankName: '',
  accountNumber: '',
  accountName: ''
};

export default function OnboardingPage({ initialSlug = '', onComplete, onCheckSlug, ownerName }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...emptyForm, slug: initialSlug || '' });
  const [slugTouched, setSlugTouched] = useState(Boolean(initialSlug));
  const [slugStatus, setSlugStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { states, cities, citiesLoading, citiesError } = useNigeriaLocations(form.state);

  const entity = useMemo(
    () => ENTITY_TYPES.find((item) => item.value === form.entityType),
    [form.entityType]
  );

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (slugTouched || !form.tradingName) return;
    update('slug', slugifyStoreName(form.tradingName));
  }, [form.tradingName, slugTouched]);

  useEffect(() => {
    if (!form.slug || !onCheckSlug) return undefined;
    const handle = window.setTimeout(async () => {
      const result = await onCheckSlug(form.slug);
      if (result?.error) {
        setSlugStatus(result.error);
        return;
      }
      setSlugStatus(result?.available ? 'This store URL is available.' : 'That store URL is taken or reserved.');
    }, 350);
    return () => window.clearTimeout(handle);
  }, [form.slug, onCheckSlug]);

  const goNext = () => {
    setError('');
    if (step === 1) {
      if (!form.tradingName.trim()) {
        setError('Enter the name customers will see.');
        return;
      }
      if (requiresCacNumber(form.entityType) && form.cacNumber.trim().length < 5) {
        setError('Registered businesses must enter a CAC BN or RC number.');
        return;
      }
    }
    if (step === 2 && (!form.city.trim() || !form.address.trim())) {
      setError('City and store address are required for pickup and dispatch.');
      return;
    }
    if (step === 3 && !form.slug.trim()) {
      setError('Choose a store URL.');
      return;
    }
    setStep((current) => current + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.accountNumber && !/^[0-9]{10}$/.test(form.accountNumber)) {
      setError('NUBAN must be 10 digits, or leave it blank until payouts.');
      return;
    }
    setSubmitting(true);
    const result = await onComplete(form);
    setSubmitting(false);
    if (result?.error) setError(result.error);
  };

  return (
    <AuthLayout
      title={
        step === 1 ? 'Business identity'
          : step === 2 ? 'Location'
            : step === 3 ? 'Storefront'
              : 'Payouts later'
      }
      lead={
        <>
          {ownerName ? `Welcome, ${ownerName}. ` : ''}
          Step {step} of 4 — no BVN, NIN, or ID uploads.
        </>
      }
      visualTitle="Tell us about the shop."
      visualCaption="Your store URL can go live before payouts."
      imageSrc="/images/auth/grocery.jpg"
    >
      <div className="auth-steps" aria-hidden="true">
        {[1, 2, 3, 4].map((value) => (
          <span key={value} className={`auth-step-dot${value <= step ? ' active' : ''}`} />
        ))}
      </div>

      <form className="auth-form" onSubmit={step === 4 ? handleSubmit : (event) => { event.preventDefault(); goNext(); }}>
          {step === 1 && (
            <>
              <div className="auth-field">
                <label htmlFor="trading-name">Trading / store name</label>
                <input
                  id="trading-name"
                  required
                  value={form.tradingName}
                  onChange={(event) => update('tradingName', event.target.value)}
                  placeholder="Apex Health Pharmacy"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="legal-name">Legal name if different</label>
                <input
                  id="legal-name"
                  value={form.legalName}
                  onChange={(event) => update('legalName', event.target.value)}
                  placeholder="Apex Health Ventures Ltd"
                />
                <span className="auth-hint">Leave blank if you trade under the store name.</span>
              </div>
              <div className="auth-field">
                <span>How is the business registered?</span>
                <div className="auth-radio-list" role="radiogroup" aria-label="How is the business registered?">
                  {ENTITY_TYPES.map((item) => (
                    <label
                      key={item.value}
                      className={`auth-radio-card${form.entityType === item.value ? ' selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="entityType"
                        value={item.value}
                        checked={form.entityType === item.value}
                        onChange={() => update('entityType', item.value)}
                      />
                      <span className="auth-radio-copy">
                        <strong>{item.label}</strong>
                        <span>{item.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {requiresCacNumber(form.entityType) && (
                <div className="auth-field">
                  <label htmlFor="cac-number">CAC BN or RC number</label>
                  <input
                    id="cac-number"
                    required
                    value={form.cacNumber}
                    onChange={(event) => update('cacNumber', event.target.value)}
                    placeholder="BN 1234567 or RC 123456"
                  />
                  <span className="auth-hint">Number only. Do not upload the certificate until payout KYC.</span>
                </div>
              )}
              <div className="auth-field">
                <label htmlFor="tin">TIN (optional)</label>
                <input
                  id="tin"
                  value={form.tin}
                  onChange={(event) => update('tin', event.target.value)}
                  placeholder="FIRS TIN if you already have one"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="auth-grid-2">
                <div className="auth-field">
                  <label htmlFor="store-state">State</label>
                  <SearchableSelect
                    id="store-state"
                    value={form.state}
                    onChange={(state) => {
                      setForm((current) => ({ ...current, state, city: '' }));
                    }}
                    options={states}
                    placeholder="Search state"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="store-city">City / LGA</label>
                  {citiesError ? (
                    <input
                      id="store-city"
                      required
                      value={form.city}
                      onChange={(event) => update('city', event.target.value)}
                      placeholder="Type the city or LGA"
                    />
                  ) : (
                    <SearchableSelect
                      id="store-city"
                      value={form.city}
                      onChange={(city) => update('city', city)}
                      options={cities}
                      disabled={!form.state || citiesLoading || cities.length === 0}
                      placeholder={citiesLoading ? 'Loading areas…' : 'Search city or LGA'}
                      emptyMessage={form.state ? 'No matching area' : 'Select a state first'}
                    />
                  )}
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="store-address">Store / pickup address</label>
                <input
                  id="store-address"
                  required
                  value={form.address}
                  onChange={(event) => update('address', event.target.value)}
                  placeholder="Plot 14, Admiralty Way, Lekki Phase 1"
                />
              </div>
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={form.hasPhysicalStore}
                  onChange={(event) => update('hasPhysicalStore', event.target.checked)}
                />
                <span>Customers can pick up from a physical shop.</span>
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <div className="auth-field">
                <label htmlFor="store-category">Category</label>
                <select
                  id="store-category"
                  value={form.category}
                  onChange={(event) => update('category', event.target.value)}
                >
                  {STORE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="store-slug">Store URL</label>
                <input
                  id="store-slug"
                  required
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    update('slug', slugifyStoreName(event.target.value));
                  }}
                  placeholder="apex-pharmacy"
                />
                <span className="auth-hint">
                  https://{form.slug || 'your-store'}.{BRAND.domain}
                  {slugStatus ? ` — ${slugStatus}` : ''}
                </span>
              </div>
              <div className="auth-field">
                <label htmlFor="store-description">What do you sell?</label>
                <textarea
                  id="store-description"
                  value={form.businessDescription}
                  onChange={(event) => update('businessDescription', event.target.value)}
                  placeholder="Neighbourhood pharmacy and wellness shop."
                />
              </div>
              <div className="auth-field">
                <label htmlFor="store-social">Website or Instagram (optional)</label>
                <input
                  id="store-social"
                  value={form.websiteOrSocial}
                  onChange={(event) => update('websiteOrSocial', event.target.value)}
                  placeholder="instagram.com/apexpharmacy"
                />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p className="auth-legal-note">
                Bank details are optional. Marketplace payouts stay off until a licensed partner
                (Paystack or Flutterwave) completes KYC. We will then ask for CAC documents, proof
                of address, and director ID. We will not store BVN or NIN in this app.
              </p>
              <div className="auth-field">
                <label htmlFor="bank-name">Bank name (optional)</label>
                <input
                  id="bank-name"
                  value={form.bankName}
                  onChange={(event) => update('bankName', event.target.value)}
                />
              </div>
              <div className="auth-grid-2">
                <div className="auth-field">
                  <label htmlFor="account-number">NUBAN (optional)</label>
                  <input
                    id="account-number"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.accountNumber}
                    onChange={(event) => update('accountNumber', event.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="account-name">Account name (optional)</label>
                  <input
                    id="account-name"
                    value={form.accountName}
                    onChange={(event) => update('accountName', event.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-back-row">
            {step > 1 && (
              <button type="button" className="auth-secondary" onClick={() => setStep((current) => current - 1)}>
                Back
              </button>
            )}
            <button type="submit" className="auth-submit" disabled={submitting}>
              <span>{step === 4 ? (submitting ? 'Provisioning store…' : 'Finish setup') : 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
    </AuthLayout>
  );
}
