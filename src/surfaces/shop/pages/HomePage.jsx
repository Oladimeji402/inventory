import { useMemo, useState } from 'react';
import { MapPin, Package, Search, Store } from 'lucide-react';
import { fetchMarketplaceStores } from '../../../services/storefront';
import { useAsync } from '../../../hooks/useAsync';

export default function HomePage({ navigate }) {
  const stores = useAsync(() => fetchMarketplaceStores(null), []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const all = stores.data || [];
  const categories = useMemo(() => ['All', ...Array.from(new Set(all.map((s) => s.category).filter(Boolean)))], [all]);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((s) => (category === 'All' || s.category === category) && (!term || `${s.name} ${s.category} ${s.city || ''} ${s.state || ''}`.toLowerCase().includes(term)));
  }, [all, search, category]);

  return (
    <div className="sh-wrap">
      <section className="sh-hero">
        <h1>Order from stores near you</h1>
        <p>Browse local stores, pay securely, and track your delivery from the store to your door.</p>
        <label className="sh-search">
          <Search size={17} />
          <input className="sh-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stores or categories" aria-label="Search stores" />
        </label>
        {categories.length > 2 && (
          <div className="sh-chips" role="group" aria-label="Categories">
            {categories.map((c) => (
              <button key={c} type="button" className={`sh-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
        )}
      </section>

      {stores.loading && !stores.data ? (
        <div className="sh-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="sh-skel" style={{ height: 130 }} />)}</div>
      ) : rows.length === 0 ? (
        <div className="sh-empty">
          <Store size={34} />
          <strong>{all.length === 0 ? 'No stores are open yet' : 'No stores match your search'}</strong>
          {all.length === 0 ? 'Check back soon — new stores join every week.' : 'Try a different word or category.'}
        </div>
      ) : (
        <div className="sh-grid">
          {rows.map((store) => (
            <button key={store.id} type="button" className="sh-store" onClick={() => navigate(`/store/${store.slug}`)}>
              <span className="sh-store-top">
                <span className="sh-store-icon">{(store.name || '?').slice(0, 1).toUpperCase()}</span>
                <span><strong>{store.name}</strong><span className="sh-muted">{store.category}</span></span>
              </span>
              <span className="sh-meta"><MapPin size={13} />{[store.city, store.state].filter(Boolean).join(', ') || store.address || 'Location on request'}</span>
              <span className="sh-meta"><Package size={13} />{store.productCount ?? 0} product{store.productCount === 1 ? '' : 's'} in stock</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
