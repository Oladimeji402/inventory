import { describe, it, expect, beforeEach } from 'vitest';
import { 
  openStaffShift, 
  recordCashDrop, 
  getCurrentShiftReport, 
  closeStaffShift, 
  getLocalShift,
  saveLocalShift 
} from './shift';

describe('Till Shift & Cash Drawer Service', () => {
  beforeEach(() => {
    saveLocalShift(null);
  });

  it('opens a staff shift with an opening float', async () => {
    const res = await openStaffShift(null, 15000);
    expect(res.data).toBeDefined();
    expect(res.data.openingFloat).toBe(15000);
    expect(res.data.status).toBe('open');

    const active = getLocalShift();
    expect(active).not.toBeNull();
    expect(active.openingFloat).toBe(15000);
  });

  it('records a mid-shift cash drop to the safe', async () => {
    await openStaffShift(null, 20000);
    const dropRes = await recordCashDrop(null, 5000, 'Safe transfer', 'Manager Tunde');
    expect(dropRes.data.cashDrops).toBe(5000);
    expect(dropRes.data.drops.length).toBe(1);
    expect(dropRes.data.drops[0].amount).toBe(5000);
  });

  it('calculates expected drawer cash correctly in X-Report', async () => {
    await openStaffShift(null, 10000);
    await recordCashDrop(null, 2000, 'Mid-day drop');

    // Simulate 2 cash sales and 1 card sale
    const mockSales = [
      { id: 'TXN-1', total: 4000, paymentMethod: 'Cash', createdAt: new Date().toISOString() },
      { id: 'TXN-2', total: 6000, paymentMethod: 'Cash', createdAt: new Date().toISOString() },
      { id: 'TXN-3', total: 8000, paymentMethod: 'Card', createdAt: new Date().toISOString() }
    ];

    const reportRes = await getCurrentShiftReport(null, mockSales);
    const rep = reportRes.data;
    expect(rep.openingFloat).toBe(10000);
    expect(rep.cashDrops).toBe(2000);
    expect(rep.cashSales).toBe(10000);
    expect(rep.cardSales).toBe(8000);
    // Expected Cash = Opening Float (10000) + Cash Sales (10000) - Drops (2000) = 18000
    expect(rep.expectedCash).toBe(18000);
  });

  it('reconciles physical count and computes variance in Z-Report on closeout', async () => {
    await openStaffShift(null, 10000);

    const mockSales = [
      { id: 'TXN-1', total: 5000, paymentMethod: 'Cash', createdAt: new Date().toISOString() }
    ];
    // Expected: 10000 + 5000 = 15000
    // Actual counted: 14500 (Shortage of -500)
    const zRes = await closeStaffShift(null, 14500, 'Lost ₦500 note', mockSales);
    expect(zRes.data.expectedCash).toBe(15000);
    expect(zRes.data.actualCash).toBe(14500);
    expect(zRes.data.variance).toBe(-500);
    expect(zRes.data.status).toBe('closed');

    // Local active shift should now be cleared
    expect(getLocalShift()).toBeNull();
  });
});
