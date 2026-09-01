/**
 * Brand configuration — single source of truth.
 * Change anything here and it propagates everywhere it is imported.
 *
 * To override per-environment, copy `.env.example` and set:
 *   VITE_BRAND_NAME=YourName
 *   VITE_BRAND_DOMAIN=yourdomain.com
 *   VITE_BRAND_COLOR=#2B7CFF
 */

export const BRAND = {
  /** Display name shown in the navbar, emails, receipts, etc. */
  name: import.meta.env.VITE_BRAND_NAME ?? 'Subtech',

  /** Short tag shown beside the logo (e.g. "Retail OS") */
  tagline: import.meta.env.VITE_BRAND_TAGLINE ?? 'Retail OS',

  /** Root domain — subdomains are built as `{slug}.${BRAND.domain}` */
  domain: import.meta.env.VITE_BRAND_DOMAIN ?? 'stv.com',

  /** Primary brand colour (used in SVG, canvas, dynamic styles) */
  color: import.meta.env.VITE_BRAND_COLOR ?? '#2B7CFF',

  /** Slightly darker shade for hover states */
  colorDark: import.meta.env.VITE_BRAND_COLOR_DARK ?? '#1a6ae8',
};

/** Convenience helpers */
export const storeUrl   = (slug) => `https://${slug}.${BRAND.domain}`;
export const shopUrl    = `https://shop.${BRAND.domain}`;
export const riderUrl   = `https://rider.${BRAND.domain}`;
export const adminUrl   = `https://admin.${BRAND.domain}`;
