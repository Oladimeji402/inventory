import { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import AuthLayout from '../../../shared/auth/AuthLayout';
import SearchableSelect from '../../../shared/ui/SearchableSelect';
import { useNigeriaLocations } from '../../../hooks/useNigeriaLocations';
import { MIN_RIDER_AGE, VEHICLE_TYPES, isAtLeastMinAge } from '../../../lib/riderConstants';

/**
 * Deliberately no `max` attribute on the date input: browsers silently block
 * native form submission on a range-overflow date (no submit event fires at
 * all), which would skip our friendly age-check message below and just look
 * broken. The hint text plus isAtLeastMinAge() below is the real gate.
 */

const emptyForm = {
  dateOfBirth: '',
  state: 'Lagos',
  city: '',
  baseAddress: '',
  vehicleType: 'motorcycle',
  vehicleMakeModel: '',
  vehiclePlateNumber: '',
  driversLicenseNumber: '',
  driversLicenseExpiry: '',
  nextOfKinName: '',
  nextOfKinPhone: ''
};

export default function OnboardingPage({ onComplete, riderName }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { states, cities, citiesLoading, citiesError } = useNigeriaLocations(form.state);

  const vehicle = useMemo(
    () => VEHICLE_TYPES.find((item) => item.value === form.vehicleType),
    [form.vehicleType]
  );

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const goNext = () => {
    setError('');
    if (step === 1) {
      if (!isAtLeastMinAge(form.dateOfBirth)) {
        setError(`You must be at least ${MIN_RIDER_AGE} years old to ride with us.`);
        return;
      }
      if (!form.city.trim() || !form.baseAddress.trim()) {
        setError('City and a base address are required so we can route trips to you.');
        return;
      }
    }
    if (step === 2 && !form.vehiclePlateNumber.trim() && form.vehicleType !== 'bicycle') {
      setError('Enter the vehicle plate number.');
      return;
    }
    if (step === 3 && form.driversLicenseNumber.trim().length < 5) {
      setError('Enter a valid driver\'s / rider\'s licence number.');
      return;
    }
    setStep((current) => current + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.nextOfKinPhone && !/^[+0-9\s-]{7,}$/.test(form.nextOfKinPhone)) {
      setError('Enter a valid next-of-kin phone number, or leave it blank.');
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
        step === 1 ? 'About you'
          : step === 2 ? 'Vehicle'
            : step === 3 ? 'Licence'
              : 'Emergency contact'
      }
      lead={
        <>
          {riderName ? `Welcome, ${riderName}. ` : ''}
          Step {step} of 4 — no NIN, BVN, or ID uploads.
        </>
      }
      visualTitle="Tell us about your ride."
      visualCaption="You can start picking up trips as soon as this is done."
      imageSrc="/images/auth/rider.svg"
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
              <label htmlFor="rider-dob">Date of birth</label>
              <input
                id="rider-dob"
                type="date"
                required
                value={form.dateOfBirth}
                onChange={(event) => update('dateOfBirth', event.target.value)}
              />
              <span className="auth-hint">You must be {MIN_RIDER_AGE}+ to ride with us.</span>
            </div>
            <div className="auth-grid-2">
              <div className="auth-field">
                <label htmlFor="rider-state">State</label>
                <SearchableSelect
                  id="rider-state"
                  value={form.state}
                  onChange={(state) => setForm((current) => ({ ...current, state, city: '' }))}
                  options={states}
                  placeholder="Search state"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="rider-city">City / LGA</label>
                {citiesError ? (
                  <input
                    id="rider-city"
                    required
                    value={form.city}
                    onChange={(event) => update('city', event.target.value)}
                    placeholder="Type the city or LGA"
                  />
                ) : (
                  <SearchableSelect
                    id="rider-city"
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
              <label htmlFor="rider-base-address">Base address / pickup area</label>
              <input
                id="rider-base-address"
                required
                value={form.baseAddress}
                onChange={(event) => update('baseAddress', event.target.value)}
                placeholder="Where you usually start your day from"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="auth-field">
              <span>What do you ride?</span>
              <div className="auth-radio-list" role="radiogroup" aria-label="What do you ride?">
                {VEHICLE_TYPES.map((item) => (
                  <label
                    key={item.value}
                    className={`auth-radio-card${form.vehicleType === item.value ? ' selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="vehicleType"
                      value={item.value}
                      checked={form.vehicleType === item.value}
                      onChange={() => update('vehicleType', item.value)}
                    />
                    <span className="auth-radio-copy">
                      <strong>{item.label}</strong>
                      <span>{item.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="rider-vehicle-make">Make / model (optional)</label>
              <input
                id="rider-vehicle-make"
                value={form.vehicleMakeModel}
                onChange={(event) => update('vehicleMakeModel', event.target.value)}
                placeholder="Yamaha YBR 125cc"
              />
            </div>
            {vehicle?.value !== 'bicycle' && (
              <div className="auth-field">
                <label htmlFor="rider-vehicle-plate">Plate number</label>
                <input
                  id="rider-vehicle-plate"
                  required
                  value={form.vehiclePlateNumber}
                  onChange={(event) => update('vehiclePlateNumber', event.target.value.toUpperCase())}
                  placeholder="KJA-482-XD"
                />
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <p className="auth-legal-note">
              Number only — do not upload a photo of your licence yet. We ask for that later,
              alongside insurance, only when a licensed payment partner completes payout KYC.
            </p>
            <div className="auth-field">
              <label htmlFor="rider-license-number">Driver&apos;s / rider&apos;s licence number</label>
              <input
                id="rider-license-number"
                required
                value={form.driversLicenseNumber}
                onChange={(event) => update('driversLicenseNumber', event.target.value.toUpperCase())}
                placeholder="FRSC licence number"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="rider-license-expiry">Licence expiry date (optional)</label>
              <input
                id="rider-license-expiry"
                type="date"
                value={form.driversLicenseExpiry}
                onChange={(event) => update('driversLicenseExpiry', event.target.value)}
              />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="auth-legal-note">
              Optional, but recommended for road safety — we will only contact this person if we
              cannot reach you during an active trip. We will not store BVN or NIN in this app.
            </p>
            <div className="auth-field">
              <label htmlFor="rider-nok-name">Next of kin name</label>
              <input
                id="rider-nok-name"
                value={form.nextOfKinName}
                onChange={(event) => update('nextOfKinName', event.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="rider-nok-phone">Next of kin phone</label>
              <input
                id="rider-nok-phone"
                type="tel"
                value={form.nextOfKinPhone}
                onChange={(event) => update('nextOfKinPhone', event.target.value)}
                placeholder="+234 800 000 0000"
              />
            </div>
          </>
        )}

        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="auth-back-row">
          {step > 1 && (
            <button type="button" className="auth-secondary" onClick={() => setStep((current) => current - 1)}>
              Back
            </button>
          )}
          <button type="submit" className="auth-submit" disabled={submitting}>
            <span>{step === 4 ? (submitting ? 'Setting up…' : 'Finish setup') : 'Continue'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
