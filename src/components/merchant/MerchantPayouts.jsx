import { useEffect, useState } from 'react';
import { Banknote, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react';
import { fetchPayouts, savePayoutAccount } from '../../services/merchant';
import { NIGERIAN_BANKS } from '../../lib/banks';
import { Badge, Dialog, ErrorBanner, Field, KeyValues, Notice, PageHeader, Panel, Skeleton, StatCard, useAsync } from './ui';
import { dateOnly, money, statusLabel } from './format';

function AccountDialog({ account, onClose, onSaved, notify }) {
  const [form, setForm] = useState({
    bankName: account?.bankName || '',
    accountNumber: account?.accountNumber && !String(account.accountNumber).includes('*') ? account.accountNumber : '',
    accountName: account?.accountName || ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^[0-9]{10}$/.test(form.accountNumber)) {
      setError('Account number must be 10 digits.');
      return;
    }
    setBusy(true);
    try {
      await savePayoutAccount(form);
      notify('Settlement account saved');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog title={account ? 'Change settlement account' : 'Add settlement account'} onClose={busy ? () => {} : onClose}>
      <form onSubmit={submit}>
        {account?.isVerified && (
          <Notice tone="warn" title="This account is verified">
            Saving different details removes the verification until Subtech reviews the new account.
          </Notice>
        )}
        <div className="mc-stack" style={{ marginTop: 14 }}>
          <Field label="Bank" htmlFor="pa-bank">
            <input id="pa-bank" className="mc-input" list="pa-banks" required value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Start typing your bank" />
            <datalist id="pa-banks">{NIGERIAN_BANKS.map((b) => <option key={b} value={b} />)}</datalist>
          </Field>
          <Field label="Account number (NUBAN)" htmlFor="pa-number">
            <input id="pa-number" className="mc-input mc-mono" inputMode="numeric" required maxLength={10} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          </Field>
          <Field label="Account name" htmlFor="pa-name" hint="Exactly as your bank shows it. A business account should match your registered business name.">
            <input id="pa-name" className="mc-input" required value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
          </Field>
        </div>
        {error && <div className="mc-error" role="alert" style={{ margin: '14px 0 0' }}>{error}</div>}
        <div className="mc-dialog-actions">
          <button type="button" className="mc-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="mc-btn mc-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save account'}</button>
        </div>
      </form>
    </Dialog>
  );
}

export default function MerchantPayouts({ canManage, notify, onChanged }) {
  const { data, loading, error, reload } = useAsync(fetchPayouts, []);
  const [editing, setEditing] = useState(false);
  useEffect(() => { document.title = 'Payouts & billing'; }, []);

  const account = data?.account || null;
  const collected = data?.collected || {};
  const sub = data?.subscription || null;
  const boot = loading && !data;
  const hasAccount = Boolean(account?.accountNumber);

  if (error && !data) {
    return (
      <>
        <PageHeader title="Payouts & billing" />
        <ErrorBanner message={error} onRetry={reload} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Payouts & billing" subtitle="Your settlement bank account, what customers have paid you, and your plan." />
      <ErrorBanner message={error} onRetry={reload} />

      <div style={{ marginBottom: 16 }}>
        <Notice tone="warn" title="Payouts to your bank are not switched on yet">
          Subtech does not pay merchants out automatically today, and nothing here has been paid or scheduled.
          Keep your settlement account up to date so you are ready when payouts launch. Bank-transfer and counter sales
          are already in your own hands — you confirm those yourself.
        </Notice>
      </div>

      <div className="mc-grid mc-grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Paid by card online" icon={Banknote} value={collected.onlineCard} format={money} loading={boot} hint="collected through Subtech checkout" />
        <StatCard label="Bank transfers confirmed" icon={Banknote} tint="#dcfce7" color="#16a34a" value={collected.onlineTransfer} format={money} loading={boot} hint="you confirmed receipt" delay={60} />
        <StatCard label="Counter sales" icon={Banknote} tint="#ccfbf1" color="#0f766e" value={collected.counter} format={money} loading={boot} hint="rung up at your till" delay={120} />
        <StatCard label="Transfers waiting" icon={Banknote} tint="#fef3c7" color="#d97706" value={collected.awaitingTransfer} format={money} loading={boot} hint="orders not yet confirmed" delay={180} />
      </div>
      <p className="mc-note" style={{ margin: '-4px 0 16px' }}>All-time totals for paid, non-cancelled orders, without delivery fees. These are order values, not a payout balance.</p>

      <div className="mc-grid mc-grid-2">
        <Panel
          title="Settlement account"
          action={canManage && !boot && (
            <button type="button" className="mc-btn mc-btn-sm" onClick={() => setEditing(true)}>
              <Pencil size={13} /> {hasAccount ? 'Change' : 'Add account'}
            </button>
          )}
        >
          {boot ? <Skeleton height={120} /> : hasAccount ? (
            <>
              <KeyValues items={[
                ['Bank', account.bankName],
                ['Account number', <span key="n" className="mc-mono">{account.accountNumber}</span>],
                ['Account name', account.accountName, true],
                ['Verification', account.isVerified
                  ? <Badge key="v" tone="ok"><ShieldCheck size={12} /> Verified by Subtech</Badge>
                  : <Badge key="v" tone="warn"><ShieldAlert size={12} /> Not verified yet</Badge>],
                ['Last changed', dateOnly(account.updatedAt)]
              ]} />
              <p className="mc-note">
                {account.isVerified
                  ? 'Subtech has checked this account.'
                  : 'Subtech checks settlement accounts itself; there is nothing for you to submit. Changing the details always resets verification.'}
              </p>
            </>
          ) : (
            <div className="mc-empty" style={{ padding: '24px 8px' }}>
              <strong>No settlement account yet</strong>
              Add the bank account your sales should eventually be paid into.
            </div>
          )}
        </Panel>

        <Panel title="Store status & plan">
          {boot ? <Skeleton height={120} /> : (
            <>
              <KeyValues items={[
                ['Store status', <Badge key="s" status={data?.tenantStatus} />],
                ['Business verification (KYC)', <Badge key="k" status={data?.kycStatus} />],
                sub ? ['Plan', `${statusLabel(sub.planTier)} · ${statusLabel(sub.billingCycle)}`] : null,
                sub ? ['Plan status', <Badge key="ps" status={sub.status} />] : null,
                sub ? ['Current period ends', dateOnly(sub.currentPeriodEnd)] : null
              ]} />
              <p className="mc-note">
                {sub
                  ? 'This is the plan Subtech has on record for your store. Billing is not collected through this dashboard yet, so there is nothing to pay here.'
                  : 'No subscription is on record for your store. Billing is not live, so you are not being charged through this dashboard.'}
              </p>
            </>
          )}
        </Panel>
      </div>

      {editing && <AccountDialog account={account} notify={notify} onClose={() => setEditing(false)} onSaved={() => { reload({ silent: true }); onChanged(); }} />}
    </>
  );
}
