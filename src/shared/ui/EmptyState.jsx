export default function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="mx-empty">
      {Icon && (
        <span className="mx-empty-icon">
          <Icon size={20} />
        </span>
      )}
      {title && <div className="mx-empty-title">{title}</div>}
      {desc && <div className="mx-empty-desc">{desc}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
