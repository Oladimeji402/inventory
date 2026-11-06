export const DASH = '—';

export function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return DASH;
  return `₦${Math.round(Number(value)).toLocaleString('en-NG')}`;
}

/** ₦1.2M / ₦340K for tight spaces such as chart axes. */
export function moneyCompact(value) {
  const n = Number(value) || 0;
  if (n >= 1e9) return `₦${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `₦${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `₦${(n / 1e3).toFixed(0)}K`;
  return `₦${Math.round(n)}`;
}

export function count(value) {
  if (value === null || value === undefined) return DASH;
  return Number(value).toLocaleString('en-NG');
}

export function dateTime(iso) {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return DASH;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function dateOnly(iso) {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return DASH;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(iso) {
  if (!iso) return DASH;
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : dateOnly(iso);
}

export function shortId(id) {
  return id ? String(id).slice(0, 8).toUpperCase() : DASH;
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

export function percentChange(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return cur === 0 ? 0 : null; // no baseline to compare against
  return ((cur - prev) / prev) * 100;
}

/** Badge tone for any status string used across the console. */
export function statusTone(status) {
  switch (String(status || '').toLowerCase()) {
    case 'active': case 'verified': case 'approved': case 'paid': case 'delivered': case 'completed': case 'trialing':
      return 'ok';
    case 'pending': case 'pending_review': case 'unpaid': case 'processing': case 'dispatched': case 'in_progress':
      return 'warn';
    case 'suspended': case 'rejected': case 'failed': case 'cancelled': case 'past_due': case 'refunded':
      return 'bad';
    default:
      return 'idle';
  }
}

export function statusLabel(status) {
  if (!status) return DASH;
  return String(status).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export const VEHICLE_LABELS = {
  motorcycle: 'Motorcycle (okada)',
  bicycle: 'Bicycle',
  tricycle: 'Tricycle (keke / maruwa)',
  car: 'Car',
  van: 'Van'
};
