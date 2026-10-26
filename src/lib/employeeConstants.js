export const EMPLOYEE_TYPES = [
  {
    value: 'counter',
    label: 'Counter / POS staff',
    hint: 'Signs in with a PIN at the till to sell in person.'
  },
  {
    value: 'online_rep',
    label: 'Online sales rep',
    hint: 'Signs in here to manage orders placed on your storefront.'
  }
];

export const TILL_ROLES = [
  { value: 'Sales Representative', label: 'Sales Representative (Max 5% discount, sell only)' },
  { value: 'Supervisor', label: 'Supervisor (Max 10% discount, inventory checks)' },
  { value: 'Manager', label: 'Manager (Max 20% discount, void sales, manage stock)' },
  { value: 'Store Admin', label: 'Store Admin (Full register & staff permissions)' }
];

export function isValidPin(pin) {
  return /^[0-9]{4,6}$/.test(String(pin || ''));
}

