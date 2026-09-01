import { checkStoreSlug } from './slugAvailability';
import { isValidStoreSlug, RESERVED_SLUGS, slugifyStoreName } from './merchantConstants';
import { saveIntendedSlug, readIntendedSlug, clearIntendedSlug } from './intendedSlug';

describe('store URL helpers', () => {
  it('slugifies trading names the same way onboarding does', () => {
    expect(slugifyStoreName('Apex Health Pharmacy')).toBe('apex-health-pharmacy');
    expect(slugifyStoreName('  Super--Mart!! ')).toBe('super-mart');
  });

  it('rejects reserved and invalid slugs without calling the database', async () => {
    expect(RESERVED_SLUGS.has('login')).toBe(true);
    expect(isValidStoreSlug('a')).toBe(false);
    expect(await checkStoreSlug('admin')).toMatchObject({ status: 'reserved', slug: 'admin' });
    expect(await checkStoreSlug('x')).toMatchObject({ status: 'invalid' });
  });

  it('remembers an intended slug only in session storage', () => {
    saveIntendedSlug('kemi-organics');
    expect(readIntendedSlug()).toBe('kemi-organics');
    clearIntendedSlug();
    expect(readIntendedSlug()).toBe('');
  });
});
