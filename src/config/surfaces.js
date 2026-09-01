import { BRAND } from './brand';

export const SURFACES = ['marketing', 'merchant', 'rider', 'shop', 'till'];

const MERCHANT_PATHS = new Set(['/login', '/signup', '/forgot', '/onboarding', '/dashboard']);
const PLATFORM_HOSTS = ['.vercel.app', '.netlify.app', '.pages.dev', '.railway.app'];

function readLocation(location) {
  if (location) return location;
  if (typeof window === 'undefined') {
    return { hostname: 'localhost', pathname: '/', protocol: 'http:', port: '' };
  }
  return window.location;
}

function hostOf(location) {
  return readLocation(location).hostname.replace(/^www\./, '').toLowerCase();
}

function pathOf(location) {
  return (readLocation(location).pathname || '/').replace(/\/+$/, '') || '/';
}

function originOf(location) {
  const loc = readLocation(location);
  if (loc.origin) return loc.origin.replace(/\/+$/, '');
  const port = loc.port ? `:${loc.port}` : '';
  return `${loc.protocol}//${loc.hostname}${port}`;
}

export function isLocalHost(host = hostOf()) {
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
}

export function isPlatformHost(host = hostOf()) {
  return PLATFORM_HOSTS.some((suffix) => host.endsWith(suffix));
}

/**
 * Local and future stv.com subdomains get their own hosts.
 * The current Vercel URL is one site, so every product stays on that origin.
 */
export function usesProductSubdomains(host = hostOf()) {
  if (isLocalHost(host)) return true;
  if (isPlatformHost(host)) return false;
  return host === BRAND.domain || host.endsWith(`.${BRAND.domain}`);
}

export function resolveSurface(location) {
  const forced = import.meta.env.VITE_APP_SURFACE;
  if (forced && forced !== 'auto') return forced;
  if (import.meta.env.MODE === 'test' && !location) return 'till';

  const host = hostOf(location);
  const sub = host.split('.')[0];
  if (sub === 'merchant' || sub === 'app') return 'merchant';
  if (sub === 'rider') return 'rider';
  if (sub === 'shop' || sub === 'store') return 'shop';

  const path = pathOf(location);
  if (MERCHANT_PATHS.has(path)) return 'merchant';
  if (path === '/rider' || path.startsWith('/rider/')) return 'rider';
  if (path === '/shop' || path.startsWith('/shop/')) return 'shop';
  return 'marketing';
}

export function surfaceOrigin(surface, location) {
  const loc = readLocation(location);
  const host = hostOf(loc);
  const protocol = loc.protocol || 'http:';
  const port = loc.port ? `:${loc.port}` : '';

  if (isLocalHost(host)) {
    if (surface === 'marketing' || surface === 'till') {
      return `${protocol}//localhost${port}`;
    }
    return `${protocol}//${surface}.localhost${port}`;
  }

  if (!usesProductSubdomains(host)) {
    return originOf(loc);
  }

  const apex = host.endsWith(`.${BRAND.domain}`)
    ? BRAND.domain
    : host;
  if (surface === 'marketing' || surface === 'till') return `${protocol}//${apex}`;
  return `${protocol}//${surface}.${apex}`;
}

export function surfaceUrl(surface, path = '/', location) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${surfaceOrigin(surface, location)}${normalized}`;
}

/** Confirm-email and password-reset must return to the environment the user is in. */
export function authCallbackUrl(path = '/login', location) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${originOf(location)}${normalized}`;
}

export const appLinks = {
  marketing: (location) => surfaceUrl('marketing', '/', location),
  merchantLogin: (location) => surfaceUrl('merchant', '/login', location),
  merchantSignup: (slug, location) =>
    slug
      ? surfaceUrl('merchant', `/signup?slug=${encodeURIComponent(slug)}`, location)
      : surfaceUrl('merchant', '/signup', location),
  merchantForgot: (location) => surfaceUrl('merchant', '/forgot', location),
  start: (location) => surfaceUrl('marketing', '/start', location),
  rider: (location) => surfaceUrl('rider', '/', location),
  shop: (location) => surfaceUrl('shop', '/', location)
};
