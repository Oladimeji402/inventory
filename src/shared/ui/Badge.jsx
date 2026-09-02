export default function Badge({ tone = 'neutral', icon: Icon, children }) {
  return (
    <span className={`merchant-badge ${tone}`}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}
