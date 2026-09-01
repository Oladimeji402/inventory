export function formatNaira(num) {
  return '₦' + Math.round(Number(num) || 0).toLocaleString();
}

export function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return 'Just now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 1) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function shortOrderId(id) {
  if (!id) return '';
  return `ORD-${String(id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function isToday(iso) {
  if (!iso) return false;
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

export function isThisMonth(iso) {
  if (!iso) return false;
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function isActiveOrder(order) {
  return order?.status === 'pending' || order?.status === 'dispatched';
}

export function countedOrder(order) {
  return order && order.status !== 'cancelled';
}
