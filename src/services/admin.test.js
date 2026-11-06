import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeStoreAge, formatRegistrationDate } from './admin';

describe('admin helpers', () => {
  it('describes store age in plain words', () => {
    expect(computeStoreAge(new Date().toISOString())).toBe('Created today');
    expect(computeStoreAge(new Date(Date.now() - 10 * 864e5).toISOString())).toBe('10 days old');
    expect(computeStoreAge(new Date(Date.now() - 65 * 864e5).toISOString())).toBe('2 months old');
    expect(computeStoreAge(null)).toBe('Unknown');
  });

  it('formats registration dates', () => {
    const formatted = formatRegistrationDate('2026-10-10T10:00:00Z');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Oct');
  });
});

describe('admin API (configured backend)', () => {
  let rpc;
  let createSignedUrl;
  let admin;

  beforeEach(async () => {
    vi.resetModules();
    rpc = vi.fn();
    createSignedUrl = vi.fn();
    vi.doMock('../lib/supabase', () => ({
      isSupabaseConfigured: true,
      supabase: { rpc, storage: { from: vi.fn(() => ({ createSignedUrl })) } }
    }));
    admin = await import('./admin');
  });

  it.each([
    ['fetchPlatformMetrics', []],
    ['fetchTrends', [14]],
    ['fetchCorridors', []],
    ['fetchStores', []],
    ['fetchStore', ['t1']],
    ['fetchRiders', []],
    ['fetchRider', ['r1']],
    ['fetchPlatformOrders', []],
    ['fetchOrder', ['o1']],
    ['fetchPayouts', []],
    ['fetchAllEmployees', []],
    ['fetchAdmins', []],
    ['fetchAudit', []],
    ['updateTenantStatus', ['t1', 'suspended']],
    ['reviewRiderDocument', ['d1', 'rejected', 'blurry']],
    ['reviewRiderKyc', ['k1', 'verified']],
    ['setRiderSuspended', ['r1', true, 'fraud']],
    ['cancelOrder', ['o1', 'reason']],
    ['markOrderPaid', ['o1']],
    ['updatePayout', ['p1', 'completed', { reference: 'ref' }]],
    ['resetEmployeePin', ['e1', '1234']],
    ['toggleEmployeeActive', ['e1', false]],
    ['setPlatformAdmin', ['a@b.co', true]],
    ['fetchRides', []],
    ['fetchRide', ['r1']],
    ['cancelRideAsAdmin', ['r1', 'safety']]
  ])('%s rejects with the real error and never returns fake data', async (fn, args) => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Not authorized' } });
    await expect(admin[fn](...args)).rejects.toThrow('Not authorized');
  });

  it('passes the right arguments to the database functions', async () => {
    rpc.mockResolvedValue({ data: { ok: true }, error: null });

    await admin.reviewRiderDocument('d1', 'rejected', 'blurry');
    expect(rpc).toHaveBeenLastCalledWith('admin_review_rider_document', { p_document_id: 'd1', p_status: 'rejected', p_notes: 'blurry' });

    await admin.updatePayout('p1', 'completed', { reference: 'NIP123' });
    expect(rpc).toHaveBeenLastCalledWith('admin_update_payout', { p_payout_id: 'p1', p_status: 'completed', p_note: '', p_reference: 'NIP123' });

    await admin.setRiderSuspended('r1', true, 'fraud');
    expect(rpc).toHaveBeenLastCalledWith('admin_set_rider_suspended', { p_rider_id: 'r1', p_suspended: true, p_reason: 'fraud' });
  });

  it('creates a short-lived signed link for a private rider document', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed/url' }, error: null });
    expect(await admin.getRiderDocumentUrl('uid/passport_photo', 120)).toBe('https://signed/url');
    expect(createSignedUrl).toHaveBeenCalledWith('uid/passport_photo', 120);

    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    await expect(admin.getRiderDocumentUrl('x')).rejects.toThrow('Object not found');
  });

  it('maps corridor data and defaults to empty lists', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect((await admin.fetchCorridors()).data).toEqual({ corridors: [], plans: [] });
  });
});

describe('admin API (no backend configured)', () => {
  it('refuses to run instead of returning mock data', async () => {
    vi.resetModules();
    vi.doMock('../lib/supabase', () => ({ isSupabaseConfigured: false, supabase: null }));
    const admin = await import('./admin');
    await expect(admin.fetchPlatformMetrics()).rejects.toThrow(/not configured/i);
    expect(await admin.isPlatformAdmin()).toBe(false);
  });
});
