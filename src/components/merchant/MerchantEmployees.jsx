import React, { useState } from 'react';
import { Plus, Users, Check, KeyRound, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import DataTable from '../../shared/ui/DataTable';
import Modal from '../../shared/ui/Modal';
import Badge from '../../shared/ui/Badge';
import { EMPLOYEE_TYPES, isValidPin } from '../../lib/employeeConstants';
import { BRAND } from '../../config/brand';

const emptyForm = { fullName: '', employeeType: 'counter', pin: '', confirmPin: '' };

function typeLabel(value) {
  return EMPLOYEE_TYPES.find((item) => item.value === value)?.label || value;
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function MerchantEmployees({
  employees = [],
  loading = false,
  canManage = true,
  onAddEmployee,
  onResetPin,
  onSetActive,
  onRemoveEmployee,
  storeSlug = ''
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addedEmployee, setAddedEmployee] = useState(null);

  const [pinTarget, setPinTarget] = useState(null);
  const [pinForm, setPinForm] = useState({ pin: '', confirmPin: '' });
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  const [busyId, setBusyId] = useState(null);

  const closeAddModal = () => {
    setIsAddOpen(false);
    setFormData(emptyForm);
    setError('');
    setAddedEmployee(null);
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError("Enter the employee's full name.");
      return;
    }
    if (!isValidPin(formData.pin)) {
      setError('PIN must be 4 to 6 digits.');
      return;
    }
    if (formData.pin !== formData.confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setSaving(true);
    const result = await onAddEmployee({
      fullName: formData.fullName,
      employeeType: formData.employeeType,
      pin: formData.pin
    });
    setSaving(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    setAddedEmployee({ ...result.data, pin: formData.pin });
  };

  const closePinModal = () => {
    setPinTarget(null);
    setPinForm({ pin: '', confirmPin: '' });
    setPinError('');
  };

  const handleResetPin = async (event) => {
    event.preventDefault();
    setPinError('');
    if (!isValidPin(pinForm.pin)) {
      setPinError('PIN must be 4 to 6 digits.');
      return;
    }
    if (pinForm.pin !== pinForm.confirmPin) {
      setPinError('PINs do not match.');
      return;
    }
    setPinSaving(true);
    const result = await onResetPin(pinTarget.id, pinForm.pin);
    setPinSaving(false);
    if (result?.error) {
      setPinError(result.error);
      return;
    }
    closePinModal();
  };

  const toggleActive = async (employee) => {
    setBusyId(employee.id);
    await onSetActive(employee.id, !employee.isActive);
    setBusyId(null);
  };

  const handleRemove = async (employee) => {
    if (!window.confirm(`Remove ${employee.fullName}? They will no longer be able to sign in.`)) return;
    setBusyId(employee.id);
    await onRemoveEmployee(employee.id);
    setBusyId(null);
  };

  return (
    <div>
      <div className="merchant-page-header">
        <div>
          <h1>Employees</h1>
          <p>Add counter staff who sign in at the till, and online sales reps who manage storefront orders here.</p>
        </div>
        {canManage && (
          <button className="merchant-btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={15} />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      <div className="mx-card">
        <DataTable
          loading={loading}
          rows={employees}
          empty={{
            icon: Users,
            title: 'No employees yet',
            desc: 'Add your first counter cashier or online sales rep to get them signing in.'
          }}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (e) => (
                <div>
                  <div style={{ fontWeight: 700 }}>{e.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--mx-text-3)' }}>Added {formatDate(e.createdAt)}</div>
                </div>
              )
            },
            {
              key: 'type',
              header: 'Role',
              render: (e) => <Badge tone={e.employeeType === 'online_rep' ? 'info' : 'neutral'}>{typeLabel(e.employeeType)}</Badge>
            },
            {
              key: 'status',
              header: 'Status',
              render: (e) => {
                if (e.lockedUntil && new Date(e.lockedUntil) > new Date()) {
                  return <Badge tone="warning">PIN locked</Badge>;
                }
                return <Badge tone={e.isActive ? 'success' : 'neutral'}>{e.isActive ? 'Active' : 'Deactivated'}</Badge>;
              }
            },
            ...(canManage ? [{
              key: 'actions',
              header: '',
              align: 'right',
              render: (e) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button
                    type="button"
                    className="merchant-icon-btn"
                    title="Reset PIN"
                    onClick={() => setPinTarget(e)}
                    disabled={busyId === e.id}
                  >
                    <KeyRound size={14} />
                  </button>
                  <button
                    type="button"
                    className="merchant-icon-btn"
                    title={e.isActive ? 'Deactivate' : 'Reactivate'}
                    onClick={() => toggleActive(e)}
                    disabled={busyId === e.id}
                  >
                    {e.isActive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                  </button>
                  <button
                    type="button"
                    className="merchant-icon-btn"
                    title="Remove"
                    onClick={() => handleRemove(e)}
                    disabled={busyId === e.id}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            }] : [])
          ]}
        />
      </div>

      <Modal
        open={isAddOpen}
        title={addedEmployee ? 'Employee added' : 'Add Employee'}
        onClose={closeAddModal}
        footer={
          addedEmployee ? (
            <button type="button" className="merchant-btn-primary" onClick={closeAddModal}>Done</button>
          ) : (
            <>
              <button type="button" className="merchant-btn-secondary" onClick={closeAddModal}>Cancel</button>
              <button type="submit" form="employee-form" className="merchant-btn-primary" disabled={saving}>
                <Check size={14} />
                <span>{saving ? 'Adding…' : 'Add Employee'}</span>
              </button>
            </>
          )
        }
      >
        {addedEmployee ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--mx-text-2)' }}>
              Share these details with <strong>{addedEmployee.fullName}</strong> so they can sign in.
              {addedEmployee.employeeType === 'counter'
                ? ' They will also need this PIN added at the till itself.'
                : ' They will sign in at your store URL, then /staff.'}
            </p>
            <div className="mx-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><strong>Name:</strong> {addedEmployee.fullName}</div>
              <div><strong>PIN:</strong> <span className="font-mono">{addedEmployee.pin}</span></div>
              {storeSlug && <div><strong>Store URL:</strong> <span className="font-mono">{storeSlug}.{BRAND.domain}</span></div>}
            </div>
          </div>
        ) : (
          <form id="employee-form" onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Full name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                className="merchant-field-input"
                placeholder="Chidinma Eze"
              />
            </div>
            <div className="merchant-field-group">
              <span className="merchant-field-label">Role</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {EMPLOYEE_TYPES.map((item) => (
                  <label
                    key={item.value}
                    className={`merchant-radio-card${formData.employeeType === item.value ? ' selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="employeeType"
                      value={item.value}
                      checked={formData.employeeType === item.value}
                      onChange={() => setFormData({ ...formData, employeeType: item.value })}
                    />
                    <span>
                      <strong style={{ display: 'block', fontSize: 13.5 }}>{item.label}</strong>
                      <span style={{ fontSize: 12, color: 'var(--mx-text-3)' }}>{item.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="merchant-field-group">
                <label className="merchant-field-label">PIN *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={formData.pin}
                  onChange={(event) => setFormData({ ...formData, pin: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="merchant-field-input font-mono"
                  placeholder="4-6 digits"
                />
              </div>
              <div className="merchant-field-group">
                <label className="merchant-field-label">Confirm PIN *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={formData.confirmPin}
                  onChange={(event) => setFormData({ ...formData, confirmPin: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="merchant-field-input font-mono"
                />
              </div>
            </div>
            {error && <div className="merchant-form-error">{error}</div>}
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(pinTarget)}
        title={pinTarget ? `Reset PIN — ${pinTarget.fullName}` : ''}
        onClose={closePinModal}
        footer={
          <>
            <button type="button" className="merchant-btn-secondary" onClick={closePinModal}>Cancel</button>
            <button type="submit" form="reset-pin-form" className="merchant-btn-primary" disabled={pinSaving}>
              <KeyRound size={14} />
              <span>{pinSaving ? 'Saving…' : 'Save new PIN'}</span>
            </button>
          </>
        }
      >
        <form id="reset-pin-form" onSubmit={handleResetPin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="merchant-field-group">
              <label className="merchant-field-label">New PIN *</label>
              <input
                type="password"
                inputMode="numeric"
                required
                maxLength={6}
                value={pinForm.pin}
                onChange={(event) => setPinForm({ ...pinForm, pin: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="merchant-field-input font-mono"
              />
            </div>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Confirm *</label>
              <input
                type="password"
                inputMode="numeric"
                required
                maxLength={6}
                value={pinForm.confirmPin}
                onChange={(event) => setPinForm({ ...pinForm, confirmPin: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="merchant-field-input font-mono"
              />
            </div>
          </div>
          {pinError && <div className="merchant-form-error">{pinError}</div>}
        </form>
      </Modal>
    </div>
  );
}
