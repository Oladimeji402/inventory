import { BRAND } from './brand';
import { RESERVED_SLUGS } from '../lib/merchantConstants';

export const SURFACES = ['marketing', 'merchant', 'rider', 'shop', 'till', 'admin'];

const MERCHANT_PATHS = new Set(['/login', '/signup', '/forgot', '/onboarding', '/dashboard', '/staff']);
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

/**
 * Once a store has its own subdomain (apex-pharmacy.stv.com), that's where
 * its slug lives — no need to ask staff to type it. Returns '' when we're on
 * a fixed/reserved surface host, an apex domain, or a host that doesn't do
 * per-tenant subdomains yet (localhost apex, Vercel platform host) — callers
 * should fall back to letting the person type the store URL in that case.
 *
 * NOTE: resolveSurface() below doesn't yet route arbitrary tenant subdomains
 * to the merchant surface — this only pays off once that routing exists
 * (planned for after a real domain + wildcard DNS are set up).
 */
export function inferTenantSlugFromHost(location) {
  const host = hostOf(location);
  if (!usesProductSubdomains(host)) return '';
  if (host === 'localhost' || host === BRAND.domain) return '';
  const sub = host.split('.')[0];
  if (!sub || RESERVED_SLUGS.has(sub)) return '';
  return sub;
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
  if (sub === 'till') return 'till';
  if (sub === 'admin') return 'admin';

  const path = pathOf(location);
  if (MERCHANT_PATHS.has(path)) return 'merchant';
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  if (path === '/rider' || path.startsWith('/rider/')) return 'rider';
  if (path === '/shop' || path.startsWith('/shop/')) return 'shop';
  if (path === '/till' || path.startsWith('/till/')) return 'till';
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

/**
 * On platform hosts (no subdomains yet), the rider surface lives under the
 * `/rider` path prefix rather than owning bare paths like `/login` — those
 * are already claimed by the merchant surface's path fallback. See
 * resolveSurface() and RiderRoot for the matching read side.
 */
export function riderLocalPath(fullPath) {
  const trimmed = (fullPath || '/').replace(/\/+$/, '') || '/';
  if (trimmed === '/rider') return '/';
  if (trimmed.startsWith('/rider/')) return trimmed.slice('/rider'.length) || '/';
  return trimmed;
}

export function riderFullPath(localPath, location) {
  const host = hostOf(location);
  const normalized = localPath === '/' ? '' : (localPath.startsWith('/') ? localPath : `/${localPath}`);
  if (usesProductSubdomains(host)) return normalized || '/';
  return `/rider${normalized}` || '/rider';
}

/**
 * The till shares its origin with marketing (see surfaceOrigin) — same
 * "no dedicated subdomain yet" situation as rider, so it needs the same
 * /till path-prefix treatment to stay distinguishable from bare `/`.
 */
export function tillFullPath(localPath, location) {
  const host = hostOf(location);
  const sub = host.split('.')[0];
  const normalized = localPath === '/' ? '' : (localPath.startsWith('/') ? localPath : `/${localPath}`);
  if (sub === 'till') return normalized || '/';
  return `/till${normalized}` || '/till';
}

export function surfaceUrl(surface, path = '/', location) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (surface === 'rider') {
    return `${surfaceOrigin(surface, location)}${riderFullPath(normalized, location)}`;
  }
  if (surface === 'till') {
    return `${surfaceOrigin(surface, location)}${tillFullPath(normalized, location)}`;
  }
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
  riderLogin: (location) => surfaceUrl('rider', '/login', location),
  riderSignup: (location) => surfaceUrl('rider', '/signup', location),
  riderForgot: (location) => surfaceUrl('rider', '/forgot', location),
  shop: (location) => surfaceUrl('shop', '/', location),
  till: (location) => surfaceUrl('till', '/', location),
  admin: (location) => surfaceUrl('admin', '/', location)
};
