export default function Field({ id, label, hint, children }) {
  return (
    <div className="auth-field">
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {hint && <span className="auth-hint">{hint}</span>}
    </div>
  );
}
