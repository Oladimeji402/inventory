import { LogOut, Receipt, Package, ClipboardList, Users, Download, WifiOff, CloudOff } from 'lucide-react';
import Logo from './Logo';
import { usePwa } from '../hooks/usePwa';

export default function Header({ session, tab, onChangeTab, onClockOut, lowStockCount, canManageStaff }) {
  const { isInstallable, isOffline, syncStatus, openInstallModal } = usePwa();
  const pendingSync = !isOffline && syncStatus?.pending > 0;

  const tabs = [
    { id: 'pos', label: 'Sales', icon: Receipt },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'reports', label: 'Reports', icon: ClipboardList },
    ...(canManageStaff ? [{ id: 'admin', label: 'Admin', icon: Users }] : [])
  ];

  return (
    <>
      <header className="topbar">
        <div className="brand-block">
          <Logo size={30} />
          <div>
            <h1>Counterpoint</h1>
            <p>{session.employee.role} · on shift</p>
          </div>
        </div>
        <div className="topbar-actions">
          {isOffline && (
            <div className="offline-badge" title="Offline mode: sales and stock still save on this device">
              <WifiOff size={13} />
              <span>Offline — sales safe</span>
            </div>
          )}
          {pendingSync && (
            <div className="offline-badge pending-sync" title="Queued changes will sync when the connection is stable">
              <CloudOff size={13} />
              <span>{syncStatus.pending} pending sync</span>
            </div>
          )}
          {isInstallable && (
            <button className="icon-btn pwa-install-btn" onClick={openInstallModal} title="Install Counterpoint POS App">
              <Download size={14} />
              <span className="pwa-install-text">Install App</span>
            </button>
          )}
          <div className="pill">{session.employee.name}</div>
          <button className="icon-btn" onClick={onClockOut} title="Clock out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((item) => {
          const badge = item.id === 'inventory' ? lowStockCount : 0;
          return (
            <button key={item.id} className={`tab ${tab === item.id ? 'active' : ''}`} onClick={() => onChangeTab(item.id)}>
              <item.icon size={14} />
              {item.label}
              {!!badge && <span className="tab-badge">{badge}</span>}
            </button>
          );
        })}
      </nav>
    </>
  );
}
