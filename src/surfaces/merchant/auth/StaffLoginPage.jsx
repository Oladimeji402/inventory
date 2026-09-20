import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import AuthLayout from '../../../shared/auth/AuthLayout';
import Field from '../../../shared/ui/Field';
import Button from '../../../shared/ui/Button';
import { readIntendedSlug } from '../../../lib/intendedSlug';
import { inferTenantSlugFromHost } from '../../../config/surfaces';

export default function StaffLoginPage({ onSubmit }) {
  const hostSlug = inferTenantSlugFromHost();
  const [storeSlug, setStoreSlug] = useState(() => hostSlug || readIntendedSlug());
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await onSubmit({ storeSlug, fullName, pin });
    setSubmitting(false);
    if (result?.error) setError(result.error);
  };

  return (
    <AuthLayout
      title="Staff sign in"
      lead={
        <>
          Store owner? <a href="/login">Owner login</a>
        </>
      }
      visualTitle="Sign in with your PIN."
      visualCaption="Counter staff and online sales reps sign in here."
      imageSrc="/images/auth/counter.jpg"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {hostSlug ? (
          <p className="auth-legal-note">
            Signing in to <strong>{hostSlug}</strong>.
          </p>
        ) : (
          <Field id="staff-store-slug" label="Store URL" hint="The part before your store's domain.">
            <input
              id="staff-store-slug"
              required
              autoComplete="off"
              placeholder="apex-pharmacy"
              value={storeSlug}
              onChange={(event) => setStoreSlug(event.target.value)}
            />
          </Field>
        )}
        <Field id="staff-full-name" label="Your name">
          <input
            id="staff-full-name"
            required
            autoComplete="name"
            placeholder="Exactly as your manager added you"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </Field>
        <Field id="staff-pin" label="PIN">
          <input
            id="staff-pin"
            type="password"
            inputMode="numeric"
            required
            maxLength={6}
            placeholder="4-6 digits"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </Field>
        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
