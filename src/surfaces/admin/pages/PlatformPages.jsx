import { useMemo, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { fetchAdmins, fetchAudit, setPlatformAdmin } from '../../../services/admin';
import { ActionDialog, Badge, DataTable, ErrorBanner, FilterChips, PageHeader, Panel, SearchBox, useAsync } from '../ui';
import { dateTime, timeAgo } from '../format';

const ENTITY_LABELS = { store: 'Stores', rider: 'Riders', order: 'Orders', payout: 'Payouts', employee: 'Staff', admin: 'Admins' };
const ACTION_TONE = (action) => (/reject|fail|cancel|suspend|remove/.test(action) ? 'bad' : /approve|paid|completed|verified|grant/.test(action) ? 'ok' : 'info');

export function AuditPage({ refreshKey }) {
  const audit = useAsync(() => fetchAudit(300), [refreshKey]);
  const [entity, setEntity] = useState('all');
  const [search, setSearch] = useState('');
  const all = audit.data || [];

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((a) => (entity === 'all' || a.entityType === entity) && (!term || `${a.summary} ${a.admin} ${a.action}`.toLowerCase().includes(term)));
  }, [all, entity, search]);

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every action an admin takes in this console is recorded here and cannot be edited." />
      <ErrorBanner message={audit.error} onRetry={audit.reload} />
      <div className="ad-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search actions, admins, details" />
        <FilterChips value={entity} onChange={setEntity} options={[{ value: 'all', label: 'All', count: all.length }, ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label, count: all.filter((a) => a.entityType === value).length }))]} />
      </div>
      <Panel flush>
        <DataTable
          loading={audit.loading && !audit.data}
          rows={rows}
          empty={{ title: 'No admin activity yet', text: 'Approvals, suspensions, payouts and other actions will be listed here.' }}
          columns={[
            { key: 'time', header: 'When', render: (a) => <><div>{dateTime(a.createdAt)}</div><div className="ad-cell-sub">{timeAgo(a.createdAt)}</div></> },
            { key: 'admin', header: 'Admin', render: (a) => a.admin || '—' },
            { key: 'action', header: 'Action', render: (a) => <Badge tone={ACTION_TONE(a.action)}>{a.action}</Badge> },
            { key: 'summary', header: 'Details', render: (a) => <span className="ad-cell-main">{a.summary}</span> }
          ]}
        />
      </Panel>
    </>
  );
}

export function AdminsPage({ notify, refreshKey }) {
  const admins = useAsync(fetchAdmins, [refreshKey]);
  const [email, setEmail] = useState('');
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState('');

  const grant = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim()) return;
    setDialog({ kind: 'grant', email: email.trim() });
  };

  return (
    <>
      <PageHeader title="Admins" subtitle="People who can sign in to this console. Admin access gives full control over every store, rider and payout." />
      <ErrorBanner message={admins.error || error} onRetry={admins.reload} />
      <div className="ad-grid ad-grid-main">
        <Panel flush title="Platform admins">
          <DataTable
            loading={admins.loading && !admins.data}
            rows={admins.data || []}
            empty={{ title: 'No admins found' }}
            columns={[
              { key: 'name', header: 'Admin', render: (a) => <><div className="ad-cell-main">{a.name || 'Unnamed'} {a.isYou && <Badge tone="info">You</Badge>}</div><div className="ad-cell-sub">{a.email}</div></> },
              { key: 'since', header: 'Updated', render: (a) => dateTime(a.since) },
              { key: 'act', header: '', align: 'right', render: (a) => (a.isYou ? <span className="ad-cell-sub">Cannot remove yourself</span> : (
                <button type="button" className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => setDialog({ kind: 'remove', admin: a })}><ShieldOff size={13} /> Remove access</button>
              )) }
            ]}
          />
        </Panel>
        <Panel title="Add an admin" subtitle="They must already have an account (for example, a merchant login).">
          <form onSubmit={grant}>
            <label className="ad-label" htmlFor="ad-new-admin">Account email</label>
            <input id="ad-new-admin" className="ad-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" required />
            <button type="submit" className="ad-btn ad-btn-primary" style={{ marginTop: 12 }}><ShieldCheck size={15} /> Grant admin access</button>
          </form>
        </Panel>
      </div>

      {dialog?.kind === 'grant' && (
        <ActionDialog title="Grant admin access?" confirmLabel="Grant access" tone="danger"
          description={`${dialog.email} will be able to approve riders, suspend stores, settle payouts and manage other admins.`}
          onClose={() => setDialog(null)}
          onConfirm={async () => { await setPlatformAdmin(dialog.email, true); setEmail(''); notify(`${dialog.email} is now an admin.`); admins.reload({ silent: true }); }} />
      )}
      {dialog?.kind === 'remove' && (
        <ActionDialog title={`Remove ${dialog.admin.email}?`} confirmLabel="Remove access" tone="danger"
          description="They will lose access to this console immediately."
          onClose={() => setDialog(null)}
          onConfirm={async () => { await setPlatformAdmin(dialog.admin.email, false); notify('Admin access removed.'); admins.reload({ silent: true }); }} />
      )}
    </>
  );
}
