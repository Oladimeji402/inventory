import { useEffect, useState } from 'react';
import { 
  LogOut, 
  ArrowLeft, 
  Receipt, 
  Package, 
  ClipboardList, 
  Download, 
  WifiOff, 
  CloudOff, 
  Calendar, 
  Clock,
  ArrowDownCircle,
  FileSpreadsheet
} from 'lucide-react';
import Logo from './Logo';
import { BRAND } from '../config/brand';
import { appLinks } from '../config/surfaces';
import { usePwa } from '../hooks/usePwa';
import { getTillStoreName } from '../lib/tillIdentity';

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Header({ 
  session, 
  tab, 
  onChangeTab, 
  onClockOut, 
  onOpenCashDrop,
  onOpenXReport,
  onExit, 
  lowStockCount 
}) {
  const { isInstallable, isOffline, syncStatus, openInstallModal } = usePwa();
  const pendingSync = !isOffline && syncStatus?.pending > 0;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const tabs = [
    { id: 'pos', label: 'Sales', icon: Receipt },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'reports', label: 'Reports', icon: ClipboardList }
  ];

  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const storeName = getTillStoreName();

  return (
    <header className="pos-navbar">
      <div className="pos-navbar-brand">
        <Logo size={32} />
        <div>
          <span className="pos-navbar-brand-name">{storeName || BRAND.name}</span>
          <span className="pos-navbar-brand-tag">{storeName ? `Powered by ${BRAND.name}` : 'Counter checkout'}</span>
        </div>
      </div>

      <nav className="pos-navbar-tabs">
        {tabs.map((item) => {
          const badge = item.id === 'inventory' ? lowStockCount : 0;
          return (
            <button
              key={item.id}
              type="button"
              className={`pos-navbar-tab ${tab === item.id ? 'active' : ''}`}
              onClick={() => onChangeTab(item.id)}
            >
              <item.icon size={15} />
              <span>{item.label}</span>
              {!!badge && <span className="tab-badge">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="pos-navbar-right">
        {isOffline && (
          <div className="offline-badge" title="Offline mode: sales and stock still save on this device">
            <WifiOff size={13} />
            <span>Offline</span>
          </div>
        )}
        {pendingSync && (
          <div className="offline-badge pending-sync" title="Queued changes will sync when the connection is stable">
            <CloudOff size={13} />
            <span>{syncStatus.pending} pending</span>
          </div>
        )}
        {isInstallable && (
          <button className="pos-header-icon-btn" onClick={openInstallModal} title={`Install ${BRAND.name} on this device`}>
            <Download size={16} />
          </button>
        )}

        <div className="pos-navbar-chip">
          <Calendar size={13} />
          <span>{dateLabel}</span>
        </div>
        <div className="pos-navbar-chip">
          <Clock size={13} />
          <span>{timeLabel}</span>
        </div>

        <div className="pos-navbar-divider" />

        <div className="pos-user-chip" title={`${session.employee.name} (${session.employee.role})`}>
          <div className="pos-user-avatar">{initialsOf(session.employee.name)}</div>
          <div className="pos-user-details">
            <strong>{session.employee.name}</strong>
            <span>{session.employee.role}</span>
          </div>
        </div>

        {onOpenCashDrop && (
          <button className="pos-header-icon-btn" onClick={onOpenCashDrop} title="Safe Drop (Transfer cash to store safe)">
            <ArrowDownCircle size={16} />
          </button>
        )}
        {onOpenXReport && (
          <button className="pos-header-icon-btn" onClick={onOpenXReport} title="Interim X-Report (Cash Drawer reading)">
            <FileSpreadsheet size={16} />
          </button>
        )}

        <button className="pos-header-icon-btn" onClick={onClockOut} title="Clock out & Close Shift (Z-Report)">
          <LogOut size={16} />
        </button>
        <button
          className="pos-header-icon-btn"
          onClick={onExit || (() => { window.location.href = appLinks.marketing(); })}
          title="Exit till"
        >
          <ArrowLeft size={16} />
        </button>
      </div>
    </header>
  );
}
