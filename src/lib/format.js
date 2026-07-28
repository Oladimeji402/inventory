export function naira(amount) {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function asDate(value) {
  return value instanceof Date ? value : new Date(value);
}

export function formatTime(value) {
  return asDate(value).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

export function formatClock(value) {
  return asDate(value).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
