import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Minus, Search, X } from 'lucide-react';
import { DASH, money, moneyCompact, statusLabel, statusTone } from './format';
import { dashPath } from './router';

/* ── data loading ───────────────────────────────────────────── */
/**
 * Runs `loader` on mount and whenever `deps` change. Errors are kept (never swallowed)
 * so pages can show a real message with a Retry button. A silent reload keeps the
 * previous data on screen while it refreshes.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const alive = useRef(true);
  const runId = useRef(0);

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++runId.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const result = await loaderRef.current();
      if (alive.current && id === runId.current) setState({ data: result, error: '', loading: false });
    } catch (err) {
      if (alive.current && id === runId.current) {
        setState((s) => ({ data: silent ? s.data : null, error: err.message || 'Something went wrong.', loading: false }));
      }
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

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
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
      <div className="mc-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`mc-toast ${t.kind === 'bad' ? 'bad' : ''}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ── routing helpers ────────────────────────────────────────── */
export function Link({ to, navigate, className, children, ...rest }) {
  return (
    <a
      href={dashPath(to)}
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
export function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(prefersReducedMotion() ? Number(target) || 0 : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    const to = Number(target) || 0;
    if (prefersReducedMotion() || typeof requestAnimationFrame === 'undefined') {
      setValue(to);
      fromRef.current = to;
      return undefined;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(from + (to - from) * eased);
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
  return <span>{format(shown)}</span>;
}

export function Delta({ pct }) {
  if (pct === null || pct === undefined) return <span className="mc-delta mc-delta-flat">New</span>;
  const rounded = Math.abs(pct) < 0.05 ? 0 : pct;
  const tone = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`mc-delta mc-delta-${tone}`}>
      <Icon size={12} />
      {Math.abs(rounded).toFixed(1)}%
    </span>
  );
}

export function StatCard({ label, value, format, icon: Icon, tint = '#dbeafe', color = '#2563eb', delta, hint, delay = 0, loading }) {
  return (
    <div className="mc-card mc-stat" style={{ animationDelay: `${delay}ms` }}>
      <div className="mc-stat-top">
        <span className="mc-stat-label">{label}</span>
        {Icon && (
          <span className="mc-stat-icon" style={{ background: tint, color }}>
            <Icon size={17} />
          </span>
        )}
      </div>
      <div className="mc-stat-value">
        {loading ? <span className="mc-skel" style={{ display: 'inline-block', width: 120, height: 30 }} /> : <AnimatedNumber value={value} format={format} />}
      </div>
      <div className="mc-stat-foot">
        {delta !== undefined && !loading && <Delta pct={delta} />}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}

/* ── charts ─────────────────────────────────────────────────── */
export function AreaChart({ data, height = 240, valueFormat = money, axisFormat = moneyCompact, emptyTitle = 'No sales in this period', emptyText = 'Paid orders will appear here as they come in.' }) {
  const wrapRef = useRef(null);
  const gradientId = `mc-area-${useId().replace(/:/g, '')}`;
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
      <div className="mc-empty" style={{ padding: '56px 20px' }}>
        <strong>{emptyTitle}</strong>
        {emptyText}
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

  const labelEvery = Math.ceil(data.length / 7);

  return (
    <div className="mc-chart" ref={wrapRef} onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sales per day">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2B7CFF" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2B7CFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {geometry.ticks.map((tick) => (
          <g key={tick.y}>
            <line className="mc-chart-grid" x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} />
            <text className="mc-chart-axis" x={pad.left - 8} y={tick.y + 3} textAnchor="end">{tick.label}</text>
          </g>
        ))}
        <path className="mc-chart-area" d={geometry.area} fill={`url(#${gradientId})`} />
        <path className="mc-chart-line" d={geometry.line} style={{ '--len': 1800 }} />
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={d.label + i} className="mc-chart-axis" x={geometry.points[i][0]} y={height - 6} textAnchor="middle">{d.label}</text>
          ) : null
        )}
        {hover !== null && (
          <>
            <line className="mc-chart-grid" x1={geometry.points[hover][0]} x2={geometry.points[hover][0]} y1={pad.top} y2={pad.top + geometry.innerH} />
            <circle className="mc-chart-dot" cx={geometry.points[hover][0]} cy={geometry.points[hover][1]} r="5" />
          </>
        )}
      </svg>
      {hover !== null && (
        <div
          className="mc-chart-tip"
          style={{ left: `${(geometry.points[hover][0] / width) * 100}%`, top: `${(geometry.points[hover][1] / height) * 100}%` }}
        >
          <strong>{valueFormat(data[hover].value)}</strong>
          {data[hover].full}{data[hover].sub ? ` · ${data[hover].sub}` : ''}
        </div>
      )}
    </div>
  );
}

