const SCHEMES = {
  auth: { primary: 'auth-submit', secondary: 'auth-secondary', ghost: 'auth-text-btn' },
  merchant: { primary: 'merchant-btn-primary', secondary: 'merchant-btn-secondary', ghost: 'merchant-btn-secondary' }
};

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  scheme = 'auth',
  disabled,
  className = '',
  ...props
}) {
  const map = SCHEMES[scheme] || SCHEMES.auth;
  const classes = [map[variant] || map.primary, className].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
