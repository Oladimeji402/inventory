export default function Tabs({ options, value, onChange }) {
  return (
    <div className="mx-tabs" role="tablist">
      {options.map((opt) => {
        const Icon = opt.icon;
        const key = opt.value ?? opt;
        const label = opt.label ?? opt;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={value === key}
            className={`mx-tab-btn${value === key ? ' active' : ''}`}
            onClick={() => onChange(key)}
          >
            {Icon && <Icon size={14} />}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
