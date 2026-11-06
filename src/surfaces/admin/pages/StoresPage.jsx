import { useMemo, useState } from 'react';
import { Ban, CheckCircle2, ExternalLink } from 'lucide-react';
import { BRAND } from '../../../config/brand';
import { computeStoreAge, fetchStore, fetchStores, fetchTenantEmployees, updateTenantStatus } from '../../../services/admin';
import {
  ActionDialog, Badge, DataTable, ErrorBanner, FilterChips, KeyValues, Link, PageHeader, Panel, SearchBox,
  StatCard, Tabs, useAsync
} from '../ui';
import { count, dateOnly, dateTime, initials, money, shortId, statusLabel } from '../format';
import { StaffTable } from './StaffPage';
import { Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';

const STATUS_FILTERS = ['all', 'active', 'trialing', 'past_due', 'suspended', 'cancelled'];

export function StoresPage({ navigate, refreshKey }) {
  const stores = useAsync(fetchStores, [refreshKey]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const all = stores.data || [];
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((s) => {
      if (status !== 'all' && s.status !== status) return false;
      return !term || `${s.name} ${s.slug} ${s.category} ${s.contactEmail} ${s.state}`.toLowerCase().includes(term);
    });
  }, [all, search, status]);

  return (
    <>
      <PageHeader title="Stores" subtitle={`${count(all.length)} registered stores. Click a store to see everything about it.`} />
      <ErrorBanner message={stores.error} onRetry={stores.reload} />
      <div className="ad-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, subdomain, category, email" />
        <FilterChips
          value={status} onChange={setStatus}
          options={STATUS_FILTERS.map((s) => ({ value: s, label: s === 'all' ? 'All' : statusLabel(s), count: s === 'all' ? all.length : all.filter((x) => x.status === s).length }))}
        />
      </div>
      <Panel flush>
        <DataTable
          loading={stores.loading && !stores.data}
          rows={rows}
          onRowClick={(s) => navigate(`/stores/${s.id}`)}
          empty={{ title: 'No stores match', text: 'Try a different search or filter.' }}
          columns={[
            { key: 'name', header: 'Store', render: (s) => <><div className="ad-cell-main">{s.name}</div><div className="ad-cell-sub">{s.slug}.{BRAND.domain} · {s.category}</div></> },
            { key: 'status', header: 'Status', render: (s) => <Badge status={s.status} /> },
            { key: 'plan', header: 'Plan', render: (s) => (s.planTier ? statusLabel(s.planTier) : <span className="ad-cell-sub">No plan</span>) },
            { key: 'where', header: 'Location', render: (s) => [s.state, s.corridor].filter(Boolean).join(' · ') || '—' },
            { key: 'team', header: 'Outlets / staff', render: (s) => `${count(s.branchesCount)} / ${count(s.activeStaff)}` },
            { key: 'orders', header: 'Orders', align: 'right', render: (s) => <span className="ad-mono">{count(s.orderCount)}</span> },
            { key: 'gmv', header: 'Paid sales', align: 'right', render: (s) => <span className="ad-mono ad-cell-main">{money(s.gmv)}</span> },
            { key: 'joined', header: 'Joined', render: (s) => <><div>{dateOnly(s.createdAt)}</div><div className="ad-cell-sub">{computeStoreAge(s.createdAt)}</div></> }
          ]}
        />
      </Panel>
    </>
  );
}

