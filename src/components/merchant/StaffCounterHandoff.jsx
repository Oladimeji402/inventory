import { LogOut, Store } from 'lucide-react';
import './Merchant.css';

export default function StaffCounterHandoff({ staff, onSignOut }) {
  return (
    <div className="mc-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="mc-card mc-handoff mc-handoff-card">
        <span className="mc-empty-icon"><Store size={22} /></span>
        <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>You&apos;re counter staff</h1>
        <p style={{ margin: '0 0 20px', color: 'var(--muted)', lineHeight: 1.55 }}>
          {staff?.full_name}, counter staff sell on the till, not on this website. Ask your manager to open the till on
          this device and sign in there with your name and PIN once you have been added to the till&apos;s own staff list.
        </p>
        <button type="button" className="mc-btn mc-btn-block" onClick={onSignOut}><LogOut size={14} /> Sign out</button>
      </div>
    </div>
  );
}
