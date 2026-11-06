import { useState } from 'react';
import { Ban, CheckCircle2, KeyRound, Plus, Trash2, UserCog } from 'lucide-react';
import {
  addEmployee,
  fetchEmployees,
  removeEmployee,
  resetEmployeePin,
  setEmployeeActive
} from '../../services/merchant';
import { EMPLOYEE_TYPES, TILL_ROLES, isValidPin } from '../../lib/employeeConstants';
import { ActionDialog, Badge, DataTable, Dialog, ErrorBanner, Field, Notice, PageHeader, useAsync } from './ui';
import { dateOnly, timeAgo } from './format';

const emptyForm = { fullName: '', employeeType: 'counter', tillRole: 'Sales Representative', pin: '', confirmPin: '' };
const typeLabel = (value) => EMPLOYEE_TYPES.find((t) => t.value === value)?.label || value;
const digits = (value) => value.replace(/\D/g, '').slice(0, 6);

function PinFields({ pin, confirm, onPin, onConfirm }) {
  return (
    <div className="mc-form-grid">
      <Field label="PIN (4–6 digits)" htmlFor="emp-pin">
        <input id="emp-pin" className="mc-input mc-mono" type="password" inputMode="numeric" required maxLength={6} autoComplete="new-password" value={pin} onChange={(e) => onPin(digits(e.target.value))} />
      </Field>
      <Field label="Confirm PIN" htmlFor="emp-pin2">
        <input id="emp-pin2" className="mc-input mc-mono" type="password" inputMode="numeric" required maxLength={6} autoComplete="new-password" value={confirm} onChange={(e) => onConfirm(digits(e.target.value))} />
      </Field>
    </div>
  );
}

