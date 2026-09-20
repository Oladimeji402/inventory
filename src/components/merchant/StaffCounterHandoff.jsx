import { LogOut, Store } from 'lucide-react';
import './Merchant.css';

export default function StaffCounterHandoff({ staff, onSignOut }) {
  return (
    <div className="merchant-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="mx-card" style={{ maxWidth: 420, margin: '0 auto', padding: 28, textAlign: 'center' }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: 12, background: 'var(--mx-primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}
        >
          <Store size={22} color="var(--mx-primary)" />
        </div>
        <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>You&apos;re counter staff</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--mx-text-2)' }}>
          {staff?.full_name}, ask your manager to open the till (the checkout register) on this device —
          it doesn&apos;t have its own web address yet. Sign in there with your name and PIN once your
          manager has added you to the till&apos;s own staff list.
        </p>
        <button className="merchant-btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={onSignOut}>
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
