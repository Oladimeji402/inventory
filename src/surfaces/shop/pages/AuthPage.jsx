import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function AuthPage({ auth, navigate, mode: initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const next = () => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('next');
    navigate(target && target.startsWith('/') ? target : '/');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');
    if (mode === 'signup') {
      if (form.fullName.trim().length < 2) return setError('Enter your full name.');
      if (!/^[+0-9\s()-]{7,20}$/.test(form.phone.trim())) return setError('Enter a valid phone number so riders can reach you.');
      if (form.password.length < 8) return setError('Use a password of at least 8 characters.');
    }
    setBusy(true);
    const result = mode === 'signup' ? await auth.signUp(form) : await auth.signIn(form);
    setBusy(false);
    if (result.error) return setError(result.error);
    if (result.needsEmailConfirmation) return setInfo('Check your email and confirm your address, then sign in.');
    next();
  };

  return (
    <div className="sh-wrap">
      <div className="sh-auth">
        <div className="sh-card">
          <div className="sh-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Create account</button>
          </div>
          <p className="sh-muted" style={{ marginTop: 0 }}>
            {mode === 'login' ? 'Sign in to see your orders and checkout faster. Riders and merchants use the same login.' : 'One account for ordering, and for riding if you sign up as a rider later.'}
          </p>
          <form onSubmit={submit}>
            {error && <div className="sh-alert sh-alert-bad" role="alert"><AlertCircle size={16} />{error}</div>}
            {info && <div className="sh-alert sh-alert-ok" role="status">{info}</div>}
            {mode === 'signup' && (
              <div className="sh-field"><label htmlFor="sh-name">Full name</label><input id="sh-name" className="sh-input" autoComplete="name" value={form.fullName} onChange={set('fullName')} required /></div>
            )}
            <div className="sh-field"><label htmlFor="sh-email">Email</label><input id="sh-email" className="sh-input" type="email" autoComplete="email" value={form.email} onChange={set('email')} required /></div>
            {mode === 'signup' && (
              <div className="sh-field"><label htmlFor="sh-phone">Phone number</label><input id="sh-phone" className="sh-input" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="0803 000 0000" required /></div>
            )}
            <div className="sh-field"><label htmlFor="sh-password">Password</label><input id="sh-password" className="sh-input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} required /></div>
            <button type="submit" className="sh-btn" style={{ width: '100%' }} disabled={busy}>
              {busy ? <Loader2 size={16} className="ad-spin" /> : null}{mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
