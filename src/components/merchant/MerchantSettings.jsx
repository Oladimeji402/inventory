import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { changePassword, fetchStore, updateStoreProfile } from '../../services/merchant';
import { NIGERIA_STATES, STORE_CATEGORIES, slugifyStoreName } from '../../lib/merchantConstants';
import { CORRIDORS } from '../../lib/serviceAreas';
import { checkStoreSlug } from '../../lib/slugAvailability';
import { Badge, ErrorBanner, Field, KeyValues, Notice, PageHeader, Panel, Skeleton, useAsync, useDebounced } from './ui';
import { dateOnly } from './format';

function toForm(store) {
  return {
    tradingName: store.tradingName || '',
    slug: store.slug || '',
    category: store.category || 'General Retail',
    contactPhone: store.contactPhone || '',
    address: store.address || '',
    state: store.state || '',
    city: store.city || '',
    lga: store.lga || '',
    corridor: store.corridor || '',
    hasPhysicalStore: store.hasPhysicalStore ?? true,
    acceptingOrders: store.acceptingOrders ?? true,
    businessDescription: store.businessDescription || '',
    websiteOrSocial: store.websiteOrSocial || ''
  };
}

function SettingsForm({ store, canManage, notify, onSaved }) {
  const [form, setForm] = useState(() => toForm(store));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [slugState, setSlugState] = useState(null);
  const debouncedSlug = useDebounced(form.slug, 400);
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(store));

  useEffect(() => {
    if (!debouncedSlug || debouncedSlug === store.slug) {
      setSlugState(null);
      return undefined;
    }
    let live = true;
    checkStoreSlug(debouncedSlug).then((result) => { if (live) setSlugState(result); });
    return () => { live = false; };
  }, [debouncedSlug, store.slug]);

  const slugMessage = slugState && (
    slugState.status === 'available' ? { ok: true, text: 'That address is available.' }
      : slugState.status === 'taken' ? { text: 'That address is already taken.' }
      : slugState.status === 'reserved' ? { text: 'That address is reserved.' }
      : slugState.status === 'invalid' ? { text: 'Use 2–30 letters, numbers or dashes.' }
      : { text: slugState.error || 'Could not check that address.' }
  );

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateStoreProfile(form);
      notify('Settings saved');
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const off = !canManage;
  return (
    <form onSubmit={submit} className="mc-stack">
      {off && <Notice>You can see these settings. Only the store owner can change them.</Notice>}

      <Panel title="Taking orders" subtitle="Pause your storefront when you are closed or out of capacity.">
        <label className="mc-row" style={{ cursor: off ? 'default' : 'pointer', alignItems: 'flex-start' }}>
          <button
            type="button"
            role="switch"
            aria-checked={form.acceptingOrders}
            aria-label="Accept online orders"
            className="mc-switch"
            disabled={off}
            onClick={() => setForm((f) => ({ ...f, acceptingOrders: !f.acceptingOrders }))}
          />
          <span>
            <b>{form.acceptingOrders ? 'Accepting online orders' : 'Online orders paused'}</b>
            <br /><span className="mc-hint">While paused, checkout on your storefront refuses new orders. Orders already placed and counter sales are not affected.</span>
          </span>
        </label>
      </Panel>

      <Panel title="Store identity">
        <div className="mc-form-grid">
          <Field label="Store name *" htmlFor="st-name">
            <input id="st-name" className="mc-input" required minLength={2} maxLength={80} disabled={off} value={form.tradingName} onChange={set('tradingName')} />
          </Field>
          <Field label="Category" htmlFor="st-cat">
            <select id="st-cat" className="mc-select" disabled={off} value={form.category} onChange={set('category')}>
              {(STORE_CATEGORIES.includes(form.category) ? STORE_CATEGORIES : [form.category, ...STORE_CATEGORIES]).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Store address *" htmlFor="st-slug" wide hint={slugMessage?.text || `Your link is ${window.location.origin}/store/${form.slug || 'your-store'}. Changing it breaks old links, and staff use it to sign in.`}>
            <input id="st-slug" className="mc-input mc-mono" required disabled={off} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugifyStoreName(e.target.value) }))} />
          </Field>
          <Field label="About your store" htmlFor="st-about" wide>
            <textarea id="st-about" className="mc-textarea" maxLength={500} disabled={off} value={form.businessDescription} onChange={set('businessDescription')} />
          </Field>
          <Field label="Website or social link" htmlFor="st-web" wide>
            <input id="st-web" className="mc-input" disabled={off} value={form.websiteOrSocial} onChange={set('websiteOrSocial')} placeholder="instagram.com/yourstore" />
          </Field>
        </div>
      </Panel>

      <Panel title="Contact & location">
        <div className="mc-form-grid">
          <Field label="Phone / WhatsApp" htmlFor="st-phone" hint="Shown to customers and to riders collecting orders.">
            <input id="st-phone" className="mc-input mc-mono" inputMode="tel" disabled={off} value={form.contactPhone} onChange={set('contactPhone')} />
          </Field>
          <Field label="Account email" htmlFor="st-email" hint="The email you sign in with. It can’t be changed here.">
            <input id="st-email" className="mc-input" disabled value={store.contactEmail || ''} readOnly />
          </Field>
          <Field label="Street address (where riders collect)" htmlFor="st-addr" wide>
            <input id="st-addr" className="mc-input" disabled={off} value={form.address} onChange={set('address')} />
          </Field>
          <Field label="State" htmlFor="st-state">
            <select id="st-state" className="mc-select" disabled={off} value={form.state} onChange={set('state')}>
              <option value="">Select a state</option>
              {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="City" htmlFor="st-city">
            <input id="st-city" className="mc-input" disabled={off} value={form.city} onChange={set('city')} />
          </Field>
          <Field label="Local government area (LGA)" htmlFor="st-lga">
            <input id="st-lga" className="mc-input" disabled={off} value={form.lga} onChange={set('lga')} />
          </Field>
          <Field label="Delivery area" htmlFor="st-corridor" hint="Shoppers in this area find you on the marketplace.">
            <select id="st-corridor" className="mc-select" disabled={off} value={form.corridor} onChange={set('corridor')}>
              <option value="">Not set</option>
              {(CORRIDORS.includes(form.corridor) || !form.corridor ? CORRIDORS : [form.corridor, ...CORRIDORS]).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <label className="mc-check" style={{ gridColumn: '1 / -1' }}>
            <input type="checkbox" disabled={off} checked={form.hasPhysicalStore} onChange={(e) => setForm((f) => ({ ...f, hasPhysicalStore: e.target.checked }))} />
            <span>Customers can collect orders from a physical shop</span>
          </label>
        </div>
      </Panel>

      <div className="mc-savebar">
        {error && <span className="mc-error" role="alert" style={{ margin: 0 }}>{error}</span>}
        {canManage && (
          <button type="submit" className="mc-btn mc-btn-primary" disabled={saving || !dirty || Boolean(slugMessage && !slugMessage.ok)}>
            <Check size={15} /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>
    </form>
  );
}

function PasswordPanel({ notify }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      await changePassword(password);
      notify('Password changed');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Password">
      <form onSubmit={submit} className="mc-stack" style={{ gap: 12 }}>
        <Field label="New password" htmlFor="pw-new" hint="At least 8 characters.">
          <input id="pw-new" className="mc-input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm new password" htmlFor="pw-confirm">
          <input id="pw-confirm" className="mc-input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <div className="mc-error" role="alert" style={{ margin: 0 }}>{error}</div>}
        <button type="submit" className="mc-btn" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
      </form>
    </Panel>
  );
}

export default function MerchantSettings({ onRefreshTenant, canManage, notify }) {
  const { data, loading, error, reload } = useAsync(fetchStore, []);

  const saved = async () => {
    await reload({ silent: true });
    if (onRefreshTenant) await onRefreshTenant();
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Your store profile, contact details and delivery area." />
      <ErrorBanner message={error} onRetry={reload} />
      {loading && !data && <Skeleton height={320} />}
      {data && (
        <div className="mc-grid mc-grid-detail">
          <SettingsForm key={JSON.stringify(data)} store={data} canManage={canManage} notify={notify} onSaved={saved} />
          <div className="mc-stack">
          <Panel title="Account">
            <KeyValues items={[
              ['Store status', <Badge key="s" status={data.status} />],
              ['Business verification (KYC)', <Badge key="k" status={data.kycStatus} />],
              ['Store created', dateOnly(data.createdAt)]
            ]} />
            <p className="mc-note">
              Your storefront is listed on the marketplace once Subtech sets your store to active. Business verification
              and payout setup are handled by Subtech — you can’t change these yourself.
            </p>
          </Panel>
          <PasswordPanel notify={notify} />
          </div>
        </div>
      )}
    </>
  );
}
