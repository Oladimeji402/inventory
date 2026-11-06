import { AlertCircle } from 'lucide-react';
import '../../components/merchant/Merchant.css';

/** Shown when we are signed in but could not load the store account — never mistaken for "no store yet". */
export default function AccountLoadError({ message, onRetry, onSignOut }) {
  return (
    <div className="mc-root" style={{ alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="mc-card mc-handoff-card" style={{ maxWidth: 440, textAlign: 'center' }} role="alert">
        <span className="mc-empty-icon" style={{ background: 'var(--danger-tint)', color: 'var(--danger-dark)' }}><AlertCircle size={22} /></span>
        <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>We couldn&apos;t load your store</h1>
        <p style={{ margin: '0 0 6px', color: 'var(--muted)', lineHeight: 1.55 }}>{message}</p>
        <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: '0.85rem' }}>Your store and its data are safe — this is only a loading problem.</p>
        <div className="mc-row" style={{ justifyContent: 'center' }}>
          <button type="button" className="mc-btn mc-btn-primary" onClick={() => onRetry()}>Try again</button>
          <button type="button" className="mc-btn" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
