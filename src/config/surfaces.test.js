import { authCallbackUrl, resolveSurface, surfaceOrigin, surfaceUrl } from './surfaces';

function loc({ hostname, pathname = '/', protocol = 'http:', port = '5173' }) {
  return { hostname, pathname, protocol, port };
}

describe('surface URLs', () => {
  it('sends local auth and product links to *.localhost', () => {
    const location = loc({ hostname: 'localhost' });
    expect(surfaceOrigin('merchant', location)).toBe('http://merchant.localhost:5173');
    expect(surfaceUrl('merchant', '/signup', location)).toBe('http://merchant.localhost:5173/signup');
    expect(authCallbackUrl('/login', loc({ hostname: 'merchant.localhost', pathname: '/signup' }))).toBe(
      'http://merchant.localhost:5173/login'
    );
  });

  it('keeps the current Vercel host until real subdomains exist', () => {
    const location = loc({
      hostname: 'inventory-grab.vercel.app',
      protocol: 'https:',
      port: '',
      pathname: '/'
    });
    expect(surfaceOrigin('merchant', location)).toBe('https://inventory-grab.vercel.app');
    expect(surfaceUrl('merchant', '/signup', location)).toBe('https://inventory-grab.vercel.app/signup');
    expect(resolveSurface(location)).toBe('marketing');
    expect(resolveSurface({ ...location, pathname: '/signup' })).toBe('merchant');
    expect(resolveSurface({ ...location, pathname: '/dashboard' })).toBe('merchant');
    expect(authCallbackUrl('/login', { ...location, pathname: '/signup' })).toBe(
      'https://inventory-grab.vercel.app/login'
    );
  });

  it('uses product subdomains on the brand domain', () => {
    const location = loc({ hostname: 'stv.com', protocol: 'https:', port: '' });
    expect(surfaceUrl('merchant', '/login', location)).toBe('https://merchant.stv.com/login');
  });
});
