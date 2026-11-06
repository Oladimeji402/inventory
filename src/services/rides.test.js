import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('rides service', () => {
  let rpc, rides;
  beforeEach(async () => {
    vi.resetModules();
    rpc = vi.fn();
    vi.doMock('../lib/supabase', () => ({ isSupabaseConfigured: true, supabase: { rpc } }));
    rides = await import('./rides');
  });

  it('posts a ride with the passenger\'s offer and optional schedule', async () => {
    rpc.mockResolvedValue({ data: { id: 'r1' }, error: null });
    const res = await rides.createRide({ vehicle: 'motorcycle', pickup: '12 Admiralty Way', dropoff: 'Allen Avenue', price: 1500, note: '', scheduledFor: null, phone: '0803 000 1111' });
    expect(res.data.id).toBe('r1');
    expect(rpc).toHaveBeenCalledWith('create_ride_request', {
      p_vehicle: 'motorcycle', p_pickup: '12 Admiralty Way', p_dropoff: 'Allen Avenue', p_price: 1500, p_note: null, p_scheduled_for: null, p_phone: '0803 000 1111'
    });
  });

  it.each([
    ['createRide', [{ vehicle: 'car', pickup: 'a', dropoff: 'b', price: 1 }]],
    ['fetchMyRides', []], ['fetchMyRide', ['r1']], ['updateRideOffer', ['r1', 2000]],
    ['acceptRideBid', ['b1']], ['cancelRide', ['r1']], ['rateRide', ['r1', 5]]
  ])('%s rejects with the real server error', async (fn, args) => {
    rpc.mockResolvedValue({ data: null, error: { message: 'You already have a ride in progress.' } });
    await expect(rides[fn](...args)).rejects.toThrow('You already have a ride in progress.');
  });

  it('calls the right functions for offers, bids, cancellation and rating', async () => {
    rpc.mockResolvedValue({ data: {}, error: null });
    await rides.updateRideOffer('r1', 2000);
    expect(rpc).toHaveBeenLastCalledWith('update_ride_offer', { p_ride_id: 'r1', p_price: 2000 });
    await rides.acceptRideBid('b1');
    expect(rpc).toHaveBeenLastCalledWith('accept_ride_bid', { p_bid_id: 'b1' });
    await rides.cancelRide('r1', 'changed my mind');
    expect(rpc).toHaveBeenLastCalledWith('cancel_ride', { p_ride_id: 'r1', p_reason: 'changed my mind' });
    await rides.rateRide('r1', 4, 'Smooth');
    expect(rpc).toHaveBeenLastCalledWith('rate_ride', { p_ride_id: 'r1', p_rating: 4, p_comment: 'Smooth' });
  });

  it('keeps the vehicle price floors in step with the database', () => {
    expect(rides.VEHICLES.map((v) => [v.id, v.minPrice])).toEqual([['motorcycle', 300], ['tricycle', 400], ['car', 800]]);
  });

  it('refuses to run without a backend', async () => {
    vi.resetModules();
    vi.doMock('../lib/supabase', () => ({ isSupabaseConfigured: false, supabase: null }));
    const r = await import('./rides');
    await expect(r.fetchMyRides()).rejects.toThrow(/not available/i);
  });
});
