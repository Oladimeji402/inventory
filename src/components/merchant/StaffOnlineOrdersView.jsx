import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useStaffOrders } from '../../hooks/useStaffOrders';
import { ErrorBanner, ToastProvider, useToast } from './ui';
import StaffOverview from './StaffOverview';
import StaffOrders from './StaffOrders';
import './Merchant.css';

function View({ staff, onSignOut }) {
  const { orders, loading, error, reload, updateOrderStatus, markReady } = useStaffOrders(staff?.token);
  const notify = useToast();
  const [tab, setTab] = useState('overview');

  return (
    <div className="mc-root" style={{ flexDirection: 'column' }}>
      <header className="mc-staff-bar">
        <strong>{staff?.trading_name || 'Online orders'}</strong>
        <span className="who">{staff?.full_name} · Online sales rep</span>
        <nav className="mc-staff-tabs" aria-label="Staff sections">
          {[['overview', 'Overview'], ['orders', 'Orders']].map(([value, label]) => (
            <button key={value} type="button" className={tab === value ? 'active' : ''} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)}>{label}</button>
          ))}
        </nav>
        <button type="button" className="mc-btn mc-btn-sm" onClick={onSignOut}><LogOut size={14} /> Sign out</button>
      </header>
      <main className="mc-content">
        <ErrorBanner message={error} onRetry={() => reload()} />
        {tab === 'overview'
          ? <StaffOverview orders={orders} loading={loading} onOpenOrders={() => setTab('orders')} />
          : <StaffOrders orders={orders} loading={loading} notify={notify} updateOrderStatus={updateOrderStatus} markReady={markReady} />}
      </main>
    </div>
  );
}

export default function StaffOnlineOrdersView(props) {
  return (
    <ToastProvider>
      <View {...props} />
    </ToastProvider>
  );
}
