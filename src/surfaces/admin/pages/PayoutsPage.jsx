import { useMemo, useState } from 'react';
import { fetchPayouts, updatePayout } from '../../../services/admin';
import { ActionDialog, Badge, DataTable, ErrorBanner, FilterChips, Link, PageHeader, Panel, StatCard, useAsync } from '../ui';
import { count, dateTime, money } from '../format';
import { Banknote, CheckCircle2, Clock, XCircle } from 'lucide-react';

const FILTERS = ['pending', 'processing', 'completed', 'failed', 'all'];

export default function PayoutsPage({ navigate, notify, refreshKey, onChanged }) {
  const payouts = useAsync(() => fetchPayouts(null), [refreshKey]);
  const [filter, setFilter] = useState('pending');
  const [dialog, setDialog] = useState(null);

  const all = payouts.data || [];
  const sum = (status) => all.filter((p) => p.status === status).reduce((t, p) => t + Number(p.amount), 0);
  const rows = useMemo(() => all.filter((p) => filter === 'all' || p.status === filter), [all, filter]);

  const run = async (fn, message) => {
    await fn();
    notify(message);
    payouts.reload({ silent: true });
    onChanged?.();
  };

  return (
    <>
      <PageHeader title="Rider payouts" subtitle="Money riders have asked to withdraw. Send the transfer from your bank, then record the reference here." />
      <ErrorBanner message={payouts.error} onRetry={payouts.reload} />

      <div className="ad-grid ad-grid-4" style={{ marginBottom: 18 }}>
        <StatCard label="Waiting" icon={Clock} tint="#fef3c7" color="#b45309" value={sum('pending')} format={money} hint={`${count(all.filter((p) => p.status === 'pending').length)} request(s)`} delay={0} />
        <StatCard label="In progress" icon={Banknote} value={sum('processing')} format={money} hint={`${count(all.filter((p) => p.status === 'processing').length)} request(s)`} delay={60} />
        <StatCard label="Paid out" icon={CheckCircle2} tint="#dcfce7" color="#15803d" value={sum('completed')} format={money} hint={`${count(all.filter((p) => p.status === 'completed').length)} payout(s)`} delay={120} />
        <StatCard label="Failed" icon={XCircle} tint="#fee2e2" color="#b91c1c" value={sum('failed')} format={money} hint="Balance returned to riders" delay={180} />
      </div>

      <div className="ad-toolbar">
        <FilterChips value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1), count: f === 'all' ? all.length : all.filter((p) => p.status === f).length }))} />
      </div>

      <Panel flush>
        <DataTable
          loading={payouts.loading && !payouts.data}
          rows={rows}
          empty={{ title: filter === 'pending' ? 'No payouts waiting' : 'No payouts here', text: 'Rider withdrawal requests show up here.' }}
          columns={[
            { key: 'rider', header: 'Rider', render: (p) => <><Link to={`/riders/${p.riderId}`} navigate={navigate} className="ad-cell-main" style={{ color: 'inherit' }}>{p.riderName}</Link><div className="ad-cell-sub">{p.riderPhone || ''}</div></> },
            { key: 'amt', header: 'Amount', align: 'right', render: (p) => <span className="ad-mono ad-cell-main">{money(p.amount)}</span> },
            { key: 'bank', header: 'Send to', render: (p) => <><div>{p.bankName}</div><div className="ad-cell-sub ad-mono">{p.accountNumber}{p.accountName ? ` · ${p.accountName}` : ''}</div></> },
            { key: 'st', header: 'Status', render: (p) => <Badge status={p.status} /> },
            { key: 'ref', header: 'Reference / note', render: (p) => <><div className="ad-mono">{p.reference || '—'}</div>{p.adminNote && <div className="ad-cell-sub">{p.adminNote}</div>}</> },
            { key: 'time', header: 'Requested', render: (p) => dateTime(p.createdAt) },
            {
              key: 'actions', header: '', align: 'right',
              render: (p) => (p.status === 'completed' || p.status === 'failed' ? <span className="ad-cell-sub">{dateTime(p.processedAt)}</span> : (
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  {p.status === 'pending' && <button type="button" className="ad-btn ad-btn-sm" onClick={() => setDialog({ kind: 'processing', p })}>Start processing</button>}
                  <button type="button" className="ad-btn ad-btn-ok ad-btn-sm" onClick={() => setDialog({ kind: 'completed', p })}>Mark paid</button>
                  <button type="button" className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => setDialog({ kind: 'failed', p })}>Fail</button>
                </span>
              ))
            }
          ]}
        />
      </Panel>

      {dialog?.kind === 'processing' && (
        <ActionDialog title="Start processing?" description={`Marks ${money(dialog.p.amount)} for ${dialog.p.riderName} as being sent. It stays reserved from their balance.`} confirmLabel="Start processing"
          onClose={() => setDialog(null)} onConfirm={() => run(() => updatePayout(dialog.p.id, 'processing'), 'Payout marked as processing.')} />
      )}
      {dialog?.kind === 'completed' && (
        <ActionDialog title={`Mark ${money(dialog.p.amount)} as paid?`} tone="ok" confirmLabel="Mark paid"
          description={`Only after you have sent the transfer to ${dialog.p.bankName} ${dialog.p.accountNumber}. This cannot be undone.`}
          inputLabel="Bank transfer reference" inputType="input" inputRequired inputPlaceholder="Reference from your bank"
          onClose={() => setDialog(null)} onConfirm={(ref) => run(() => updatePayout(dialog.p.id, 'completed', { reference: ref }), 'Payout marked as paid.')} />
      )}
      {dialog?.kind === 'failed' && (
        <ActionDialog title="Mark payout as failed?" tone="danger" confirmLabel="Mark failed"
          description="The money returns to the rider's available balance so they can request it again."
          inputLabel="Reason" inputRequired inputPlaceholder="e.g. Account number did not match the account name"
          onClose={() => setDialog(null)} onConfirm={(note) => run(() => updatePayout(dialog.p.id, 'failed', { note }), 'Payout marked as failed; balance returned.')} />
      )}
    </>
  );
}
