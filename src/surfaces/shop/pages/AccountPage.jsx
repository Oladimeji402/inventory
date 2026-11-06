import { useState } from 'react';
import { AlertCircle, Bike, CheckCircle2, LogOut, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { appLinks } from '../../../config/surfaces';
import { deleteAddress, saveAddress, updateMyProfile } from '../../../services/customer';

const emptyAddress = { label: 'Home', recipient_name: '', phone: '', address: '', city: '', state: 'Lagos', is_default: false };

function AddressForm({ initial, userId, onDone, onCancel }) {
  const [form, setForm] = useState({ ...emptyAddress, ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.address.trim().length < 5) return setError('Enter the full delivery address.');
    if (form.phone && !/^[+0-9\s()-]{7,20}$/.test(form.phone.trim())) return setError('Enter a valid phone number or leave it blank.');
    setBusy(true);
    try {
      await saveAddress(userId, form);
      await onDone();
    } catch (err) {
      setError(err.message || 'Could not save this address.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      {error && <div className="sh-alert sh-alert-bad" role="alert"><AlertCircle size={16} />{error}</div>}
      <div className="sh-grid-2">
        <div className="sh-field"><label htmlFor="ad-label">Label</label><input id="ad-label" className="sh-input" value={form.label} onChange={set('label')} placeholder="Home, Office…" /></div>
        <div className="sh-field"><label htmlFor="ad-recipient">Recipient (optional)</label><input id="ad-recipient" className="sh-input" value={form.recipient_name || ''} onChange={set('recipient_name')} /></div>
      </div>
      <div className="sh-field"><label htmlFor="ad-address">Delivery address</label><input id="ad-address" className="sh-input" value={form.address} onChange={set('address')} placeholder="House number, street, area" required /></div>
      <div className="sh-grid-2">
        <div className="sh-field"><label htmlFor="ad-city">City / LGA</label><input id="ad-city" className="sh-input" value={form.city || ''} onChange={set('city')} /></div>
        <div className="sh-field"><label htmlFor="ad-phone">Phone for this address</label><input id="ad-phone" className="sh-input" type="tel" value={form.phone || ''} onChange={set('phone')} /></div>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.9rem', marginBottom: 14 }}>
        <input type="checkbox" checked={form.is_default} onChange={set('is_default')} /> Use as my default address
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="sh-btn sh-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
        <button type="button" className="sh-btn sh-btn-ghost sh-btn-sm" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}

export default function AccountPage({ auth, navigate }) {
  const [name, setName] = useState(auth.profile?.full_name || '');
  const [phone, setPhone] = useState(auth.profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [editing, setEditing] = useState(null); // null | 'new' | address

  if (!auth.user) {
    return (
      <div className="sh-wrap sh-section"><div className="sh-empty"><strong>Sign in to manage your account</strong>
        <button type="button" className="sh-btn" style={{ marginTop: 14 }} onClick={() => navigate('/login?next=/account')}>Sign in</button></div></div>
    );
  }

  const saveProfile = async (event) => {
    event.preventDefault();
    if (name.trim().length < 2) return setMessage({ kind: 'bad', text: 'Enter your full name.' });
    if (phone && !/^[+0-9\s()-]{7,20}$/.test(phone.trim())) return setMessage({ kind: 'bad', text: 'Enter a valid phone number.' });
    setSaving(true);
    try {
      await updateMyProfile(auth.user.id, { fullName: name, phone });
      await auth.refresh();
      setMessage({ kind: 'ok', text: 'Profile saved.' });
    } catch (err) {
      setMessage({ kind: 'bad', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (address) => {
    try {
      await deleteAddress(address.id);
      await auth.refresh();
    } catch (err) {
      setMessage({ kind: 'bad', text: err.message });
    }
  };

  const rider = auth.rider;
  const riderReady = rider && rider.onboarding_status === 'complete';

  return (
    <div className="sh-wrap sh-section">
      <h1 className="sh-h1">My account</h1>
      <p className="sh-sub">{auth.user.email}</p>

      {message.text && <div className={`sh-alert sh-alert-${message.kind}`} role={message.kind === 'bad' ? 'alert' : 'status'}>{message.text}</div>}

      <section className="sh-card">
        <h2>Profile</h2>
        <form onSubmit={saveProfile}>
          <div className="sh-grid-2">
            <div className="sh-field"><label htmlFor="acc-name">Full name</label><input id="acc-name" className="sh-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="sh-field"><label htmlFor="acc-phone">Phone number</label><input id="acc-phone" className="sh-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <button type="submit" className="sh-btn sh-btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>
      </section>

      <section className="sh-card">
        <div className="sh-row" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Delivery addresses</h2>
          {editing === null && <button type="button" className="sh-btn sh-btn-ghost sh-btn-sm" onClick={() => setEditing('new')}><Plus size={14} /> Add address</button>}
        </div>
        {auth.addresses.length === 0 && editing === null && <p className="sh-muted">No saved addresses yet. Add one to check out faster.</p>}
        {auth.addresses.map((a) => (
          <div key={a.id} className="sh-row" style={{ padding: '12px 0', borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={14} />{a.label}{a.is_default && <span className="sh-badge sh-badge-info">Default</span>}</div>
              <div className="sh-muted">{a.address}{a.city ? `, ${a.city}` : ''}</div>
              {a.phone && <div className="sh-muted">{a.phone}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="sh-btn sh-btn-ghost sh-btn-sm" onClick={() => setEditing(a)} aria-label={`Edit ${a.label}`}><Pencil size={13} /></button>
              <button type="button" className="sh-btn sh-btn-danger sh-btn-sm" onClick={() => remove(a)} aria-label={`Delete ${a.label}`}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {editing !== null && (
          <AddressForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            userId={auth.user.id}
            onDone={async () => { await auth.refresh(); setEditing(null); }}
            onCancel={() => setEditing(null)}
          />
        )}
      </section>

      <section className="sh-card">
        <h2>Riding with us</h2>
        {riderReady && rider.kyc_status === 'verified' ? (
          <>
            <p className="sh-muted" style={{ marginTop: 0 }}><CheckCircle2 size={14} style={{ verticalAlign: -2, color: '#16a34a' }} /> You are a verified rider on this same account.</p>
            <button type="button" className="sh-btn" onClick={() => { window.location.href = appLinks.rider(); }}><Bike size={16} /> Switch to rider mode</button>
          </>
        ) : riderReady ? (
          <>
            <p className="sh-muted" style={{ marginTop: 0 }}>Your rider application is not approved yet. Finish your documents to start delivering.</p>
            <button type="button" className="sh-btn sh-btn-ghost" onClick={() => { window.location.href = appLinks.rider(); }}>Open rider verification</button>
          </>
        ) : (
          <>
            <p className="sh-muted" style={{ marginTop: 0 }}>Earn by delivering orders. Use this same account — no new sign-up needed.</p>
            <button type="button" className="sh-btn sh-btn-ghost" onClick={() => { window.location.href = appLinks.rider(); }}><Bike size={16} /> Become a rider</button>
          </>
        )}
      </section>

      <button type="button" className="sh-btn sh-btn-ghost" onClick={async () => { await auth.signOut(); navigate('/'); }}><LogOut size={16} /> Sign out</button>
    </div>
  );
}
