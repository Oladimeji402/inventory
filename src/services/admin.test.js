import { describe, it, expect } from 'vitest';
import { 
  computeStoreAge, 
  formatRegistrationDate, 
  fetchPlatformMetrics, 
  fetchTenantDetails, 
  fetchTenantEmployees,
  fetchAllEmployees,
  fetchPlatformOrders,
  updateTenantStatus,
  resetEmployeePin,
  toggleEmployeeActive,
  reviewRiderKyc
} from './admin';

describe('SuperAdmin Platform & Store Service', () => {
  it('correctly calculates human-readable store age', () => {
    const today = new Date().toISOString();
    expect(computeStoreAge(today)).toBe('Created today');

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeStoreAge(tenDaysAgo)).toBe('10 days old');

    const twoMonthsAgo = new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeStoreAge(twoMonthsAgo)).toBe('2 months old');

    expect(computeStoreAge(null)).toBe('Unknown');
  });

  it('formats registration dates nicely', () => {
    const dateStr = '2026-10-10T10:00:00Z';
    const formatted = formatRegistrationDate(dateStr);
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Oct');
  });

  it('fetches platform metrics and recent tenants', async () => {
    const res = await fetchPlatformMetrics();
    expect(res.data).toBeDefined();
    expect(res.data.totalGmv).toBeGreaterThan(0);
    expect(res.data.recentTenants.length).toBeGreaterThan(0);
    
    const firstTenant = res.data.recentTenants[0];
    expect(firstTenant.name).toBeDefined();
    expect(firstTenant.slug).toBeDefined();
  });

  it('fetches detailed tenant profiles including branch networks', async () => {
    const res = await fetchTenantDetails('t-1');
    expect(res.data).toBeDefined();
    expect(res.data.name).toBe('Apex Health Pharmacy');
    expect(res.data.bankName).toBeDefined();
    expect(res.data.branches.length).toBeGreaterThan(0);
  });

  it('fetches store-specific employee rosters with roles and PIN health', async () => {
    const res = await fetchTenantEmployees('t-1');
    expect(res.data).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(4);

    const cashier = res.data.find(e => e.role.includes('Cashier'));
    expect(cashier).toBeDefined();
    expect(cashier.pinStatus).toContain('Active');
  });

  it('fetches platform-wide cross-store staff roster', async () => {
    const res = await fetchAllEmployees();
    expect(res.data).toBeDefined();
    expect(res.data.length).toBeGreaterThan(5);
    expect(res.data[0].storeName).toBeDefined();
    expect(res.data[0].storeSlug).toBeDefined();
  });

  it('fetches cross-tenant order stream with channels and couriers', async () => {
    const res = await fetchPlatformOrders();
    expect(res.data).toBeDefined();
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0].channel).toBeDefined();
    expect(res.data[0].amount).toBeGreaterThan(0);
  });

  it('updates tenant status and handles PIN resets', async () => {
    const updateRes = await updateTenantStatus('t-1', 'suspended');
    expect(updateRes.data.status).toBe('suspended');

    const pinRes = await resetEmployeePin('emp-101', '5555');
    expect(pinRes.data.success).toBe(true);

    const toggleRes = await toggleEmployeeActive('emp-101', false);
    expect(toggleRes.data.isActive).toBe(false);

    const kycRes = await reviewRiderKyc('kyc-1', 'approved', 'Compliant');
    expect(kycRes.data.status).toBe('approved');
  });
});
