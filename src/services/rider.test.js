import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('rider service (configured backend)', () => {
  let rpc;
  let rider;

  beforeEach(async () => {
    vi.resetModules();
    rpc = vi.fn();
    vi.doMock('../lib/supabase', () => ({ isSupabaseConfigured: true, supabase: { rpc } }));
    rider = await import('./rider');
  });

  it.each([
    ['setRiderOnline', [true]],
    ['fetchAvailableDispatches', []],
    ['acceptDispatch', ['o1']],
    ['fetchActiveOrder', []],
    ['pickUpOrder', ['o1']],
    ['verifyDelivery', ['o1', '4821']],
    ['fetchHistory', []],
    ['fetchRiderWallet', []],
    ['savePayoutAccount', ['GTBank', '0123456789', 'Tunde Bakare']],
    ['cashoutRiderWallet', []],
    ['fetchOpenRides', []],
    ['bidOnRide', ['r1', 1200, 10]],
    ['withdrawRideBid', ['r1']],
    ['fetchActiveRide', []],
    ['rideArrived', ['r1']],
    ['startRide', ['r1', '4821']],
    ['completeRide', ['r1']],
    ['handBackRide', ['r1']],
    ['fetchRideHistory', []]
  ])('%s rejects with the real error instead of faking success', async (fn, args) => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Invalid 4-digit handover OTP' } });
    await expect(rider[fn](...args)).rejects.toThrow('Invalid 4-digit handover OTP');
  });

  it('calls the right database functions with the right arguments', async () => {
    rpc.mockResolvedValue({ data: {}, error: null });

    await rider.setRiderOnline(true);
    expect(rpc).toHaveBeenLastCalledWith('rider_set_online', { p_online: true });
    await rider.pickUpOrder('o1');
    expect(rpc).toHaveBeenLastCalledWith('rider_pick_up_order', { p_order_id: 'o1' });
    await rider.verifyDelivery('o1', '4821');
    expect(rpc).toHaveBeenLastCalledWith('verify_order_delivery', { p_order_id: 'o1', p_otp: '4821' });
    await rider.savePayoutAccount('GTBank', '0123456789', 'Tunde Bakare');
    expect(rpc).toHaveBeenLastCalledWith('save_rider_payout_account', { p_bank_name: 'GTBank', p_account_number: '0123456789', p_account_name: 'Tunde Bakare' });
    await rider.cashoutRiderWallet();
    expect(rpc).toHaveBeenLastCalledWith('request_rider_cashout', {});
    await rider.bidOnRide('r1', 1200, 10);
    expect(rpc).toHaveBeenLastCalledWith('rider_bid_ride', { p_ride_id: 'r1', p_price: 1200, p_eta_minutes: 10 });
    await rider.startRide('r1', '4821');
    expect(rpc).toHaveBeenLastCalledWith('rider_start_ride', { p_ride_id: 'r1', p_otp: '4821' });
    await rider.completeRide('r1');
    expect(rpc).toHaveBeenLastCalledWith('rider_complete_ride', { p_ride_id: 'r1' });
  });

  it('returns empty lists (not mock data) when there is nothing', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect((await rider.fetchAvailableDispatches()).data).toEqual([]);
    expect((await rider.fetchHistory()).data).toEqual([]);
  });
});

describe('rider service (no backend)', () => {
  it('refuses to run instead of returning demo data', async () => {
    vi.resetModules();
    vi.doMock('../lib/supabase', () => ({ isSupabaseConfigured: false, supabase: null }));
    const rider = await import('./rider');
    await expect(rider.fetchAvailableDispatches()).rejects.toThrow(/not available/i);
    await expect(rider.verifyDelivery('o', '1234')).rejects.toThrow(/not available/i);
  });
});
