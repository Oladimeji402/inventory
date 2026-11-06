import { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import AuthLayout from '../../../shared/auth/AuthLayout';
import SearchableSelect from '../../../shared/ui/SearchableSelect';
import { useNigeriaLocations } from '../../../hooks/useNigeriaLocations';
import { MIN_RIDER_AGE, VEHICLE_TYPES, isAtLeastMinAge } from '../../../lib/riderConstants';
import { licenceLabel } from '../../../lib/riderDocuments';
import { NIGERIAN_BANKS } from '../../../lib/banks';
import { CORRIDORS } from '../../../lib/serviceAreas';

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
  corridor: '',
  vehicleType: 'motorcycle',
  vehicleMakeModel: '',
  vehiclePlateNumber: '',
  driversLicenseNumber: '',
  driversLicenseExpiry: '',
  nextOfKinName: '',
  nextOfKinPhone: '',
  guarantorName: '',
  guarantorPhone: '',
  payoutBank: '',
  payoutAccount: '',
  payoutAccountName: ''
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

  // Bicycle riders have no licence, so they skip the licence step.
  const steps = form.vehicleType === 'bicycle' ? [1, 2, 4, 5] : [1, 2, 3, 4, 5];
  const position = steps.indexOf(step);
  const isLastStep = step === 5;
  const goBack = () => setStep(steps[Math.max(0, position - 1)]);

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
      if (!form.corridor) {
        setError('Choose the area you will deliver in.');
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
    if (step === 4) {
      if (!form.payoutBank) return setError('Choose your bank.');
      if (!/^\d{10}$/.test(form.payoutAccount.trim())) return setError('Enter your 10-digit account number.');
      if (form.payoutAccountName.trim().length < 3) return setError('Enter the account name exactly as your bank shows it.');
    }
    setStep(steps[position + 1]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.nextOfKinPhone && !/^[+0-9\s-]{7,}$/.test(form.nextOfKinPhone)) {
      setError('Enter a valid next-of-kin phone number, or leave it blank.');
      return;
    }
    if (!form.guarantorName.trim() || !/^[+0-9\s()-]{7,20}$/.test(form.guarantorPhone.trim())) {
      setError("Enter your guarantor's name and a valid phone number.");
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
              : step === 4 ? 'Payout account'
                : 'Safety contacts'
      }
      lead={
        <>
          {riderName ? `Welcome, ${riderName}. ` : ''}
          Step {position + 1} of {steps.length} — you will upload your documents next.
        </>
      }
      visualTitle="Tell us about your ride."
      visualCaption="Once your documents are verified you can start picking up trips."
      imageSrc="/images/auth/rider.svg"
    >
      <div className="auth-steps" aria-hidden="true">
        {steps.map((value) => (
          <span key={value} className={`auth-step-dot${value <= step ? ' active' : ''}`} />
        ))}
      </div>

      <form className="auth-form" onSubmit={isLastStep ? handleSubmit : (event) => { event.preventDefault(); goNext(); }}>
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
            <div className="auth-field">
              <label htmlFor="rider-corridor">Area you will deliver in</label>
              <select id="rider-corridor" value={form.corridor} onChange={(event) => update('corridor', event.target.value)}>
                <option value="">Choose an area</option>
                {CORRIDORS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <span className="auth-hint">You get delivery requests from stores in this area.</span>
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
              Enter your licence number now. On the next screen you will upload photos of the
              licence and your vehicle papers so we can verify you before your first trip.
            </p>
            <div className="auth-field">
              <label htmlFor="rider-license-number">{licenceLabel(form.vehicleType)} number</label>
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
              This is where your earnings are paid. The account name must match the name on your bank
              account. You can change it later from your wallet.
            </p>
            <div className="auth-field">
              <label htmlFor="rider-bank">Bank</label>
              <select id="rider-bank" value={form.payoutBank} onChange={(event) => update('payoutBank', event.target.value)}>
                <option value="">Choose your bank</option>
                {NIGERIAN_BANKS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="auth-field">
              <label htmlFor="rider-account-number">Account number</label>
              <input
                id="rider-account-number"
                inputMode="numeric"
                maxLength={10}
                value={form.payoutAccount}
                onChange={(event) => update('payoutAccount', event.target.value.replace(/\D/g, ''))}
                placeholder="10-digit NUBAN"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="rider-account-name">Account name</label>
              <input
                id="rider-account-name"
                value={form.payoutAccountName}
                onChange={(event) => update('payoutAccountName', event.target.value)}
                placeholder="As shown by your bank"
              />
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <p className="auth-legal-note">
              Your guarantor vouches for you and is required. Next of kin is optional but
              recommended — we only call them if we cannot reach you during a trip. We do not
              collect your BVN or NIN.
            </p>
            <div className="auth-grid-2">
              <div className="auth-field">
                <label htmlFor="rider-guarantor-name">Guarantor name</label>
                <input id="rider-guarantor-name" value={form.guarantorName} onChange={(event) => update('guarantorName', event.target.value)} placeholder="Full name" />
              </div>
              <div className="auth-field">
                <label htmlFor="rider-guarantor-phone">Guarantor phone</label>
                <input id="rider-guarantor-phone" type="tel" value={form.guarantorPhone} onChange={(event) => update('guarantorPhone', event.target.value)} placeholder="+234 800 000 0000" />
              </div>
            </div>
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
            <button type="button" className="auth-secondary" onClick={goBack}>
              Back
            </button>
          )}
          <button type="submit" className="auth-submit" disabled={submitting}>
            <span>{isLastStep ? (submitting ? 'Setting up…' : 'Finish & upload documents') : 'Continue'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
