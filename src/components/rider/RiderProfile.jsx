import { CheckCircle2, Clock, LogOut, ShoppingBag } from 'lucide-react';
import { licenceLabel } from '../../lib/riderDocuments';
import { VEHICLE_TYPES } from '../../lib/riderConstants';
import './RiderScreens.css';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

function date(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RiderProfile({ profile, rider, onSwitchToShop, onSignOut }) {
  const vehicle = VEHICLE_TYPES.find((v) => v.value === rider?.vehicle_type);
  const verified = rider?.kyc_status === 'verified';
  const rows = [
    ['Phone', profile?.phone],
    ['Vehicle', [vehicle?.label, rider?.vehicle_make_model].filter(Boolean).join(' · ')],
    ['Plate number', rider?.vehicle_plate_number],
    [licenceLabel(rider?.vehicle_type), rider?.drivers_license_number
      ? `${rider.drivers_license_number}${rider.drivers_license_expiry ? ` · expires ${date(rider.drivers_license_expiry)}` : ''}`
      : rider?.vehicle_type === 'bicycle' ? 'Not required' : null],
    ['Delivery area', rider?.corridor],
    ['Base address', [rider?.base_address, rider?.city, rider?.state].filter(Boolean).join(', '), true],
    ['Guarantor', [rider?.guarantor_name, rider?.guarantor_phone].filter(Boolean).join(' · '), true],
    ['Next of kin', [rider?.next_of_kin_name, rider?.next_of_kin_phone].filter(Boolean).join(' · '), true]
  ];

  return (
    <div className="rs-page">
      <div className="rs-card" style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(43,124,255,.12)', color: 'var(--rider-primary)', display: 'grid', placeItems: 'center', margin: '0 auto 10px', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
          {initials(profile?.full_name)}
        </div>
        <h1 className="rs-title" style={{ margin: 0 }}>{profile?.full_name || 'Rider'}</h1>
        <div style={{ marginTop: 8 }}>
          <span className={`rs-badge ${verified ? 'rs-badge-ok' : 'rs-badge-warn'}`}>
            {verified ? <><CheckCircle2 size={12} /> Verified rider</> : <><Clock size={12} /> Verification pending</>}
          </span>
        </div>
      </div>

      <section className="rs-card">
        <dl className="rs-kv">
          {rows.map(([label, value, wide]) => (
            <div key={label} className={wide ? 'wide' : ''}>
              <dt>{label}</dt>
              <dd>{value || '—'}</dd>
            </div>
          ))}
        </dl>
        <p className="rs-muted" style={{ margin: '14px 0 0' }}>
          To change your vehicle, licence or guarantor, contact support — these are checked during verification.
        </p>
      </section>

      <button type="button" className="rs-btn rs-btn-ghost" onClick={onSwitchToShop} style={{ marginBottom: 10 }}>
        <ShoppingBag size={18} /> Switch to shopping
      </button>
      <button type="button" className="rs-btn rs-btn-ghost" onClick={onSignOut}>
        <LogOut size={18} /> Sign out
      </button>
    </div>
  );
}
