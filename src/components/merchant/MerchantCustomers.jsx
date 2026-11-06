import { useEffect, useRef, useState } from 'react';
import { Repeat, ShoppingBag, UserRound, Users } from 'lucide-react';
import { fetchCustomers } from '../../services/merchant';
import { Badge, DataTable, ErrorBanner, Notice, PageHeader, Pagination, SearchBox, StatCard, useAsync, useDebounced } from './ui';
import { DASH, money, timeAgo } from './format';

const PAGE_SIZE = 25;

export default function MerchantCustomers({ navigate, refreshKey }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debounced = useDebounced(search);
  const seen = useRef(false);

  const { data, loading, error, reload } = useAsync(
    () => fetchCustomers({ search: debounced, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [debounced, page]
  );

  useEffect(() => {
    if (!seen.current) { seen.current = true; return; }
    reload({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const rows = data?.rows || [];
  const repeatOnPage = rows.filter((c) => Number(c.orders) > 1).length;

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Built automatically from your order history. A customer is a phone number (or shopper account) that has ordered from you."
      />
      <ErrorBanner message={error} onRetry={reload} />

      <div className="mc-grid mc-grid-3" style={{ marginBottom: 16 }}>
        <StatCard label="Customers" icon={Users} value={data?.total} loading={loading && !data} hint={debounced ? 'matching your search' : 'with a phone number or account'} />
        <StatCard label="Repeat buyers on this page" icon={Repeat} tint="#dcfce7" color="#16a34a" value={data ? repeatOnPage : undefined} loading={loading && !data} hint="ordered more than once" delay={60} />
        <StatCard label="Walk-in orders" icon={UserRound} tint="#f1f5f9" color="#475569" value={data?.walkInOrders} loading={loading && !data} hint="counter sales with no phone number" delay={120} />
      </div>

      <div className="mc-toolbar">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search name or phone" />
      </div>

      {(data || loading) && <section className="mc-card">
        <DataTable
          loading={loading && !data}
          rows={rows}
          rowKey={(c) => c.key}
          onRowClick={(c) => navigate(`/orders?q=${encodeURIComponent(c.phone || c.name || '')}`)}
          empty={{
            icon: ShoppingBag,
            title: debounced ? 'No customers match your search' : 'No customers yet',
            text: debounced ? 'Try a name or phone number from an order.' : 'Customers appear here after their first order. Walk-in counter sales without a phone number are not counted as customers.'
          }}
          columns={[
            {
              key: 'name',
              header: 'Customer',
              render: (c) => (
                <>
                  <div className="mc-cell-main">{c.name || DASH}</div>
                  <div className="mc-cell-sub mc-mono">{c.phone || 'No phone on file'}</div>
                </>
              )
            },
            { key: 'orders', header: 'Orders', align: 'right', render: (c) => <span className="mc-row" style={{ justifyContent: 'flex-end', gap: 8 }}>{Number(c.orders) > 1 && <Badge tone="ok">Repeat</Badge>}<b className="mc-mono">{c.orders}</b></span> },
            { key: 'spend', header: 'Paid spend', align: 'right', render: (c) => <b className="mc-mono">{money(c.spend)}</b> },
            { key: 'channel', header: 'Bought', render: (c) => <span className="mc-cell-sub" style={{ margin: 0 }}>{[Number(c.onlineOrders) ? `${c.onlineOrders} online` : '', Number(c.counterOrders) ? `${c.counterOrders} at counter` : ''].filter(Boolean).join(' · ')}</span> },
            { key: 'last', header: 'Last order', render: (c) => <span title={c.lastOrderAt}>{timeAgo(c.lastOrderAt)}</span> }
          ]}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onChange={setPage} />
      </section>}
      <div style={{ marginTop: 14 }}>
        <Notice>Spend counts paid orders only, without delivery fees. Click a customer to see their orders.</Notice>
      </div>
    </>
  );
}
