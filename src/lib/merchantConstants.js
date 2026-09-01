export const STORE_CATEGORIES = [
  'Supermarket & Groceries',
  'Pharmacy & Healthcare',
  'Electronics & Gadgets',
  'Fashion & Boutique',
  'Bakery & Confectionery',
  'Beauty & Cosmetics',
  'Hardware & Building Materials',
  'General Retail'
];

export const NIGERIA_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara'
];

export const ENTITY_TYPES = [
  {
    value: 'informal_trader',
    label: 'Informal trader / not yet registered',
    hint: 'You can open a store now. CAC details are only required later for payouts.'
  },
  {
    value: 'sole_proprietor',
    label: 'Sole proprietor',
    hint: 'Trading in your own name. CAC number is optional until payouts.'
  },
  {
    value: 'business_name',
    label: 'Registered business name (BN)',
    hint: 'Enter the BN number from your CAC certificate. Do not upload the certificate yet.'
  },
  {
    value: 'limited_company',
    label: 'Limited liability company (RC)',
    hint: 'Enter the RC number. Director BVN/NIN and certificates are collected only when payouts go live.'
  }
];

export function slugifyStoreName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'www', 'app', 'auth', 'status', 'docs', 'billing',
  'shop', 'rider', 'marketplace', 'merchant', 'pos', 'mail', 'cdn',
  'support', 'help', 'blog', 'store', 'stores',
  'login', 'signup', 'forgot', 'start', 'dashboard', 'onboarding',
  'settings', 'orders', 'products', 'analytics'
]);

export function isValidStoreSlug(slug) {
  return /^[a-z0-9]([a-z0-9-]{0,28}[a-z0-9])?$/.test(slug) && slug.length >= 2;
}

export function requiresCacNumber(entityType) {
  return entityType === 'business_name' || entityType === 'limited_company';
}
