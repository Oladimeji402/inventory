export default function KpiTile({ icon: Icon, label, value, sub, tone = 'default', loading = false }) {
  return (
    <div className="merchant-kpi-card">
      <div className="merchant-kpi-top">
        <span className="merchant-kpi-label">{label}</span>
        {Icon && (
          <span className={`merchant-kpi-icon${tone !== 'default' ? ` ${tone}` : ''}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <span className="merchant-kpi-val font-mono">
        {loading ? <span className="mx-skeleton" style={{ display: 'inline-block', width: 70, height: 24 }} /> : value}
      </span>
      {sub && <span className="merchant-kpi-sub">{sub}</span>}
    </div>
  );
}
