import { ShoppingBag, PackageCheck, Bike, CheckCircle2 } from 'lucide-react';
import KpiTile from '../../shared/ui/KpiTile';
import { countedOrder, isToday } from '../../lib/formatMoney';

export default function StaffOverview({ orders = [], loading = false }) {
  const liveOrders = orders.filter(countedOrder);
  const todayOrders = liveOrders.filter((order) => isToday(order.createdAt));
  const pendingCount = liveOrders.filter((order) => order.status === 'pending').length;
  const dispatchedToday = todayOrders.filter((order) => order.status === 'dispatched').length;
  const deliveredToday = todayOrders.filter((order) => order.status === 'delivered').length;

  return (
    <div>
      <div className="merchant-page-header">
        <div>
          <h1>Overview</h1>
          <p>Today's online orders at a glance.</p>
        </div>
      </div>

      <div className="merchant-kpi-grid">
        <KpiTile
          icon={ShoppingBag}
          label="Orders Today"
          value={loading ? '…' : todayOrders.length}
          sub={`${liveOrders.length} total open orders`}
        />
        <KpiTile
          icon={PackageCheck}
          label="Needs Packaging"
          value={loading ? '…' : pendingCount}
          sub="Waiting to be packed"
          tone={pendingCount > 0 ? 'warning' : 'default'}
        />
        <KpiTile
          icon={Bike}
          label="Packed & Dispatched Today"
          value={loading ? '…' : dispatchedToday}
          sub="Handed off for delivery"
        />
        <KpiTile
          icon={CheckCircle2}
          label="Delivered Today"
          value={loading ? '…' : deliveredToday}
          sub="Completed orders"
        />
      </div>
    </div>
  );
}
