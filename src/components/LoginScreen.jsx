import { useState } from 'react';
import { AlertCircle, Download, WifiOff } from 'lucide-react';
import { canSignIn } from '../data/permissions';
import { usePwa } from '../hooks/usePwa';
import { isSupabaseConfigured } from '../lib/supabase';
import { verifyStaffPin } from '../lib/staffAuth';
import { inferTenantSlugFromHost } from '../config/surfaces';
import { getTillStoreSlug, setTillStoreSlug, setTillStoreName } from '../lib/tillIdentity';
import AuthLayout from '../shared/auth/AuthLayout';
import Field from '../shared/ui/Field';
import Button from '../shared/ui/Button';

const MISMATCH_ERROR = "That name and PIN don't match our records. Check with your store admin.";

export default function LoginScreen({ employees, setEmployees, onLogin }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [storeSlug, setStoreSlug] = useState(() => getTillStoreSlug());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isInstallable, isOffline, openInstallModal } = usePwa();

  const hostSlug = inferTenantSlugFromHost();
  const slugLocked = Boolean(hostSlug); // real subdomain — nothing to type

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim().toLowerCase();
    const enteredPin = String(pin).trim();
    const localMatch = employees.find((employee) => employee.name.trim().toLowerCase() === trimmedName);

    if (localMatch) {
      if (!canSignIn(localMatch)) {
        setError('This account is blocked or no longer active. Contact your store admin.');
        return;
      }
      // A real local PIN (not a store-dashboard-synced record) settles it here —
      // no need to touch the network, or even know the store URL, for staff
      // the till already knows.
      if (localMatch.pin != null) {
        if (String(localMatch.pin) === enteredPin) {
          setPin('');
          onLogin(localMatch);
        } else {
          setError(MISMATCH_ERROR);
        }
        return;
      }
    }

    // No usable local record — try the store dashboard's staff list. PINs
    // there are hashed server-side (never cached locally, on purpose: a
    // 4-6 digit PIN would be trivially crackable offline from a raw hash),
    // so this step needs connectivity and a store URL.
    const slug = (hostSlug || storeSlug).trim().toLowerCase();
    if (isSupabaseConfigured && slug) {
      setSubmitting(true);
      const result = await verifyStaffPin({ storeSlug: slug, fullName: name, pin: enteredPin });
      setSubmitting(false);

      if (!result.error) {
        if (result.data.employee_type !== 'counter') {
          setError('This account is set up for online orders, not the till. Ask your manager to sign in there instead.');
          return;
        }
        if (!hostSlug) setTillStoreSlug(slug);
        if (result.data.trading_name) setTillStoreName(result.data.trading_name);
        const shadow = localMatch
          ? { ...localMatch, name: result.data.full_name }
          : {
              id: `sb-${result.data.employee_id}`,
              name: result.data.full_name,
              // Store-dashboard staff have no till-specific role yet — Manager
              // gives full standard operating rights (sell, void, discount,
              // manage inventory) without a special "admin" label.
              role: 'Manager',
              pin: null,
              status: 'active',
              source: 'supabase',
              supabaseId: result.data.employee_id,
              description: 'Synced from the store dashboard.'
            };
        if (!localMatch) setEmployees([...employees, shadow]);
        setPin('');
        onLogin(shadow);
        return;
      }
    }

    setError(
      !slug && !localMatch
        ? 'Enter your store URL below, or check your name and PIN.'
        : MISMATCH_ERROR
    );
  }

  return (
    <AuthLayout
      title="Counter sign in"
      lead="Sign in with the name and PIN your store admin set up for you to start your shift."
      visualTitle="Welcome back to the counter."
      visualCaption="Your shift, your sales, right where you left off."
      imageSrc="/images/auth/counter.jpg"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {isOffline && (
          <div className="auth-legal-note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <WifiOff size={13} />
            <span>Offline — sign-in and sales still work on this device.</span>
          </div>
        )}
        {!slugLocked && (
          <Field id="staff-store-slug" label="Store URL" hint="Only needed the first time staff from your store dashboard sign in here.">
            <input
              id="staff-store-slug"
              autoComplete="off"
              placeholder="your-store-slug (optional for local staff)"
              value={storeSlug}
              onChange={(e) => setStoreSlug(e.target.value)}
            />
          </Field>
        )}
        <Field id="staff-name" label="Name">
          <input
            id="staff-name"
            autoFocus
            autoComplete="username"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Enter your full name"
          />
        </Field>
        <Field id="staff-pin" label="PIN">
          <input
            id="staff-pin"
            type="password"
            inputMode="numeric"
            required
            maxLength={6}
            autoComplete="current-password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
            placeholder="••••"
          />
        </Field>
        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
        <Button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Clock in'}</Button>
        <p className="auth-hint" style={{ marginTop: 4 }}>
          Forgot your PIN? Ask your store admin to reset it for you.
        </p>
        {isInstallable && (
          <button type="button" className="auth-text-btn" onClick={openInstallModal}>
            <Download size={14} />
            <span>Install this app on the device</span>
          </button>
        )}
      </form>
    </AuthLayout>
  );
}