/** Vertical columns that grow in on mount (used for orders by hour). */
export function ColumnChart({ items, peakColor = 'var(--primary)' }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="mc-cols" role="img" aria-label="Orders by hour of day">
      {items.map((item) => (
        <div className="mc-col" key={item.key || item.label} title={item.title}>
          <div className="mc-col-track">
            <div
              className="mc-col-fill"
              style={{ height: ready ? `${Math.max(item.value > 0 ? 6 : 0, (item.value / max) * 100)}%` : 0, background: item.value === max && max > 0 ? peakColor : undefined }}
            />
          </div>
          <span>{item.label}</span>
        </div>
      ))}
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
    <div className="mc-bars">
      {items.map((item) => (
        <div className="mc-bar-row" key={item.key || item.label}>
          <span className="mc-bar-label">{item.label}</span>
          <span className="mc-bar-value mc-mono">{format(item.value)}</span>
          <div className="mc-bar-track">
            <div className="mc-bar-fill" style={{ width: ready ? `${(item.value / max) * 100}%` : 0, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SegmentBar({ segments, format = (n) => n }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <>
      <div className="mc-segbar">
        {segments.map((s) => (
          <div key={s.label} className="mc-seg" style={{ width: ready ? `${(s.value / total) * 100}%` : 0, background: s.color }} title={`${s.label}: ${format(s.value)}`} />
        ))}
      </div>
      <div className="mc-legend">
        {segments.map((s) => (
          <span key={s.label}><i style={{ background: s.color }} />{s.label} <b className="mc-mono">{format(s.value)}</b></span>
        ))}
      </div>
    </>
  );
}

/* ── layout bits ────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions, back, navigate }) {
  return (
    <div className="mc-page-head">
      <div>
        {back && (
          <Link to={back.to} navigate={navigate} className="mc-crumb">
            <ArrowLeft size={14} /> {back.label}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="mc-head-actions">{actions}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, action, children, className = '', flush }) {
  return (
    <section className={`mc-card ${flush ? '' : 'mc-panel'} ${className}`}>
      {(title || action) && (
        <div className="mc-panel-head" style={flush ? { padding: '18px 20px 0' } : undefined}>
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
  return <span className={`mc-badge mc-badge-${tone || statusTone(status)}`}>{children ?? statusLabel(status)}</span>;
}

export function KeyValues({ items }) {
  return (
    <dl className="mc-kv">
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
    <div className="mc-error" role="alert">
      <AlertCircle size={18} />
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && <button type="button" className="mc-btn mc-btn-sm" onClick={() => onRetry()}>Retry</button>}
    </div>
  );
}

export function Notice({ tone = 'info', title, children }) {
  return (
    <div className={`mc-notice mc-notice-${tone}`}>
      {title && <strong>{title}</strong>}
      <span>{children}</span>
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="mc-skel" style={{ height, width, ...style }} />;
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div style={{ padding: 20, display: 'grid', gap: 12 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={22} />)}
    </div>
  );
}

export function EmptyState({ title, text, action, icon: Icon }) {
  return (
    <div className="mc-empty">
      {Icon && <span className="mc-empty-icon"><Icon size={20} /></span>}
      <strong>{title}</strong>
      {text}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* ── tables + filters ───────────────────────────────────────── */
export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <label className="mc-search">
      <Search size={15} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

export function FilterChips({ options, value, onChange, label = 'Filter' }) {
  return (
    <div className="mc-chips" role="group" aria-label={label}>
      {options.map((opt) => (
        <button key={opt.value} type="button" aria-pressed={value === opt.value} className={`mc-chip ${value === opt.value ? 'active' : ''}`} onClick={() => onChange(opt.value)}>
          {opt.label}{opt.count !== undefined && <em>{opt.count}</em>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="mc-pager">
      <span className="mc-mono">{from}–{to} of {total.toLocaleString('en-NG')}</span>
      <div>
        <button type="button" className="mc-btn mc-btn-sm" disabled={page <= 0} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
        <button type="button" className="mc-btn mc-btn-sm" disabled={page >= pages - 1} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

/**
 * columns: [{ key, header, render(row), align }]. Pass onRowClick to make rows links.
 */
export function DataTable({ columns, rows, rowKey = (r) => r.id, onRowClick, empty, loading }) {
  if (loading) return <TableSkeleton />;
  if (!rows.length) {
    return <EmptyState title={empty?.title || 'Nothing here yet'} text={empty?.text} action={empty?.action} icon={empty?.icon} />;
  }
  return (
    <div className="mc-table-wrap">
      <table className="mc-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'mc-num' : ''}>{c.header}</th>)}</tr>
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
              {columns.map((c) => <td key={c.key} className={c.align === 'right' ? 'mc-num' : ''} data-label={typeof c.header === 'string' ? c.header : undefined}>{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── forms ──────────────────────────────────────────────────── */
export function Field({ label, hint, children, htmlFor, wide }) {
  return (
    <div className={`mc-field ${wide ? 'wide' : ''}`}>
      <label className="mc-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="mc-hint">{hint}</span>}
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
    <div className="mc-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`mc-dialog ${wide ? 'mc-dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={label || title}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

/**
 * Confirmation with optional free-text input (a cancel reason …) and optional checkbox.
 * `onConfirm(value, checked)` may be async; a thrown error is shown inside the dialog.
 */
export function ActionDialog({
  title, description, confirmLabel = 'Confirm', tone = 'primary', inputLabel, inputType = 'textarea',
  inputRequired = false, inputPlaceholder, checkboxLabel, onConfirm, onClose
}) {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputId = useId();

  const submit = async () => {
    if (inputLabel && inputRequired && !value.trim()) {
      setError(`${inputLabel} is required.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(value.trim(), checked);
      onClose();
    } catch (err) {
      setError(err.message || 'That did not work. Please try again.');
      setBusy(false);
    }
  };

  const Control = inputType === 'input' ? 'input' : 'textarea';
  return (
    <Dialog title={title} onClose={busy ? () => {} : onClose}>
      {description && <p>{description}</p>}
      {inputLabel && (
        <>
          <label className="mc-label" htmlFor={inputId}>{inputLabel}</label>
          <Control
            id={inputId}
            className={inputType === 'input' ? 'mc-input' : 'mc-textarea'}
            value={value}
            placeholder={inputPlaceholder}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </>
      )}
      {checkboxLabel && (
        <label className="mc-check">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>{checkboxLabel}</span>
        </label>
      )}
      {error && <div className="mc-error" role="alert" style={{ margin: '12px 0 0' }}><AlertCircle size={16} />{error}</div>}
      <div className="mc-dialog-actions">
        <button type="button" className="mc-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button
          type="button"
          className={`mc-btn ${tone === 'danger' ? 'mc-btn-danger-solid' : tone === 'ok' ? 'mc-btn-ok' : 'mc-btn-primary'}`}
          onClick={submit}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export function CloseButton({ onClick }) {
  return (
    <button type="button" className="mc-btn mc-btn-sm" onClick={onClick} aria-label="Close"><X size={14} /></button>
  );
}
