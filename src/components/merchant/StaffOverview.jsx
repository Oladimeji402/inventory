import { Bike, Banknote, CheckCircle2, PackageCheck, ShoppingBag } from 'lucide-react';
import { PageHeader, StatCard } from './ui';
import { isToday } from '../../lib/formatMoney';

export default function StaffOverview({ orders = [], loading = false, onOpenOrders }) {
  const open = orders.filter((o) => o.status !== 'cancelled');
  const today = open.filter((o) => isToday(o.createdAt));
  const toPack = open.filter((o) => o.status === 'pending' && o.paymentStatus === 'paid').length;
  const awaiting = open.filter((o) => o.status === 'pending' && o.paymentStatus !== 'paid').length;
  const transit = open.filter((o) => o.status === 'dispatched').length;
  const doneToday = today.filter((o) => o.status === 'delivered').length;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Orders from your store's website. Figures update every 15 seconds."
        actions={<button type="button" className="mc-btn mc-btn-primary" onClick={onOpenOrders}>Open orders</button>}
      />
      <div className="mc-grid mc-grid-4">
        <StatCard label="Orders today" icon={ShoppingBag} value={today.length} loading={loading} hint={`${open.length} on record`} />
        <StatCard label="To pack" icon={PackageCheck} tint="#dbeafe" color="#2563eb" value={toPack} loading={loading} hint="paid, waiting for you" delay={60} />
        <StatCard label="Awaiting payment" icon={Banknote} tint="#fef3c7" color="#d97706" value={awaiting} loading={loading} hint="the owner confirms these" delay={120} />
        <StatCard label="Out for delivery" icon={Bike} tint="#ccfbf1" color="#0f766e" value={transit} loading={loading} hint={`${doneToday} completed today`} delay={180} />
      </div>
      <p className="mc-note" style={{ marginTop: 16 }}>
        <CheckCircle2 size={13} style={{ verticalAlign: '-2px' }} /> Only paid orders can be packed. Bank transfers are confirmed by the store owner.
      </p>
    </>
  );
}
