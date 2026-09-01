import { useState } from 'react';
import AuthLayout from './AuthLayout';
import Field from '../../../shared/ui/Field';
import PasswordField from '../../../shared/ui/PasswordField';
import Button from '../../../shared/ui/Button';

export default function SignupPage({ onSubmit, initialError }) {
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
      password: form.password
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
        visualCaption="Confirm the account, then pick your store URL."
        imageSrc="/images/auth/counter.jpg"
      >
        <p className="auth-form-lead" style={{ marginTop: 0 }}>
          Sent to <strong>{form.email}</strong>.
        </p>
        <a className="auth-submit" href="/login">Go to login</a>
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
        {error && <div className="auth-error">{error}</div>}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
