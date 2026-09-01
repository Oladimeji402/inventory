export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  disabled,
  className = '',
  ...props
}) {
  const classes = [
    variant === 'secondary' ? 'auth-secondary' : variant === 'ghost' ? 'auth-text-btn' : 'auth-submit',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