function AddDialog({ slug, onClose, onAdded }) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.fullName.trim()) return setError('Enter the employee’s full name.');
    if (!isValidPin(form.pin)) return setError('PIN must be 4 to 6 digits.');
    if (form.pin !== form.confirmPin) return setError('PINs do not match.');
    setBusy(true);
    try {
      const created = await addEmployee({
        fullName: form.fullName,
        employeeType: form.employeeType,
        tillRole: form.employeeType === 'counter' ? form.tillRole : undefined,
        pin: form.pin
      });
      setAdded({ name: created?.full_name || form.fullName, type: form.employeeType, pin: form.pin });
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (added) {
    return (
      <Dialog title="Employee added" onClose={onClose}>
        <p>Share these sign-in details with <b>{added.name}</b>. The PIN is not shown again — you can reset it any time.</p>
        <div className="mc-card" style={{ padding: 14, display: 'grid', gap: 6 }}>
          <div><b>Name:</b> {added.name}</div>
          <div><b>PIN:</b> <span className="mc-mono">{added.pin}</span></div>
          <div><b>Store:</b> <span className="mc-mono">{slug}</span></div>
          <div><b>Sign in at:</b> <span className="mc-mono">{window.location.origin}/staff</span></div>
        </div>
        {added.type === 'counter' && <p className="mc-note">Counter staff also need to be set up on the till device itself before they can ring up sales there.</p>}
        <div className="mc-dialog-actions"><button type="button" className="mc-btn mc-btn-primary" onClick={onClose}>Done</button></div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Add employee" onClose={busy ? () => {} : onClose} wide>
      <form onSubmit={submit}>
        <div className="mc-stack">
          <Field label="Full name" htmlFor="emp-name" hint="They sign in with this exact name, so spell it the way they will type it.">
            <input id="emp-name" className="mc-input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoFocus />
          </Field>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            <legend className="mc-label" style={{ marginBottom: 6 }}>Role</legend>
            {EMPLOYEE_TYPES.map((item) => (
              <label key={item.value} className="mc-card" style={{ padding: '10px 12px', display: 'flex', gap: 10, cursor: 'pointer', borderColor: form.employeeType === item.value ? 'var(--primary)' : undefined }}>
                <input type="radio" name="employeeType" checked={form.employeeType === item.value} onChange={() => setForm({ ...form, employeeType: item.value })} />
                <span><b>{item.label}</b><br /><span className="mc-hint">{item.hint}</span></span>
              </label>
            ))}
          </fieldset>
          {form.employeeType === 'counter' && (
            <Field label="Till permissions" htmlFor="emp-role">
              <select id="emp-role" className="mc-select" value={form.tillRole} onChange={(e) => setForm({ ...form, tillRole: e.target.value })}>
                {TILL_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
          )}
          <PinFields pin={form.pin} confirm={form.confirmPin} onPin={(pin) => setForm({ ...form, pin })} onConfirm={(confirmPin) => setForm({ ...form, confirmPin })} />
        </div>
        {error && <div className="mc-error" role="alert" style={{ margin: '14px 0 0' }}>{error}</div>}
        <div className="mc-dialog-actions">
          <button type="button" className="mc-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="mc-btn mc-btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add employee'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function ResetPinDialog({ employee, onClose, notify }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!isValidPin(pin)) return setError('PIN must be 4 to 6 digits.');
    if (pin !== confirm) return setError('PINs do not match.');
    setBusy(true);
    try {
      await resetEmployeePin(employee.id, pin);
      notify(`New PIN saved for ${employee.fullName}`);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Reset PIN — ${employee.fullName}`} onClose={busy ? () => {} : onClose}>
      <form onSubmit={submit}>
        <PinFields pin={pin} confirm={confirm} onPin={setPin} onConfirm={setConfirm} />
        <p className="mc-note">Resetting also unlocks the account if it was locked after too many wrong attempts.</p>
        {error && <div className="mc-error" role="alert" style={{ margin: '12px 0 0' }}>{error}</div>}
        <div className="mc-dialog-actions">
          <button type="button" className="mc-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="mc-btn mc-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save new PIN'}</button>
        </div>
      </form>
    </Dialog>
  );
}

export default function MerchantEmployees({ tenant, canManage, notify }) {
  const { data, loading, error, reload } = useAsync(fetchEmployees, []);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const rows = data || [];

  const toggle = async (employee) => {
    setBusyId(employee.id);
    try {
      await setEmployeeActive(employee.id, !employee.isActive);
      notify(employee.isActive ? `${employee.fullName} can no longer sign in` : `${employee.fullName} can sign in again`);
      await reload({ silent: true });
    } catch (err) {
      notify(err.message, 'bad');
    } finally {
      setBusyId(null);
    }
  };

  if (!canManage) {
    return (
      <>
        <PageHeader title="Staff" />
        <Notice tone="warn">Only the store owner can manage staff.</Notice>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Cashiers sell at your counter and online sales reps handle storefront orders. They sign in with a PIN, not an email, so you stay in control."
        actions={<button type="button" className="mc-btn mc-btn-primary" onClick={() => setAdding(true)}><Plus size={15} /> Add employee</button>}
      />
      <ErrorBanner message={error} onRetry={reload} />

      {(data || loading) && <section className="mc-card">
        <DataTable
          loading={loading && !data}
          rows={rows}
          empty={{
            icon: UserCog,
            title: 'No employees yet',
            text: 'Add a counter cashier or an online sales rep so they can work without your password.',
            action: <button type="button" className="mc-btn mc-btn-primary" onClick={() => setAdding(true)}><Plus size={15} /> Add employee</button>
          }}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (e) => <><div className="mc-cell-main">{e.fullName}</div><div className="mc-cell-sub">Added {dateOnly(e.createdAt)}</div></>
            },
            {
              key: 'role',
              header: 'Role',
              render: (e) => (
                <>
                  <Badge tone={e.employeeType === 'online_rep' ? 'info' : 'idle'}>{typeLabel(e.employeeType)}</Badge>
                  {e.employeeType === 'counter' && e.tillRole && <div className="mc-cell-sub">{e.tillRole}</div>}
                </>
              )
            },
            {
              key: 'status',
              header: 'Status',
              render: (e) => (e.lockedUntil && new Date(e.lockedUntil) > new Date()
                ? <Badge tone="warn">PIN locked</Badge>
                : <Badge tone={e.isActive ? 'ok' : 'idle'}>{e.isActive ? 'Active' : 'Deactivated'}</Badge>)
            },
            { key: 'last', header: 'Last sign-in', render: (e) => (e.lastSignInAt ? timeAgo(e.lastSignInAt) : 'Never') },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (e) => (
                <span className="mc-row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                  <button type="button" className="mc-btn mc-btn-sm" onClick={() => setResetting(e)} disabled={busyId === e.id} aria-label={`Reset PIN for ${e.fullName}`}><KeyRound size={13} /> PIN</button>
                  <button type="button" className="mc-btn mc-btn-sm" onClick={() => toggle(e)} disabled={busyId === e.id} aria-label={`${e.isActive ? 'Deactivate' : 'Reactivate'} ${e.fullName}`}>
                    {e.isActive ? <><Ban size={13} /> Deactivate</> : <><CheckCircle2 size={13} /> Reactivate</>}
                  </button>
                  <button type="button" className="mc-btn mc-btn-sm mc-btn-danger" onClick={() => setRemoving(e)} disabled={busyId === e.id} aria-label={`Remove ${e.fullName}`}><Trash2 size={13} /></button>
                </span>
              )
            }
          ]}
        />
      </section>}
      <p className="mc-note">Staff sign in at <span className="mc-mono">{window.location.origin}/staff</span> with your store URL (<span className="mc-mono">{tenant.slug}</span>), their name and PIN. Five wrong PINs lock the account for 15 minutes.</p>

      {adding && <AddDialog slug={tenant.slug} onClose={() => setAdding(false)} onAdded={() => reload({ silent: true })} />}
      {resetting && <ResetPinDialog employee={resetting} notify={notify} onClose={() => { setResetting(null); reload({ silent: true }); }} />}
      {removing && (
        <ActionDialog
          title={`Remove ${removing.fullName}?`}
          description="They will no longer be able to sign in, and this cannot be undone. Their past sales stay in your records."
          confirmLabel="Remove employee"
          tone="danger"
          onConfirm={() => removeEmployee(removing.id).then(() => { notify(`${removing.fullName} removed`); reload({ silent: true }); })}
          onClose={() => setRemoving(null)}
        />
      )}
    </>
  );
}
