import { useMemo, useState } from 'react';
import { KeyRound, UserCheck, UserX } from 'lucide-react';
import { fetchAllEmployees, resetEmployeePin, toggleEmployeeActive } from '../../../services/admin';
import { ActionDialog, Badge, DataTable, ErrorBanner, FilterChips, Link, PageHeader, Panel, SearchBox, useAsync } from '../ui';
import { dateOnly } from '../format';

const TYPE_LABELS = { counter: 'Counter till', online_rep: 'Online orders' };

/** Staff list with PIN-reset and activate/deactivate controls (used here and in store detail). */
export function StaffTable({ rows, loading, reload, notify, navigate, showStore = true }) {
  const [dialog, setDialog] = useState(null);

  const columns = [
    { key: 'name', header: 'Staff member', render: (e) => <><div className="ad-cell-main">{e.name}</div><div className="ad-cell-sub">{TYPE_LABELS[e.type] || e.type}</div></> },
    showStore && {
      key: 'store', header: 'Store',
      render: (e) => <Link to={`/stores/${e.storeId}`} navigate={navigate} className="ad-cell-main" style={{ color: 'inherit' }}>{e.storeName}</Link>
    },
    { key: 'role', header: 'Till role', render: (e) => (e.type === 'counter' ? e.role : '—') },
    { key: 'status', header: 'Status', render: (e) => (
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <Badge tone={e.isActive ? 'ok' : 'idle'}>{e.isActive ? 'Active' : 'Deactivated'}</Badge>
        {e.locked && <Badge tone="bad">PIN locked</Badge>}
      </span>
    ) },
    { key: 'added', header: 'Added', render: (e) => dateOnly(e.createdAt) },
    {
      key: 'actions', header: '', align: 'right',
      render: (e) => (
        <span style={{ display: 'inline-flex', gap: 6 }}>
          <button type="button" className="ad-btn ad-btn-sm" onClick={() => setDialog({ kind: 'pin', employee: e })}><KeyRound size={13} /> Reset PIN</button>
          <button type="button" className={`ad-btn ad-btn-sm ${e.isActive ? 'ad-btn-danger' : ''}`} onClick={() => setDialog({ kind: 'active', employee: e })}>
            {e.isActive ? <><UserX size={13} /> Deactivate</> : <><UserCheck size={13} /> Activate</>}
          </button>
        </span>
      )
    }
  ].filter(Boolean);

  return (
    <>
      <DataTable loading={loading} rows={rows} columns={columns} empty={{ title: 'No staff found', text: 'Store staff appear here once merchants add them.' }} />

      {dialog?.kind === 'pin' && (
        <ActionDialog
          title={`Reset PIN for ${dialog.employee.name}`}
          description="Choose a new 4–6 digit PIN and tell the staff member. This also clears any PIN lockout."
          inputLabel="New PIN" inputType="input" inputRequired inputPlaceholder="e.g. 4821" confirmLabel="Reset PIN"
          onClose={() => setDialog(null)}
          onConfirm={async (pin) => {
            if (!/^\d{4,6}$/.test(pin)) throw new Error('Enter a PIN of 4 to 6 digits.');
            await resetEmployeePin(dialog.employee.id, pin);
            notify(`PIN reset for ${dialog.employee.name}.`);
            reload({ silent: true });
          }}
        />
      )}
      {dialog?.kind === 'active' && (
        <ActionDialog
          title={`${dialog.employee.isActive ? 'Deactivate' : 'Activate'} ${dialog.employee.name}?`}
          description={dialog.employee.isActive ? 'They will no longer be able to sign in to the till or online-orders screen.' : 'They will be able to sign in again with their PIN.'}
          tone={dialog.employee.isActive ? 'danger' : 'ok'} confirmLabel={dialog.employee.isActive ? 'Deactivate' : 'Activate'}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await toggleEmployeeActive(dialog.employee.id, !dialog.employee.isActive);
            notify(`${dialog.employee.name} ${dialog.employee.isActive ? 'deactivated' : 'activated'}.`);
            reload({ silent: true });
          }}
        />
      )}
    </>
  );
}

export default function StaffPage({ navigate, notify, refreshKey }) {
  const staff = useAsync(fetchAllEmployees, [refreshKey]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (staff.data || []).filter((e) => {
      if (filter === 'active' && !e.isActive) return false;
      if (filter === 'inactive' && e.isActive) return false;
      if (filter === 'locked' && !e.locked) return false;
      return !term || `${e.name} ${e.storeName}`.toLowerCase().includes(term);
    });
  }, [staff.data, search, filter]);

  const all = staff.data || [];
  return (
    <>
      <PageHeader title="Store staff" subtitle="Everyone who signs in to a store's till or online-orders screen with a PIN." />
      <ErrorBanner message={staff.error} onRetry={staff.reload} />
      <div className="ad-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search staff or store" />
        <FilterChips value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'All', count: all.length },
          { value: 'active', label: 'Active', count: all.filter((e) => e.isActive).length },
          { value: 'inactive', label: 'Deactivated', count: all.filter((e) => !e.isActive).length },
          { value: 'locked', label: 'PIN locked', count: all.filter((e) => e.locked).length }
        ]} />
      </div>
      <Panel flush>
        <StaffTable rows={rows} loading={staff.loading && !staff.data} reload={staff.reload} notify={notify} navigate={navigate} />
      </Panel>
    </>
  );
}
