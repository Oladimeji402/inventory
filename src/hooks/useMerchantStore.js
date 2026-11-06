import { timeAgo } from '../lib/formatMoney';

/**
 * Shapes the raw rows returned by the PIN-staff order functions (snake_case
 * store_orders rows with nested order_items) for the staff screens. The owner
 * dashboard no longer loads whole tables in the browser: it calls the tenant-scoped
 * functions in src/services/merchant.js instead.
 */
function mapOrderItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: Number(row.quantity) || 0,
    unitPrice: Number(row.unit_price) || 0,
    lineTotal: Number(row.line_total) || 0
  };
}

export function mapOrder(row) {
  const items = Array.isArray(row.order_items) ? row.order_items.map(mapOrderItem) : [];
  return {
    id: row.id,
    channel: row.channel || 'online',
    customerName: row.customer_name || 'Customer',
    customerPhone: row.customer_phone || '',
    address: row.address || '',
    itemsSummary: row.items_summary || '',
    lineItems: items,
    total: Number(row.total) || 0,
    deliveryFee: Number(row.delivery_fee) || 0,
    status: row.status || 'pending',
    paymentStatus: row.payment_status || 'unpaid',
    paymentMethod: row.payment_method || '',
    fulfillmentType: row.fulfillment_type || 'delivery',
    readyAt: row.ready_at || null,
    hasRider: Boolean(row.rider_id),
    courierName: row.courier_name || '',
    voidReason: row.void_reason || '',
    timeAgo: timeAgo(row.created_at),
    createdAt: row.created_at
  };
}
