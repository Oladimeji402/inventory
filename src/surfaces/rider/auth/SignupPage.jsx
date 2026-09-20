import { useState } from 'react';
import { AlertCircle, MailCheck } from 'lucide-react';
import AuthLayout from '../../../shared/auth/AuthLayout';
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
        lead="Open the link we sent, then come back to finish rider setup."
        visualTitle="Almost there."
        visualCaption="Confirm the account, then add your vehicle and licence details."
        imageSrc="/images/auth/rider.svg"
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
      title="Ride with us"
      lead={
        <>
          Already have an account? <a href="/login">Login</a>
        </>
      }
      visualTitle="Join the courier network."
      visualCaption="Account first. Vehicle and licence details next."
      imageSrc="/images/auth/rider.svg"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <p className="auth-legal-note">
          You must be 18 or older with a valid licence for your vehicle to ride with us.
        </p>
        <Field id="rider-full-name" label="Full name">
          <input
            id="rider-full-name"
            required
            autoComplete="name"
            placeholder="Samuel Olawale"
            value={form.fullName}
            onChange={update('fullName')}
          />
        </Field>
        <Field id="rider-email" label="Email">
          <input
            id="rider-email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={update('email')}
          />
        </Field>
        <Field id="rider-phone" label="WhatsApp / mobile number">
          <input
            id="rider-phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+234 800 000 0000"
            value={form.phone}
            onChange={update('phone')}
          />
        </Field>
        <PasswordField
          id="rider-password"
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
        />
        <PasswordField
          id="rider-confirm-password"
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
