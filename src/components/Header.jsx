import { LogOut, Receipt, Package, ClipboardList, Users } from 'lucide-react';
import Logo from './Logo';

export default function Header({ session, tab, onChangeTab, onClockOut, lowStockCount, canManageStaff }) {
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
