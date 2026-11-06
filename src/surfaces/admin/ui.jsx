import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowLeft, ArrowUpRight, Minus, Search, X } from 'lucide-react';
import { DASH, money, moneyCompact, statusLabel, statusTone } from './format';
import { adminPath } from './router';

/* ── data loading ───────────────────────────────────────────── */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const alive = useRef(true);

  const run = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const result = await loaderRef.current();
      if (alive.current) setState({ data: result?.data ?? result, error: '', loading: false });
    } catch (err) {
      if (alive.current) setState((s) => ({ data: silent ? s.data : null, error: err.message || 'Something went wrong.', loading: false }));
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    run();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: run };
}

/* ── toasts ─────────────────────────────────────────────────── */
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list, { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="ad-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ad-toast ${t.kind === 'bad' ? 'bad' : ''}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ── routing helpers ────────────────────────────────────────── */
export function Link({ to, navigate, className, children, ...rest }) {
  return (
    <a
      href={adminPath(to)}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/* ── animated numbers ───────────────────────────────────────── */
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Counts from the previous value to the new one with an ease-out curve. */
export function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(prefersReducedMotion() ? Number(target) || 0 : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    const to = Number(target) || 0;
    if (prefersReducedMotion() || typeof requestAnimationFrame === 'undefined') {
      setValue(to);
      return undefined;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const current = from + (to - from) * eased;
      setValue(current);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = to;
    };
  }, [target, duration]);

  return value;
}

export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString('en-NG') }) {
  const shown = useCountUp(value);
  if (value === null || value === undefined) return <>{DASH}</>;
  return <span className="ad-mono" style={{ fontFamily: 'inherit' }}>{format(shown)}</span>;
}

export function Delta({ pct }) {
  if (pct === null || pct === undefined) return <span className="ad-delta ad-delta-flat">New</span>;
  const rounded = Math.abs(pct) < 0.05 ? 0 : pct;
  const tone = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`ad-delta ad-delta-${tone}`}>
      <Icon size={12} />
      {Math.abs(rounded).toFixed(1)}%
    </span>
  );
}

