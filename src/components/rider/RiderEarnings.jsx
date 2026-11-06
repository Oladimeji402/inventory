import { useState } from 'react';
import { AlertCircle, Banknote, CheckCircle2, Loader2, Pencil } from 'lucide-react';
import { cashoutRiderWallet, fetchRiderWallet, savePayoutAccount } from '../../services/rider';
import { NIGERIAN_BANKS } from '../../lib/banks';
import { useAsync } from '../../hooks/useAsync';
import { naira } from '../../lib/format';
import './RiderScreens.css';

const PAYOUT_COPY = {
  pending: { label: 'Waiting for our team', tone: 'warn' },
  processing: { label: 'Being sent', tone: 'warn' },
  completed: { label: 'Paid', tone: 'ok' },
  failed: { label: 'Failed — balance returned', tone: 'bad' }
};

function AccountForm({ initial, onSaved, onCancel }) {
  const [bank, setBank] = useState(initial?.bankName || '');
  const [number, setNumber] = useState(initial?.accountNumber || '');
  const [name, setName] = useState(initial?.accountName || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!bank) return setError('Choose your bank.');
    if (!/^\d{10}$/.test(number)) return setError('Enter your 10-digit account number.');
    if (name.trim().length < 3) return setError('Enter the account name exactly as your bank shows it.');
    setBusy(true);
    try {
      await savePayoutAccount(bank, number, name.trim());
      await onSaved();
    } catch (err) {
      setError(err.message || 'Could not save your account.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="rs-alert rs-alert-bad" role="alert"><AlertCircle size={16} />{error}</div>}
      <div className="rs-field">
        <label htmlFor="rs-bank">Bank</label>
        <select id="rs-bank" value={bank} onChange={(e) => setBank(e.target.value)}>
          <option value="">Choose your bank</option>
          {NIGERIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="rs-field">
        <label htmlFor="rs-number">Account number</label>
        <input id="rs-number" inputMode="numeric" maxLength={10} value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} placeholder="10-digit NUBAN" />
      </div>
      <div className="rs-field">
        <label htmlFor="rs-name">Account name</label>
        <input id="rs-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="As shown by your bank" />
      </div>
      <div className="rs-actions" style={{ marginTop: 4 }}>
        <button type="submit" className="rs-btn" disabled={busy} style={{ minHeight: 48 }}>{busy ? 'Saving…' : 'Save account'}</button>
        {onCancel && <button type="button" className="rs-btn rs-btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>}
      </div>
    </form>
  );
}

export default function RiderEarnings() {
  const wallet = useAsync(fetchRiderWallet, []);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const w = wallet.data;
  const hasAccount = Boolean(w?.accountNumber);

  const withdraw = async () => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      const res = await cashoutRiderWallet();
      setDone(`Payout of ${naira(res.data.amount)} requested. Our team will send it to your account.`);
      await wallet.reload();
    } catch (err) {
      setError(err.message || 'Could not request your payout.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rs-page">
      <h1 className="rs-title">Earnings</h1>
      <p className="rs-sub">What you have earned and how it reaches your bank.</p>

      {(wallet.error || error) && <div className="rs-alert rs-alert-bad" role="alert"><AlertCircle size={16} />{wallet.error || error}</div>}
      {done && <div className="rs-alert rs-alert-ok" role="status"><CheckCircle2 size={16} />{done}</div>}

      {wallet.loading && !w ? (
        <div className="rs-skel" style={{ height: 160 }} />
      ) : w && (
        <>
          <div className="rs-balance">
            <span className="rs-label">Available balance</span>
            <b>{naira(w.balance)}</b>
            <button type="button" className="rs-btn" disabled={busy || !(w.balance > 0) || !hasAccount} onClick={withdraw}>
              {busy ? <><Loader2 size={18} className="rs-spin" /> Requesting…</> : <><Banknote size={18} /> Withdraw to my bank</>}
            </button>
            {!hasAccount && <p className="rs-muted" style={{ color: '#94a3b8', margin: '10px 0 0' }}>Add your payout account below to withdraw.</p>}
          </div>

          <div className="rs-stat-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="rs-stat"><span className="rs-label">Today</span><b>{w.todayTrips}</b><span className="rs-muted">deliveries</span></div>
            <div className="rs-stat"><span className="rs-label">All-time earned</span><b>{naira(w.totalEarned)}</b></div>
          </div>

          <section className="rs-card">
            <div className="rs-row" style={{ marginBottom: 10 }}>
              <span className="rs-label">Payout account</span>
              {hasAccount && !editing && (
                <button type="button" className="rs-switch" onClick={() => setEditing(true)}><Pencil size={13} /> Change</button>
              )}
            </div>
            {hasAccount && !editing ? (
              <>
                <div className="rs-strong">{w.accountName}</div>
                <div className="rs-muted rs-mono">{w.bankName} · {w.accountNumber}</div>
                <div style={{ marginTop: 8 }}>
                  <span className={`rs-badge ${w.accountVerified ? 'rs-badge-ok' : 'rs-badge-idle'}`}>{w.accountVerified ? 'Verified' : 'Not yet verified'}</span>
                </div>
              </>
            ) : (
              <AccountForm
                initial={w}
                onSaved={async () => { setEditing(false); await wallet.reload(); }}
                onCancel={hasAccount ? () => setEditing(false) : undefined}
              />
            )}
          </section>

          <section className="rs-card" style={{ padding: '4px 16px' }}>
            <div className="rs-label" style={{ padding: '12px 0 2px' }}>Payout requests</div>
            {w.payouts.length === 0 ? (
              <p className="rs-muted" style={{ padding: '8px 0 12px', margin: 0 }}>No payout requests yet.</p>
            ) : w.payouts.map((p) => {
              const copy = PAYOUT_COPY[p.status] || PAYOUT_COPY.pending;
              return (
                <div className="rs-list-item" key={p.id}>
                  <div>
                    <div className="rs-strong rs-money">{naira(p.amount)}</div>
                    <div className="rs-muted">{new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{p.reference ? ` · Ref ${p.reference}` : ''}</div>
                  </div>
                  <span className={`rs-badge rs-badge-${copy.tone}`}>{copy.label}</span>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
