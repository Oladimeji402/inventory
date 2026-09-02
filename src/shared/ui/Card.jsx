export default function Card({ title, subtitle, action, children, noBodyPadding = false, className = '' }) {
  const hasHeader = title || action;
  return (
    <div className={['mx-card', className].filter(Boolean).join(' ')}>
      {hasHeader && (
        <div className="mx-card-header">
          <div>
            {title && <h3 className="mx-card-title">{title}</h3>}
            {subtitle && <p className="mx-card-subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={`mx-card-body${noBodyPadding ? ' no-pad' : ''}`}>{children}</div>
    </div>
  );
}
