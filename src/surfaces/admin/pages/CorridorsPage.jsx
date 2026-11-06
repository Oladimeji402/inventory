import { fetchCorridors } from '../../../services/admin';
import { BarList, DataTable, ErrorBanner, PageHeader, Panel, useAsync } from '../ui';
import { count, statusLabel } from '../format';

export default function CorridorsPage({ refreshKey }) {
  const data = useAsync(fetchCorridors, [refreshKey]);
  const corridors = data.data?.corridors || [];
  const plans = data.data?.plans || [];

  return (
    <>
      <PageHeader title="Corridors & plans" subtitle="Where stores trade and which plans they are on." />
      <ErrorBanner message={data.error} onRetry={data.reload} />
      <div className="ad-grid ad-grid-main">
        <Panel flush title="Delivery corridors" subtitle="Average delivery = order placed to marked delivered, last 30 days">
          <DataTable
            loading={data.loading && !data.data}
            rows={corridors}
            rowKey={(c) => c.name}
            empty={{ title: 'No corridors yet', text: 'Stores are grouped by the corridor they deliver in.' }}
            columns={[
              { key: 'n', header: 'Corridor', render: (c) => <span className="ad-cell-main">{c.name}</span> },
              { key: 's', header: 'Active stores', align: 'right', render: (c) => <span className="ad-mono">{count(c.stores)}</span> },
              { key: 'o', header: 'Paid orders (30d)', align: 'right', render: (c) => <span className="ad-mono">{count(c.orders30d)}</span> },
              { key: 'a', header: 'Avg delivery', align: 'right', render: (c) => (c.avgDeliveryMinutes === null || c.avgDeliveryMinutes === undefined ? <span className="ad-cell-sub">No deliveries</span> : <span className="ad-mono">{c.avgDeliveryMinutes} min</span>) }
            ]}
          />
        </Panel>
        <Panel title="Subscriptions" subtitle="Active and trialing stores by plan">
          {plans.length ? (
            <BarList items={plans.map((p) => ({ label: statusLabel(p.plan), value: Number(p.stores), key: p.plan }))} format={(n) => `${n} store${n === 1 ? '' : 's'}`} color="#7c3aed" />
          ) : <p className="ad-note" style={{ margin: 0 }}>No active subscriptions yet.</p>}
          <p className="ad-note">Plan limits (registers, branches, products) are not enforced yet, and billing is not connected.</p>
        </Panel>
      </div>
    </>
  );
}
