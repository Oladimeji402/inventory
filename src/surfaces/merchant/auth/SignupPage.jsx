import { useEffect, useState } from 'react';
import { AlertCircle, MailCheck } from 'lucide-react';
import AuthLayout from './AuthLayout';
import Field from '../../../shared/ui/Field';
import PasswordField from '../../../shared/ui/PasswordField';
import Button from '../../../shared/ui/Button';
import { BRAND } from '../../../config/brand';
import { readIntendedSlug, saveIntendedSlug } from '../../../lib/intendedSlug';
import { slugifyStoreName } from '../../../lib/merchantConstants';

export default function SignupPage({ onSubmit, initialError, intendedSlug = '' }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [checkEmail, setCheckEmail] = useState(false);
  const [slug] = useState(() => slugifyStoreName(intendedSlug || readIntendedSlug()));

  useEffect(() => {
    if (slug) saveIntendedSlug(slug);
  }, [slug]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      password: form.password,
      intendedSlug: slug
    });
    setSubmitting(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.needsEmailConfirmation) {
      setCheckEmail(true);
    }
  };

  if (checkEmail) {
    return (
      <AuthLayout
        title="Check your email"
        lead="Open the link we sent, then come back to finish setting up the store."
        visualTitle="Almost there."
        visualCaption="Confirm the account, then finish store setup to keep your URL."
        imageSrc="/images/auth/counter.jpg"
      >
        <div className="auth-success">
          <MailCheck size={15} />
          <span>Sent to <strong>{form.email}</strong>.</span>
        </div>
        <a className="auth-submit" href="/login" style={{ marginTop: 16 }}>Go to login</a>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Signup"
      lead={
        <>
          Already have an account? <a href="/login">Login</a>
        </>
      }
      visualTitle="Open a storefront in a few minutes."
      visualCaption="Account first. Store details next."
      imageSrc="/images/auth/grocery.jpg"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {slug && (
          <p className="auth-legal-note">
            You’ll confirm <strong>{slug}.{BRAND.domain}</strong> in store setup.
            It’s free right now — not held until you finish.
          </p>
        )}
        <Field id="merchant-full-name" label="Full name">
          <input
            id="merchant-full-name"
            required
            autoComplete="name"
            placeholder="Adeola Balogun"
            value={form.fullName}
            onChange={update('fullName')}
          />
        </Field>
        <Field id="merchant-email" label="Work email">
          <input
            id="merchant-email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={update('email')}
          />
        </Field>
        <Field id="merchant-phone" label="WhatsApp / mobile number">
          <input
            id="merchant-phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+234 800 000 0000"
            value={form.phone}
            onChange={update('phone')}
          />
        </Field>
        <PasswordField
          id="merchant-password"
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
        />
        <PasswordField
          id="merchant-confirm-password"
          label="Confirm password"
          placeholder="Re-enter password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
        />
        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
