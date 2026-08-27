import { useState } from 'react';
import { LogIn, Download, WifiOff, RotateCcw } from 'lucide-react';
import { canSignIn } from '../data/permissions';
import { resetDemoData } from '../services/store';
import { clearTillDraft } from '../services/sessionDraft';
import { Wordmark } from './Logo';
import { usePwa } from '../hooks/usePwa';

export default function LoginScreen({ employees, onLogin }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const { isInstallable, isOffline, openInstallModal } = usePwa();

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim().toLowerCase();
    const enteredPin = String(pin).trim();
    const match = employees.find((employee) => employee.name.trim().toLowerCase() === trimmedName);

    if (!match || String(match.pin) !== enteredPin) {
      setError("That name and PIN don't match our records. Check with your store admin.");
      return;
    }

    if (!canSignIn(match)) {
      setError('This account is blocked or no longer active. Contact your store admin.');
      return;
    }

    setError('');
    setPin('');
    onLogin(match);
  }

  async function handleResetDemo() {
    if (resetting) return;
    const confirmed = window.confirm(
      'Reset this device to the demo staff, products and PINs?\n\nSaved sales on this browser will be cleared.'
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      clearTillDraft();
      await resetDemoData();
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError('Could not reset demo data. Try clearing site data in the browser.');
      setResetting(false);
    }
  }

  return (
    <div className="page-shell login-shell">
      <div className="hero-card">
        <Wordmark tagline="Retail operations, balanced." />
        <div className="hero-content">
          <div>
            <h1>Welcome back to the counter.</h1>
            <p>Sign in with the name and PIN your store admin set up for you to start your shift.</p>
          </div>
          {isInstallable && (
            <button type="button" className="login-install-banner" onClick={openInstallModal}>
              <Download size={16} />
              <span>Install Counterpoint App on this device</span>
            </button>
          )}
        </div>
      </div>

      <section className="panel login-panel">
        <div className="section-title">
          <LogIn size={16} />
          <h2>Staff sign-in</h2>
          {isOffline && (
            <div className="offline-badge" style={{ marginLeft: 'auto' }} title="Network is down — sign-in and sales still work on this device">
              <WifiOff size={13} />
              <span>Offline — sales safe</span>
            </div>
          )}
        </div>
        <form className="login-box" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="staff-name">
            Name
          </label>
          <input
            id="staff-name"
            autoFocus
            autoComplete="username"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Enter your full name"
          />

          <label className="field-label" htmlFor="staff-pin">
            PIN
          </label>
          <input
            id="staff-pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoComplete="current-password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
            placeholder="••••"
          />

          {error && <p className="helper error">{error}</p>}

          <button className="primary-btn wide" type="submit">
            Clock in
          </button>
          <p className="helper">Forgot your PIN? Ask your store admin to reset it for you.</p>
          <button type="button" className="reset-demo-btn" onClick={handleResetDemo} disabled={resetting}>
            <RotateCcw size={14} />
            {resetting ? 'Resetting…' : 'Reset demo data'}
          </button>
        </form>
      </section>
    </div>
  );
}
