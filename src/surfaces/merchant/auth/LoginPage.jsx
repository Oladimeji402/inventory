import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import AuthLayout from './AuthLayout';
import Field from '../../../shared/ui/Field';
import PasswordField from '../../../shared/ui/PasswordField';
import Button from '../../../shared/ui/Button';

export default function LoginPage({ onSubmit, initialError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError || '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await onSubmit({ email, password });
    setSubmitting(false);
    if (result?.error) setError(result.error);
  };

  return (
    <AuthLayout
      title="Login"
      lead={
        <>
          Don&apos;t have an account? <a href="/signup">Signup</a>
        </>
      }
      visualTitle="Your store stays live."
      visualCaption="Orders, inventory, and riders in one dashboard."
      imageSrc="/images/auth/counter.jpg"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <Field id="merchant-login-email" label="Email">
          <input
            id="merchant-login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <PasswordField
          id="merchant-login-password"
          label="Password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="auth-row-between">
          <a className="auth-forgot" href="/forgot">Forgot Password?</a>
        </div>
        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Login'}
        </Button>
      </form>
    </AuthLayout>
  );
}