export function StatCard({ label, value, format, icon: Icon, tint = '#dbeafe', color = '#2563eb', delta, hint, delay = 0, loading }) {
  return (
    <div className="ad-card ad-stat" style={{ animationDelay: `${delay}ms` }}>
      <div className="ad-stat-top">
        <span className="ad-stat-label">{label}</span>
        {Icon && (
          <span className="ad-stat-icon" style={{ background: tint, color }}>
            <Icon size={17} />
          </span>
        )}
      </div>
      <div className="ad-stat-value">
        {loading ? <span className="ad-skel" style={{ display: 'inline-block', width: 120, height: 30 }} /> : <AnimatedNumber value={value} format={format} />}
      </div>
      <div className="ad-stat-foot">
        {delta !== undefined && !loading && <Delta pct={delta} />}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}

/* ── charts ─────────────────────────────────────────────────── */
export function AreaChart({ data, height = 240, valueFormat = money, axisFormat = moneyCompact }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);
  const width = 720;
  const pad = { top: 16, right: 14, bottom: 26, left: 52 };

  const geometry = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.value));
    const niceMax = max * 1.15;
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const x = (i) => pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v) => pad.top + innerH - (v / niceMax) * innerH;
    const points = data.map((d, i) => [x(i), y(d.value)]);
    // smooth path through points
    const line = points.reduce((acc, [px, py], i) => {
      if (i === 0) return `M${px},${py}`;
      const [qx, qy] = points[i - 1];
      const cx = (qx + px) / 2;
      return `${acc} C${cx},${qy} ${cx},${py} ${px},${py}`;
    }, '');
    const area = points.length ? `${line} L${points[points.length - 1][0]},${pad.top + innerH} L${points[0][0]},${pad.top + innerH} Z` : '';
    const ticks = [0, 0.5, 1].map((t) => ({ y: y(niceMax * t), label: axisFormat(niceMax * t) }));
    return { points, line, area, ticks, innerH };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, height]);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (!data.length || total === 0) {
    return (
      <div className="ad-empty" style={{ padding: '60px 20px' }}>
        <strong>No paid sales in this period</strong>
        Sales will appear here as soon as orders are paid.
      </div>
    );
  }

  const handleMove = (event) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    let best = 0;
    geometry.points.forEach(([x], i) => {
      if (Math.abs(x - px) < Math.abs(geometry.points[best][0] - px)) best = i;
    });
    setHover(best);
  };

  const pathLength = 1800; // generous upper bound for the draw-on animation
  const labelEvery = Math.ceil(data.length / 7);

  return (
    <div className="ad-chart" ref={wrapRef} onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Paid sales per day">
        <defs>
          <linearGradient id="ad-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2B7CFF" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2B7CFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {geometry.ticks.map((tick) => (
          <g key={tick.y}>
            <line className="ad-chart-grid" x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} />
            <text className="ad-chart-axis" x={pad.left - 8} y={tick.y + 3} textAnchor="end">{tick.label}</text>
          </g>
        ))}
        <path className="ad-chart-area" d={geometry.area} fill="url(#ad-area-fill)" />
        <path className="ad-chart-line" d={geometry.line} style={{ '--len': pathLength }} />
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={d.label} className="ad-chart-axis" x={geometry.points[i][0]} y={height - 6} textAnchor="middle">{d.label}</text>
          ) : null
        )}
        {hover !== null && (
          <>
            <line className="ad-chart-grid" x1={geometry.points[hover][0]} x2={geometry.points[hover][0]} y1={pad.top} y2={pad.top + geometry.innerH} />
            <circle className="ad-chart-dot" cx={geometry.points[hover][0]} cy={geometry.points[hover][1]} r="5" />
          </>
        )}
      </svg>
      {hover !== null && (
        <div
          className="ad-chart-tip"
          style={{ left: `${(geometry.points[hover][0] / width) * 100}%`, top: `${(geometry.points[hover][1] / height) * 100}%` }}
        >
          <strong>{valueFormat(data[hover].value)}</strong>
          {data[hover].full}{data[hover].sub ? ` · ${data[hover].sub}` : ''}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars that grow in on mount. */
export function BarList({ items, format = money, color = 'var(--primary)' }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="ad-bars">
      {items.map((item) => (
        <div className="ad-bar-row" key={item.key || item.label}>
          <span className="ad-bar-label">{item.label}</span>
          <span className="ad-bar-value ad-mono">{format(item.value)}</span>
          <div className="ad-bar-track">
            <div className="ad-bar-fill" style={{ width: ready ? `${(item.value / max) * 100}%` : 0, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SegmentBar({ segments }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <>
      <div className="ad-segbar">
        {segments.map((s) => (
          <div key={s.label} className="ad-seg" style={{ width: ready ? `${(s.value / total) * 100}%` : 0, background: s.color }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <div className="ad-legend">
        {segments.map((s) => (
          <span key={s.label}><i style={{ background: s.color }} />{s.label} <b className="ad-mono">{s.value}</b></span>
        ))}
      </div>
    </>
  );
}

/* ── layout bits ────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions, back, navigate }) {
  return (
    <div className="ad-page-head">
      <div>
        {back && (
          <Link to={back.to} navigate={navigate} className="ad-crumb">
            <ArrowLeft size={14} /> {back.label}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="ad-head-actions">{actions}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, action, children, className = '', flush }) {
  return (
    <section className={`ad-card ${flush ? '' : 'ad-panel'} ${className}`}>
      {(title || action) && (
        <div className="ad-panel-head" style={flush ? { padding: '18px 20px 0' } : undefined}>
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ status, tone, children }) {
  return <span className={`ad-badge ad-badge-${tone || statusTone(status)}`}>{children ?? statusLabel(status)}</span>;
}

export function KeyValues({ items }) {
  return (
    <dl className="ad-kv">
      {items.filter(Boolean).map(([label, value, wide]) => (
        <div key={label} className={wide ? 'wide' : ''}>
          <dt>{label}</dt>
          <dd>{value === null || value === undefined || value === '' ? DASH : value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="ad-error" role="alert">
      <AlertCircle size={18} />
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && <button type="button" className="ad-btn ad-btn-sm" onClick={() => onRetry()}>Retry</button>}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="ad-skel" style={{ height, width, ...style }} />;
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div style={{ padding: 20, display: 'grid', gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={22} />)}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="ad-tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" aria-selected={active === tab.id} className={`ad-tab ${active === tab.id ? 'active' : ''}`} onClick={() => onChange(tab.id)}>
          {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
        </button>
      ))}
    </div>
  );
}

/* ── tables ─────────────────────────────────────────────────── */
export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <label className="ad-search">
      <Search size={15} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

export function FilterChips({ options, value, onChange }) {
  return (
    <div className="ad-chips" role="group">
      {options.map((opt) => (
        <button key={opt.value} type="button" className={`ad-chip ${value === opt.value ? 'active' : ''}`} onClick={() => onChange(opt.value)}>
          {opt.label}{opt.count !== undefined && <em>{opt.count}</em>}
        </button>
      ))}
    </div>
  );
}

/**
 * columns: [{ key, header, render(row), align }]. Pass onRowClick to make rows links.
 */
export function DataTable({ columns, rows, rowKey = (r) => r.id, onRowClick, empty, loading }) {
  if (loading) return <TableSkeleton />;
  if (!rows.length) {
    return (
      <div className="ad-empty">
        <strong>{empty?.title || 'Nothing here yet'}</strong>
        {empty?.text}
      </div>
    );
  }
  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'ad-num' : ''}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'clickable' : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map((c) => <td key={c.key} className={c.align === 'right' ? 'ad-num' : ''}>{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── dialogs ────────────────────────────────────────────────── */
export function Dialog({ title, onClose, children, wide, label }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ad-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-dialog ${wide ? 'ad-dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={label || title}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

/**
 * Confirmation with optional free-text input (a reason, a bank reference …).
 * `onConfirm(value)` may be async; a thrown error is shown inside the dialog.
 */
export function ActionDialog({
  title, description, confirmLabel = 'Confirm', tone = 'primary', inputLabel, inputType = 'textarea',
  inputRequired = false, inputPlaceholder, onConfirm, onClose
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (inputLabel && inputRequired && !value.trim()) {
      setError(`${inputLabel} is required.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(value.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'That did not work. Please try again.');
      setBusy(false);
    }
  };

  const Field = inputType === 'input' ? 'input' : 'textarea';
  return (
    <Dialog title={title} onClose={busy ? () => {} : onClose}>
      {description && <p>{description}</p>}
      {inputLabel && (
        <>
          <label className="ad-label" htmlFor="ad-action-input">{inputLabel}</label>
          <Field
            id="ad-action-input"
            className={inputType === 'input' ? 'ad-input' : 'ad-textarea'}
            value={value}
            placeholder={inputPlaceholder}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </>
      )}
      {error && <div className="ad-error" role="alert" style={{ margin: '12px 0 0' }}><AlertCircle size={16} />{error}</div>}
      <div className="ad-dialog-actions">
        <button type="button" className="ad-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button
          type="button"
          className={`ad-btn ${tone === 'danger' ? 'ad-btn-danger' : tone === 'ok' ? 'ad-btn-ok' : 'ad-btn-primary'}`}
          onClick={submit}
          disabled={busy}
          style={tone === 'danger' ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' } : undefined}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export function CloseButton({ onClick }) {
  return (
    <button type="button" className="ad-btn ad-btn-sm" onClick={onClick} aria-label="Close"><X size={14} /></button>
  );
}
