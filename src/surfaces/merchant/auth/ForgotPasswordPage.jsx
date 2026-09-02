import { useState } from 'react';
import { AlertCircle, MailCheck } from 'lucide-react';
import AuthLayout from './AuthLayout';
import Field from '../../../shared/ui/Field';
import Button from '../../../shared/ui/Button';

export default function ForgotPasswordPage({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await onSubmit(email);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout
      title={sent ? 'Check your email' : 'Forgot password'}
      lead={
        sent ? (
          'Open the link we sent to choose a new password.'
        ) : (
          <>
            Remembered it? <a href="/login">Login</a>
          </>
        )
      }
      visualTitle="Reset access to your dashboard."
      visualCaption="This only resets your dashboard password."
      imageSrc="/images/auth/counter.jpg"
    >
      {sent ? (
        <>
          <div className="auth-success">
            <MailCheck size={15} />
            <span>If an account exists for <strong>{email}</strong>, a reset link is on its way.</span>
          </div>
          <a className="auth-submit" href="/login" style={{ marginTop: 16 }}>Back to login</a>
        </>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <Field id="merchant-reset-email" label="Email">
            <input
              id="merchant-reset-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          {error && (
            <div className="auth-error" role="alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
