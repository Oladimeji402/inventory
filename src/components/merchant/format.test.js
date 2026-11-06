import { describe, expect, it } from 'vitest';
import { money, moneyCompact, nextOrderStep, percentChange, shortDay, shortOrderId } from './format';

const base = { status: 'pending', paymentStatus: 'paid', paymentMethod: 'Card', fulfillmentType: 'delivery', channel: 'online', readyAt: null };

describe('merchant formatting', () => {
  it('formats naira and compact axis values', () => {
    expect(money(1234567)).toBe('₦1,234,567');
    expect(money(null)).toBe('—');
    expect(moneyCompact(1500000)).toBe('₦1.5M');
    expect(moneyCompact(42000)).toBe('₦42K');
  });

  it('builds the order reference the search box understands', () => {
    expect(shortOrderId('a1b2c3d4-0000-4000-8000-000000000001')).toBe('ORD-A1B2C3D4');
  });

  it('does not invent a baseline when the previous period was empty', () => {
    expect(percentChange(100, 0)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(150, 100)).toBe(50);
  });

  it('formats a date without a timezone shift', () => {
    expect(shortDay('2026-11-04')).toBe('4 Nov');
  });
});

describe('nextOrderStep', () => {
  it('holds an unpaid transfer until the owner confirms it', () => {
    expect(nextOrderStep({ ...base, paymentStatus: 'unpaid', paymentMethod: 'Transfer' }).key).toBe('confirm_payment');
  });

  it('never asks the merchant to confirm an unpaid card order', () => {
    expect(nextOrderStep({ ...base, paymentStatus: 'unpaid' }).key).toBe('await_card');
  });

  it('packs, then waits for a rider on delivery orders', () => {
    expect(nextOrderStep(base).key).toBe('pack');
    expect(nextOrderStep({ ...base, readyAt: '2026-11-05T10:00:00Z' }).key).toBe('await_rider');
  });

  it('lets the customer collect pickup orders after packing', () => {
    const pickup = { ...base, fulfillmentType: 'pickup' };
    expect(nextOrderStep(pickup).key).toBe('pack_pickup');
    expect(nextOrderStep({ ...pickup, readyAt: 'x' }).key).toBe('handover');
  });

  it('leaves rider-owned deliveries to the rider', () => {
    expect(nextOrderStep({ ...base, status: 'dispatched', hasRider: true }).key).toBe('rider_delivering');
    expect(nextOrderStep({ ...base, status: 'dispatched', hasRider: false }).key).toBe('self_delivering');
  });

  it('reports finished and cancelled orders', () => {
    expect(nextOrderStep({ ...base, status: 'delivered' }).key).toBe('done');
    expect(nextOrderStep({ ...base, status: 'cancelled', voidReason: 'No stock' }).text).toContain('No stock');
  });
});
