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

export function isValidPin(pin) {
  return /^[0-9]{4,6}$/.test(String(pin || ''));
}
