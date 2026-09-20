import { useState } from 'react';
import { LogOut } from 'lucide-react';
import MerchantOrders from './MerchantOrders';
import StaffOverview from './StaffOverview';
import Tabs from '../../shared/ui/Tabs';
import { useStaffOrders } from '../../hooks/useStaffOrders';
import './Merchant.css';

export default function StaffOnlineOrdersView({ staff, onSignOut }) {
  const { orders, loading, updateOrderStatus } = useStaffOrders(staff?.token);
  const [tab, setTab] = useState('overview');

  return (
    <div className="merchant-root">
      <div className="merchant-main">
        <header className="merchant-header">
          <div className="merchant-header-left">
            <span style={{ fontWeight: 800, fontSize: 14 }}>{staff?.trading_name || 'Online orders'}</span>
            <span style={{ fontSize: 12.5, color: 'var(--mx-text-3)', marginLeft: 10 }}>
              Signed in as {staff?.full_name} · Online sales rep
            </span>
          </div>
          <div className="merchant-header-right">
            <Tabs
              value={tab}
              onChange={setTab}
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'orders', label: 'Orders' }
              ]}
            />
            <button className="merchant-btn-secondary" onClick={onSignOut} style={{ fontSize: 13 }}>
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="merchant-content">
          {tab === 'overview' ? (
            <StaffOverview orders={orders} loading={loading} />
          ) : (
            <MerchantOrders
              orders={orders}
              loading={loading}
              canManage
              onUpdateOrderStatus={updateOrderStatus}
            />
          )}
        </main>
      </div>
    </div>
  );
}
