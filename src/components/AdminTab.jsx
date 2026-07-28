import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { STAFF_ROLES, staffStatus } from '../data/permissions';

const PAGE_SIZE = 5;

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'fired', label: 'Fired' }
];

const emptyForm = { name: '', pin: '', role: 'Sales Representative' };

function statusLabel(status) {
  if (status === 'blocked') return 'Blocked';
  if (status === 'fired') return 'Fired';
  return 'Active';
}

export default function AdminTab({
  employees,
  currentEmployeeId,
  onAddStaff,
  onPromote,
  onRename,
  onResetPin,
  onBlock,
  onUnblock,
  onFire,
  onReinstate
}) {
  const [view, setView] = useState('directory');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [pendingFire, setPendingFire] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [pinError, setPinError] = useState('');
  const [nameError, setNameError] = useState('');

  const counts = useMemo(() => {
    const totals = { all: employees.length, active: 0, blocked: 0, fired: 0 };
    employees.forEach((employee) => {
      const status = staffStatus(employee);
      if (totals[status] !== undefined) totals[status] += 1;
    });
    return totals;
  }, [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .filter((employee) => (filter === 'all' ? true : staffStatus(employee) === filter))
      .filter((employee) => {
        if (!q) return true;
        return (
          employee.name.toLowerCase().includes(q) ||
          String(employee.id).toLowerCase().includes(q) ||
          employee.role.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selected = employees.find((employee) => employee.id === selectedId) || null;

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  useEffect(() => {
    if (!selected) {
      setShowPin(false);
      setPinDraft('');
      setNameDraft('');
      setPendingFire(false);
      setPinError('');
      setNameError('');
      return;
    }
    setNameDraft(selected.name);
    setPinDraft('');
    setShowPin(false);
    setPendingFire(false);
    setPinError('');
    setNameError('');
  }, [selectedId, selected?.name, selected?.pin]);

  function submitStaff(e) {
    e.preventDefault();
    const name = form.name.trim();
    const pin = form.pin.trim();

    if (!name || pin.length < 4) {
      setFormError('Enter a full name and a PIN of at least 4 digits.');
      return;
    }

    const result = onAddStaff({ name, pin, role: form.role });
    if (result?.error) {
      setFormError(result.error);
      return;
    }

    setForm(emptyForm);
    setFormError('');
    setView('directory');
    if (result?.employee?.id) {
      setSelectedId(result.employee.id);
      setQuery(result.employee.name);
      setFilter('all');
    }
  }

  function saveName() {
    if (!selected) return;
    const next = nameDraft.trim();
    if (!next) {
      setNameError('Name cannot be empty.');
      return;
    }
    const result = onRename(selected.id, next);
    if (result?.error) {
      setNameError(result.error);
      return;
    }
    setNameError('');
  }

  function savePin() {
    if (!selected) return;
    if (pinDraft.length < 4) {
      setPinError('PIN must be at least 4 digits.');
      return;
    }
    const result = onResetPin(selected.id, pinDraft);
    if (result?.error) {
      setPinError(result.error);
      return;
    }
    setPinDraft('');
    setPinError('');
    setShowPin(false);
  }

  const isSelf = selected?.id === currentEmployeeId;
  const status = selected ? staffStatus(selected) : null;
  const isFired = status === 'fired';
  const isBlocked = status === 'blocked';

  return (
    <div className="admin-layout">
      <aside className="panel admin-sidebar">
        <div className="section-title">
          <Users size={16} />
          <h2>Admin</h2>
        </div>

        <nav className="admin-nav">
          <button className={`admin-nav-btn ${view === 'directory' ? 'active' : ''}`} onClick={() => setView('directory')}>
            <Users size={15} />
            Staff directory
          </button>
          <button className={`admin-nav-btn ${view === 'add' ? 'active' : ''}`} onClick={() => setView('add')}>
            <UserPlus size={15} />
            Add staff
          </button>
        </nav>

        <div className="admin-side-stats">
          <div><span>Total</span><strong className="mono">{counts.all}</strong></div>
          <div><span>Active</span><strong className="mono">{counts.active}</strong></div>
          <div><span>Blocked</span><strong className="mono">{counts.blocked}</strong></div>
          <div><span>Fired</span><strong className="mono">{counts.fired}</strong></div>
        </div>

        <div className="alert-box admin-note">
          <ShieldAlert size={14} />
          Only store admins see this panel. PINs stay private to this screen.
        </div>
      </aside>

      <div className="admin-main">
        {view === 'add' ? (
          <section className="panel">
            <div className="section-title">
              <UserPlus size={16} />
              <h2>Add new staff</h2>
            </div>
            <p className="helper">
              New staff sign in with the exact name and PIN you set here. Share credentials privately.
            </p>
            <form className="inventory-form" onSubmit={submitStaff}>
              <label className="field-label" htmlFor="new-staff-name">Full name</label>
              <input
                id="new-staff-name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setFormError('');
                }}
                placeholder="e.g. Chidi Okonkwo"
              />

              <label className="field-label" htmlFor="new-staff-pin">PIN (4–6 digits)</label>
              <input
                id="new-staff-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={form.pin}
                onChange={(e) => {
                  setForm({ ...form, pin: e.target.value.replace(/\D/g, '') });
                  setFormError('');
                }}
                placeholder="••••"
              />

              <label className="field-label" htmlFor="new-staff-role">Starting role</label>
              <select
                id="new-staff-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              {formError && <p className="helper error">{formError}</p>}
              <button className="primary-btn" type="submit">Add staff member</button>
            </form>
          </section>
        ) : (
          <div className="admin-directory">
            <section className="panel">
              <div className="section-title">
                <Users size={16} />
                <h2>Staff directory</h2>
              </div>

              <div className="admin-toolbar">
                <div className="search-field">
                  <Search size={15} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, ID or role"
                    aria-label="Search staff"
                  />
                </div>
                <div className="category-chips">
                  {STATUS_FILTERS.map((item) => (
                    <button
                      key={item.id}
                      className={`chip ${filter === item.id ? 'active' : ''}`}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="staff-table-wrap">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>ID</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="empty-cell">No staff match this search or filter.</td>
                      </tr>
                    )}
                    {pageItems.map((employee) => {
                      const rowStatus = staffStatus(employee);
                      return (
                        <tr
                          key={employee.id}
                          className={selectedId === employee.id ? 'selected' : ''}
                          onClick={() => setSelectedId(employee.id)}
                        >
                          <td>
                            <strong>{employee.name}</strong>
                            {employee.id === currentEmployeeId && <span className="you-tag">You</span>}
                          </td>
                          <td className="mono">{employee.id}</td>
                          <td>{employee.role}</td>
                          <td><span className={`status-pill ${rowStatus}`}>{statusLabel(rowStatus)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <button
                  className="secondary-btn icon-only"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="mono">
                  Page {currentPage} of {totalPages} · {filtered.length} staff
                </span>
                <button
                  className="secondary-btn icon-only"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </section>

            <section className="panel staff-detail">
              {!selected ? (
                <div className="empty-state">Select a staff member to view details, check or reset their PIN, promote, block or fire.</div>
              ) : (
                <>
                  <div className="staff-card-head">
                    <div>
                      <strong>{selected.name}</strong>
                      <p className="mono">{selected.id}</p>
                    </div>
                    <span className={`status-pill ${status}`}>{statusLabel(status)}</span>
                  </div>

                  <div className="staff-card-meta">
                    <label className="field-label" htmlFor="detail-name">Display name</label>
                    <div className="inline-edit">
                      <input
                        id="detail-name"
                        value={nameDraft}
                        disabled={isFired}
                        onChange={(e) => {
                          setNameDraft(e.target.value);
                          setNameError('');
                        }}
                      />
                      <button className="secondary-btn" type="button" disabled={isFired || nameDraft.trim() === selected.name} onClick={saveName}>
                        Save
                      </button>
                    </div>
                    {nameError && <p className="helper error">{nameError}</p>}
                  </div>

                  <div className="staff-card-meta">
                    <label className="field-label" htmlFor={`role-${selected.id}`}>Role</label>
                    <select
                      id={`role-${selected.id}`}
                      value={selected.role}
                      disabled={isFired || isSelf}
                      onChange={(e) => onPromote(selected.id, e.target.value)}
                    >
                      {STAFF_ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    {isSelf && <p className="helper">You cannot change your own role here.</p>}
                  </div>

                  <div className="staff-card-meta pin-box">
                    <div className="pin-head">
                      <label className="field-label">Login PIN</label>
                      <button
                        type="button"
                        className="link-btn pin-toggle"
                        onClick={() => setShowPin((value) => !value)}
                      >
                        {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showPin ? 'Hide PIN' : 'Show PIN'}
                      </button>
                    </div>
                    <div className="pin-display mono">
                      {showPin ? selected.pin : '••••••'}
                    </div>

                    <label className="field-label" htmlFor="reset-pin">
                      <KeyRound size={13} /> Set new PIN
                    </label>
                    <div className="inline-edit">
                      <input
                        id="reset-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={pinDraft}
                        disabled={isFired}
                        onChange={(e) => {
                          setPinDraft(e.target.value.replace(/\D/g, ''));
                          setPinError('');
                        }}
                        placeholder="New 4–6 digit PIN"
                      />
                      <button className="secondary-btn" type="button" disabled={isFired || pinDraft.length < 4} onClick={savePin}>
                        Update PIN
                      </button>
                    </div>
                    {pinError && <p className="helper error">{pinError}</p>}
                  </div>

                  <div className="staff-actions">
                    {isSelf ? (
                      <p className="helper">Status actions are locked on your own account. You can still reset your PIN above.</p>
                    ) : isFired ? (
                      <button className="secondary-btn" onClick={() => onReinstate(selected.id)}>Reinstate</button>
                    ) : (
                      <>
                        {isBlocked ? (
                          <button className="secondary-btn" onClick={() => onUnblock(selected.id)}>Unblock</button>
                        ) : (
                          <button className="secondary-btn" onClick={() => onBlock(selected.id)}>Block</button>
                        )}

                        {pendingFire ? (
                          <div className="confirm-inline">
                            <span>Fire this staff member?</span>
                            <button
                              className="danger-btn"
                              onClick={() => {
                                onFire(selected.id);
                                setPendingFire(false);
                              }}
                            >
                              Confirm fire
                            </button>
                            <button className="link-btn" onClick={() => setPendingFire(false)}>Cancel</button>
                          </div>
                        ) : (
                          <button className="danger-btn" onClick={() => setPendingFire(true)}>Fire</button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
