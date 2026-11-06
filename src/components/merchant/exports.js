/** CSV cells that start with = + - @ would run as formulas in Excel; prefix them so they stay text. */
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename, headers, rows) {
  const blob = new Blob(['﻿', toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportOrdersCsv(rows) {
  downloadCsv(
    `orders-${stamp()}.csv`,
    ['Order', 'Placed (UTC)', 'Channel', 'Type', 'Status', 'Payment status', 'Payment method', 'Customer', 'Phone', 'Items', 'Delivery fee', 'Total'],
    rows.map((o) => [
      `ORD-${String(o.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`, o.createdAt, o.channel,
      o.channel === 'counter' ? 'counter' : o.fulfillmentType, o.status, o.paymentStatus, o.paymentMethod,
      o.customerName, o.customerPhone, o.itemCount, o.deliveryFee, o.total
    ])
  );
}

export function exportProductsCsv(rows) {
  downloadCsv(
    `products-${stamp()}.csv`,
    ['sku', 'name', 'category', 'price', 'cost', 'stock', 'low_stock_alert', 'on_storefront'],
    rows.map((p) => [p.barcode, p.name, p.category, p.price, p.cost, p.stock, p.lowStockThreshold, p.isActive ? 'yes' : 'no'])
  );
}
