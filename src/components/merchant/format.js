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

/** Order reference shown to humans, e.g. ORD-1A2B3C4D (searchable in the orders list). */
export function shortOrderId(id) {
  if (!id) return DASH;
  return `ORD-${String(id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
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

/** "2026-11-04" -> "4 Nov" without a timezone shift. */
export function shortDay(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  if (!y || !m || !d) return String(isoDate);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function longDay(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  if (!y || !m || !d) return String(isoDate);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function hourLabel(hour) {
  const h = Number(hour) || 0;
  const suffix = h < 12 ? 'am' : 'pm';
  return `${h % 12 === 0 ? 12 : h % 12}${suffix}`;
}

export function statusLabel(status) {
  if (!status) return DASH;
  return String(status).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export const ORDER_STATUS_LABEL = {
  pending: 'Open',
  dispatched: 'Out for delivery',
  delivered: 'Completed',
  cancelled: 'Cancelled'
};

/** Badge tone for any status string used across the dashboard. */
export function statusTone(status) {
  switch (String(status || '').toLowerCase()) {
    case 'active': case 'verified': case 'approved': case 'paid': case 'delivered': case 'completed':
      return 'ok';
    case 'pending': case 'pending_review': case 'unpaid': case 'processing': case 'trialing': case 'not_started':
      return 'warn';
    case 'dispatched': case 'in_transit':
      return 'info';
    case 'suspended': case 'rejected': case 'failed': case 'cancelled': case 'past_due': case 'refunded':
      return 'bad';
    default:
      return 'idle';
  }
}

/**
 * What the shop floor should do next with an order. Mirrors the rules enforced by
 * merchant_transition_order in the database, so the UI never offers a move it will refuse.
 */
export function nextOrderStep(order) {
  if (!order) return { key: 'none', title: '', text: '' };
  if (order.status === 'cancelled') {
    return { key: 'cancelled', title: 'Cancelled', text: order.voidReason ? `Reason: ${order.voidReason}` : 'This order was cancelled.' };
  }
  if (order.status === 'delivered') {
    return { key: 'done', title: 'Completed', text: order.channel === 'counter' ? 'Sold at the counter.' : 'This order is complete.' };
  }
  if (order.paymentStatus !== 'paid') {
    return order.paymentMethod === 'Transfer'
      ? { key: 'confirm_payment', title: 'Waiting for bank transfer', text: 'Check your bank account. When the money has arrived, confirm it here to release the order.' }
      : { key: 'await_card', title: 'Waiting for card payment', text: 'The shopper has not finished paying. If they never do, the stock is released automatically.' };
  }
  if (order.status === 'pending') {
    if (order.fulfillmentType === 'pickup') {
      return order.readyAt
        ? { key: 'handover', title: 'Ready for customer pickup', text: 'Hand the order over when the customer arrives, then complete it.' }
        : { key: 'pack_pickup', title: 'Pack this pickup order', text: 'Pack the items and mark the order ready so the customer can collect it.' };
    }
    return order.readyAt
      ? { key: 'await_rider', title: 'Packed — waiting for a rider', text: 'Subtech riders in your area can claim this order now. A rider will appear here once they accept.' }
      : { key: 'pack', title: 'Pack this order', text: 'Pack the items, then mark the order ready so riders and your team know it can be collected.' };
  }
  // dispatched
  return order.hasRider || order.rider
    ? { key: 'rider_delivering', title: 'Out for delivery', text: 'A Subtech rider has this order. It completes when they confirm the customer’s code.' }
    : { key: 'self_delivering', title: 'Out for delivery (your own rider)', text: 'You are delivering this yourself. Confirm it once the customer has received it.' };
}