export function StoreDetailPage({ navigate, notify, storeId, refreshKey, onChanged }) {
  const store = useAsync(() => fetchStore(storeId), [storeId, refreshKey]);
  const staff = useAsync(() => fetchTenantEmployees(storeId), [storeId, refreshKey]);
  const [tab, setTab] = useState('overview');
  const [dialog, setDialog] = useState(null);
  const s = store.data;

  const toggleStatus = (nextStatus) => setDialog({ nextStatus });

  return (
    <>
      <PageHeader
        back={{ to: '/stores', label: 'All stores' }} navigate={navigate}
        title={s ? s.name : 'Store'}
        subtitle={s ? `${s.slug}.${BRAND.domain} · ${s.category}` : undefined}
        actions={s && (
          <>
            <Badge status={s.status} />
            <a className="ad-btn ad-btn-sm" href={`/store/${s.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> View storefront</a>
            {s.status === 'suspended' ? (
              <button type="button" className="ad-btn ad-btn-ok ad-btn-sm" onClick={() => toggleStatus('active')}><CheckCircle2 size={14} /> Reactivate store</button>
            ) : (
              <button type="button" className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => toggleStatus('suspended')}><Ban size={14} /> Suspend store</button>
            )}
          </>
        )}
      />
      <ErrorBanner message={store.error} onRetry={store.reload} />

      {s && (
        <>
          <div className="ad-grid ad-grid-4" style={{ marginBottom: 18 }}>
            <StatCard label="Paid sales" icon={TrendingUp} value={s.stats.gmv} format={money} hint={`${money(s.stats.gmv30d)} in 30 days`} delay={0} />
            <StatCard label="Paid orders" icon={ShoppingBag} tint="#fef3c7" color="#b45309" value={s.stats.orders} hint={`${count(s.stats.online)} online · ${count(s.stats.counter)} counter`} delay={60} />
            <StatCard label="Products" icon={Package} tint="#dcfce7" color="#15803d" value={s.stats.products} hint={`${count(s.stats.lowStock)} low · ${count(s.stats.outOfStock)} out of stock`} delay={120} />
            <StatCard label="Active staff" icon={Users} tint="#ede9fe" color="#6d28d9" value={s.stats.staff} hint={`${count(s.branches.length)} outlet${s.branches.length === 1 ? '' : 's'}`} delay={180} />
          </div>

          <Tabs active={tab} onChange={setTab} tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'orders', label: 'Orders', count: s.recentOrders.length },
            { id: 'branches', label: 'Branches', count: s.branches.length },
            { id: 'staff', label: 'Staff', count: staff.data?.length }
          ]} />

          {tab === 'overview' && (
            <div className="ad-grid ad-grid-2">
              <Panel title="Business">
                <KeyValues items={[
                  ['Trading name', s.name], ['Legal name', s.legalName],
                  ['Business type', statusLabel(s.entityType)], ['CAC number', s.cacNumber],
                  ['Tax ID (TIN)', s.tin], ['Category', s.category],
                  ['Address', [s.address, s.city, s.state].filter(Boolean).join(', '), true],
                  ['Corridor', s.corridor], ['Physical store', s.hasPhysicalStore ? 'Yes' : 'No'],
                  ['Website / social', s.website], ['Joined', `${dateTime(s.createdAt)} (${computeStoreAge(s.createdAt)})`],
                  ['About', s.description, true]
                ]} />
              </Panel>
              <div className="ad-stack">
                <Panel title="Owner & contact">
                  <div className="ad-profile" style={{ marginBottom: 14 }}>
                    <div className="ad-avatar">{initials(s.owner?.name)}</div>
                    <div><div className="ad-cell-main">{s.owner?.name || 'No owner on record'}</div><div className="ad-cell-sub">Account owner</div></div>
                  </div>
                  <KeyValues items={[['Owner email', s.owner?.email], ['Owner phone', s.owner?.phone], ['Store email', s.contactEmail], ['Store phone', s.contactPhone]]} />
                </Panel>
                <Panel title="Verification & billing">
                  <KeyValues items={[
                    ['Onboarding', <Badge key="o" status={s.onboardingStatus} />],
                    ['Store KYC', <Badge key="k" status={s.kycStatus} />],
                    ['Plan', s.subscription ? `${statusLabel(s.subscription.plan)} · ${money(s.subscription.amount)} / ${s.subscription.cycle === 'yearly' ? 'year' : 'month'}` : 'No subscription on record'],
                    ['Subscription', s.subscription ? <Badge key="s" status={s.subscription.status} /> : null],
                    ['Renews', s.subscription ? dateOnly(s.subscription.renewsAt) : null],
                    ['KYC reviewer notes', s.kyc?.notes, true]
                  ]} />
                </Panel>
                <Panel title="Settlement account" subtitle="Account number is masked">
                  {s.payout?.bankName ? (
                    <KeyValues items={[['Bank', s.payout.bankName], ['Account number', s.payout.accountNumber], ['Account name', s.payout.accountName], ['Verified', <Badge key="v" tone={s.payout.verified ? 'ok' : 'warn'}>{s.payout.verified ? 'Verified' : 'Not verified'}</Badge>]]} />
                  ) : <p className="ad-note" style={{ margin: 0 }}>No payout account on file.</p>}
                </Panel>
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <Panel flush title="Recent orders" subtitle={`Latest ${s.recentOrders.length}. ${count(s.stats.unpaid)} unpaid, ${count(s.stats.cancelled)} cancelled overall.`}>
              <DataTable rows={s.recentOrders} onRowClick={(o) => navigate(`/orders/${o.id}`)} empty={{ title: 'No orders yet' }} columns={[
                { key: 'id', header: 'Order', render: (o) => <span className="ad-mono ad-cell-main">#{shortId(o.id)}</span> },
                { key: 'customer', header: 'Customer', render: (o) => <><div>{o.customerName || '—'}</div><div className="ad-cell-sub">{o.channel === 'counter' ? 'Counter till' : 'Online'}</div></> },
                { key: 'status', header: 'Status', render: (o) => <Badge status={o.status} /> },
                { key: 'pay', header: 'Payment', render: (o) => <><Badge status={o.paymentStatus} /> <span className="ad-cell-sub">{o.paymentMethod}</span></> },
                { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="ad-mono">{money(o.total)}</span> },
                { key: 'time', header: 'Placed', render: (o) => dateTime(o.createdAt) }
              ]} />
            </Panel>
          )}

          {tab === 'branches' && (
            <Panel flush title="Branch outlets">
              <DataTable rows={s.branches} empty={{ title: 'No branches recorded', text: 'This store has not added any outlets.' }} columns={[
                { key: 'name', header: 'Outlet', render: (b) => <><div className="ad-cell-main">{b.name}</div>{b.isMain && <div className="ad-cell-sub">Main branch</div>}</> },
                { key: 'addr', header: 'Address', render: (b) => [b.address, b.city].filter(Boolean).join(', ') || '—' },
                { key: 'phone', header: 'Phone', render: (b) => b.phone || '—' },
                { key: 'st', header: 'Status', render: (b) => <Badge tone={b.isActive ? 'ok' : 'idle'}>{b.isActive ? 'Active' : 'Inactive'}</Badge> }
              ]} />
            </Panel>
          )}

          {tab === 'staff' && (
            <Panel flush title="Store staff">
              <StaffTable rows={staff.data || []} loading={staff.loading && !staff.data} reload={staff.reload} notify={notify} navigate={navigate} showStore={false} />
            </Panel>
          )}
        </>
      )}

      {dialog && s && (
        <ActionDialog
          title={dialog.nextStatus === 'suspended' ? `Suspend ${s.name}?` : `Reactivate ${s.name}?`}
          description={dialog.nextStatus === 'suspended'
            ? 'The storefront stops accepting orders and the store disappears from the marketplace. You can reactivate at any time.'
            : 'The storefront and marketplace listing become available again.'}
          tone={dialog.nextStatus === 'suspended' ? 'danger' : 'ok'}
          confirmLabel={dialog.nextStatus === 'suspended' ? 'Suspend store' : 'Reactivate store'}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await updateTenantStatus(s.id, dialog.nextStatus);
            notify(`${s.name} is now ${dialog.nextStatus}.`);
            store.reload({ silent: true });
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
