import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, ImagePlus, Loader2, Package, PackageX, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import {
  adjustStock,
  deleteProduct,
  fetchAllProducts,
  fetchProducts,
  importProducts,
  saveProduct,
  setProductActive,
  uploadProductImage
} from '../../services/merchant';
import { PRODUCT_CSV_TEMPLATE, parseProductCsv } from '../../lib/csv';
import { STORE_CATEGORIES } from '../../lib/merchantConstants';
import { exportProductsCsv } from './exports';
import {
  ActionDialog,
  Badge,
  DataTable,
  Dialog,
  ErrorBanner,
  Field,
  FilterChips,
  Notice,
  PageHeader,
  Pagination,
  SearchBox,
  StatCard,
  useAsync,
  useDebounced
} from './ui';
import { count, money } from './format';

const PAGE_SIZE = 25;
const emptyForm = { name: '', category: 'General Retail', price: '', cost: '', stock: '', lowStockThreshold: 5, barcode: '', imageUrl: '', isActive: true };

function readView() {
  if (typeof window === 'undefined') return 'all';
  return new URLSearchParams(window.location.search).get('view') || 'all';
}

function ProductDialog({ product, tenantId, onClose, onSaved, onDelete, notify }) {
  const [form, setForm] = useState(() => (product
    ? {
        name: product.name, category: product.category, price: product.price, cost: product.cost, stock: product.stock,
        lowStockThreshold: product.lowStockThreshold, barcode: product.barcode || '', imageUrl: product.imageUrl || '', isActive: product.isActive
      }
    : emptyForm));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadProductImage(tenantId, file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await saveProduct(tenantId, { ...form, id: product?.id });
      notify(product ? 'Product updated' : 'Product added');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Dialog title={product ? 'Edit product' : 'New product'} onClose={saving ? () => {} : onClose} wide>
      <form onSubmit={submit}>
        <div className="mc-form-grid">
          <Field label="Photo" wide hint="Shown on your storefront. JPG or PNG, up to 5 MB.">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} aria-label="Product photo file" />
            <button type="button" className="mc-photo" onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 size={20} className="mc-spin" /> : form.imageUrl ? <img src={form.imageUrl} alt="Product" /> : <span><ImagePlus size={20} /><br />Add a photo</span>}
            </button>
          </Field>
          <Field label="Product name *" htmlFor="pf-name" wide>
            <input id="pf-name" className="mc-input" required maxLength={120} value={form.name} onChange={set('name')} placeholder="e.g. Peak Milk 400g" autoFocus />
          </Field>
          <Field label="Selling price (₦) *" htmlFor="pf-price">
            <input id="pf-price" className="mc-input mc-mono" type="number" min="1" step="any" required value={form.price} onChange={set('price')} />
          </Field>
          <Field label="Cost price (₦)" htmlFor="pf-cost" hint="Optional. Only you see this.">
            <input id="pf-cost" className="mc-input mc-mono" type="number" min="0" step="any" value={form.cost} onChange={set('cost')} />
          </Field>
          <Field label="Stock on hand *" htmlFor="pf-stock">
            <input id="pf-stock" className="mc-input mc-mono" type="number" min="0" step="1" required value={form.stock} onChange={set('stock')} />
          </Field>
          <Field label="Low-stock alert at" htmlFor="pf-low" hint="You are warned when stock falls to this number.">
            <input id="pf-low" className="mc-input mc-mono" type="number" min="0" step="1" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
          </Field>
          <Field label="Category" htmlFor="pf-cat" hint="Pick one or type your own.">
            <input id="pf-cat" className="mc-input" list="pf-cats" maxLength={60} value={form.category} onChange={set('category')} />
            <datalist id="pf-cats">{STORE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Barcode / SKU" htmlFor="pf-bar" hint="Used to match this product when you import a CSV.">
            <input id="pf-bar" className="mc-input mc-mono" value={form.barcode} onChange={set('barcode')} />
          </Field>
          <label className="mc-check" style={{ gridColumn: '1 / -1' }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            <span>Show on my storefront</span>
          </label>
        </div>
        {error && <div className="mc-error" role="alert" style={{ margin: '14px 0 0' }}>{error}</div>}
        <div className="mc-dialog-actions">
          {product && <button type="button" className="mc-btn mc-btn-danger" style={{ marginRight: 'auto' }} onClick={() => onDelete(product)} disabled={saving}><Trash2 size={14} /> Delete</button>}
          <button type="button" className="mc-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="mc-btn mc-btn-primary" disabled={saving || uploading}>{saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function ImportDialog({ onClose, onDone, notify }) {
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setResult(null);
    setFileName(file.name);
    setParsed(parseProductCsv(await file.text()));
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([PRODUCT_CSV_TEMPLATE], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const outcome = await importProducts(parsed.products, (done, total) => setProgress({ done, total }));
      setResult(outcome);
      notify(`Imported: ${outcome.created} new, ${outcome.updated} updated`);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Import products from CSV" onClose={busy ? () => {} : onClose} wide>
      <p>
        Columns: <b className="mc-mono">name, price, stock</b> (required) and <b className="mc-mono">sku, cost, category</b> (optional).
        A SKU that already exists updates that product&apos;s price, cost, stock and category; rows without a SKU always create a new product.
      </p>
      <div className="mc-row" style={{ marginBottom: 14 }}>
        <button type="button" className="mc-btn mc-btn-sm" onClick={downloadTemplate}><Download size={14} /> Download template</button>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={onFile} aria-label="CSV file" />
      {!result && (
        <button type="button" className="mc-dropzone" onClick={() => fileRef.current?.click()}>
          <Upload size={20} /><br />{fileName || 'Choose a CSV file'}
        </button>
      )}

      {parsed && !result && (
        <div style={{ marginTop: 14 }}>
          <Notice tone={parsed.products.length ? 'info' : 'bad'} title={`${parsed.products.length} product${parsed.products.length === 1 ? '' : 's'} ready to import`}>
            {parsed.errors.length ? `${parsed.errors.length} row${parsed.errors.length === 1 ? '' : 's'} will be skipped.` : 'No problems found in the file.'}
          </Notice>
          {parsed.errors.length > 0 && (
            <ul className="mc-note" style={{ paddingLeft: 18 }}>
              {parsed.errors.slice(0, 6).map((message) => <li key={message}>{message}</li>)}
              {parsed.errors.length > 6 && <li>…and {parsed.errors.length - 6} more</li>}
            </ul>
          )}
        </div>
      )}

      {progress && busy && <p className="mc-note">Imported {progress.done} of {progress.total}…</p>}
      {result && (
        <div style={{ marginTop: 6 }}>
          <Notice tone={result.errors.length ? 'warn' : 'info'} title="Import finished">
            {result.created} created, {result.updated} updated{result.errors.length ? `, ${result.errors.length} failed` : ''}.
          </Notice>
          {result.errors.length > 0 && (
            <ul className="mc-note" style={{ paddingLeft: 18 }}>
              {result.errors.slice(0, 8).map((item) => <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>)}
            </ul>
          )}
        </div>
      )}
      {error && <div className="mc-error" role="alert" style={{ margin: '14px 0 0' }}>{error}</div>}

      <div className="mc-dialog-actions">
        <button type="button" className="mc-btn" onClick={onClose} disabled={busy}>{result ? 'Close' : 'Cancel'}</button>
        {!result && (
          <button type="button" className="mc-btn mc-btn-primary" disabled={busy || !parsed?.products.length} onClick={run}>
            {busy ? 'Importing…' : `Import ${parsed?.products.length || ''} products`.trim()}
          </button>
        )}
      </div>
    </Dialog>
  );
}

export default function MerchantProducts({ tenant, canManage, notify, refreshKey, onChanged }) {
  const [view, setView] = useState(readView);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null); // product | 'new' | null
  const [importing, setImporting] = useState(false);
  const [restocking, setRestocking] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const debounced = useDebounced(search);
  const seen = useRef(false);

  const { data, loading, error, reload } = useAsync(
    () => fetchProducts({ view, search: debounced, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [view, debounced, page]
  );

  useEffect(() => {
    if (!seen.current) { seen.current = true; return; }
    reload({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const counts = data?.counts || {};
  const changed = () => { reload({ silent: true }); onChanged(); };

  const toggleActive = async (product) => {
    setTogglingId(product.id);
    try {
      await setProductActive(tenant.id, product.id, !product.isActive);
      notify(product.isActive ? `${product.name} hidden from your storefront` : `${product.name} is on your storefront`);
      changed();
    } catch (err) {
      notify(err.message, 'bad');
    } finally {
      setTogglingId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllProducts({ view, search: debounced });
      exportProductsCsv(all.rows);
      notify(all.truncated ? `Exported the first ${all.rows.length} of ${all.total} products` : `Exported ${all.rows.length} products`);
    } catch (err) {
      notify(err.message, 'bad');
    } finally {
      setExporting(false);
    }
  };

  const changeView = (next) => {
    setView(next);
    setPage(0);
    const url = new URL(window.location.href);
    if (next === 'all') url.searchParams.delete('view'); else url.searchParams.set('view', next);
    window.history.replaceState({}, '', url);
  };

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Your catalogue and stock. Stock drops automatically when an order is placed and returns if it is cancelled."
        actions={canManage && (
          <>
            <button type="button" className="mc-btn" onClick={() => setImporting(true)}><Upload size={15} /> Import CSV</button>
            <button type="button" className="mc-btn" onClick={exportCsv} disabled={exporting}><Download size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className="mc-btn mc-btn-primary" onClick={() => setEditing('new')}><Plus size={15} /> New product</button>
          </>
        )}
      />
      <ErrorBanner message={error} onRetry={reload} />
      {!canManage && <div style={{ marginBottom: 16 }}><Notice>You can view products. Only the store owner can change them.</Notice></div>}

      <div className="mc-grid mc-grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Products" icon={Package} value={counts.all} loading={loading && !data} hint={data ? `${count(counts.active)} on storefront` : undefined} />
        <StatCard label="Running low" icon={AlertTriangle} tint="#fef3c7" color="#d97706" value={counts.low} loading={loading && !data} hint="at or below alert level" delay={60} />
        <StatCard label="Out of stock" icon={PackageX} tint="#fee2e2" color="#dc2626" value={counts.out} loading={loading && !data} hint="hidden from shoppers" delay={120} />
        <StatCard label="Hidden" icon={Package} tint="#f1f5f9" color="#475569" value={counts.inactive} loading={loading && !data} hint="switched off by you" delay={180} />
      </div>

      <div className="mc-toolbar">
        <FilterChips
          label="Product view"
          value={view}
          onChange={changeView}
          options={[
            { value: 'all', label: 'All', count: data ? counts.all : undefined },
            { value: 'active', label: 'On storefront', count: data ? counts.active : undefined },
            { value: 'low', label: 'Running low', count: data ? counts.low : undefined },
            { value: 'out', label: 'Out of stock', count: data ? counts.out : undefined },
            { value: 'inactive', label: 'Hidden', count: data ? counts.inactive : undefined }
          ]}
        />
      </div>
      <div className="mc-toolbar">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search name, barcode or category" />
      </div>

      {(data || loading) && <section className="mc-card">
        <DataTable
          loading={loading && !data}
          rows={data?.rows || []}
          empty={{
            icon: Package,
            title: counts.all === 0 && view === 'all' && !debounced ? 'No products yet' : 'No products match this view',
            text: counts.all === 0 && view === 'all' && !debounced
              ? 'Add the items you sell. Only you and your team can see your catalogue until you switch a product on for your storefront.'
              : 'Try a different filter or search.',
            action: canManage && counts.all === 0 && view === 'all' && !debounced
              ? <button type="button" className="mc-btn mc-btn-primary" onClick={() => setEditing('new')}><Plus size={15} /> Add your first product</button>
              : undefined
          }}
          columns={[
            {
              key: 'name',
              header: 'Product',
              render: (p) => (
                <div className="mc-prodcell">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="mc-thumb" /> : <span className="mc-thumb"><Package size={16} /></span>}
                  <div style={{ minWidth: 0 }}>
                    <div className="mc-cell-main">{p.name}</div>
                    <div className="mc-cell-sub">{p.category}{p.barcode ? ` · ${p.barcode}` : ''}</div>
                  </div>
                </div>
              )
            },
            {
              key: 'stock',
              header: 'Stock',
              render: (p) => (
                <span className="mc-row" style={{ gap: 8 }}>
                  <b className="mc-mono">{p.stock}</b>
                  {p.isActive && p.stock === 0 ? <Badge tone="bad">Out</Badge> : p.isActive && p.stock <= p.lowStockThreshold ? <Badge tone="warn">Low</Badge> : null}
                </span>
              )
            },
            { key: 'price', header: 'Price', align: 'right', render: (p) => <b className="mc-mono">{money(p.price)}</b> },
            { key: 'cost', header: 'Cost', align: 'right', render: (p) => <span className="mc-mono">{p.cost ? money(p.cost) : '—'}</span> },
            {
              key: 'active',
              header: 'On storefront',
              render: (p) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.isActive}
                  aria-label={`${p.name} on storefront`}
                  className="mc-switch"
                  disabled={!canManage || togglingId === p.id}
                  onClick={(e) => { e.stopPropagation(); toggleActive(p); }}
                />
              )
            },
            ...(canManage ? [{
              key: 'edit',
              header: '',
              align: 'right',
              render: (p) => (
                <span className="mc-row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                  <button type="button" className="mc-btn mc-btn-sm" onClick={() => setRestocking(p)} aria-label={`Adjust stock for ${p.name}`}><Plus size={13} /> Stock</button>
                  <button type="button" className="mc-btn mc-btn-sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Pencil size={13} /> Edit</button>
                </span>
              )
            }] : [])
          ]}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onChange={setPage} />
      </section>}

      {editing && (
        <ProductDialog
          product={editing === 'new' ? null : editing}
          tenantId={tenant.id}
          notify={notify}
          onSaved={changed}
          onDelete={(p) => { setEditing(null); setDeleting(p); }}
          onClose={() => setEditing(null)}
        />
      )}
      {restocking && (
        <ActionDialog
          title={`Adjust stock — ${restocking.name}`}
          description={`${restocking.stock} in stock now. Enter units received (for example 24) or a negative number to write off damaged or lost units (for example -3).`}
          inputLabel="Units to add or remove"
          inputType="input"
          inputRequired
          inputPlaceholder="24"
          confirmLabel="Update stock"
          onConfirm={async (value) => {
            const delta = Number(value);
            if (!Number.isInteger(delta) || delta === 0) throw new Error('Enter a whole number other than zero.');
            const result = await adjustStock(restocking.id, delta);
            notify(`${restocking.name}: ${result.stock} in stock`);
            changed();
          }}
          onClose={() => setRestocking(null)}
        />
      )}
      {deleting && (
        <ActionDialog
          title={`Delete ${deleting.name}?`}
          description="It is removed from your catalogue for good. Past orders keep their line items. If you only want to stop selling it, hide it from your storefront instead."
          confirmLabel="Delete product"
          tone="danger"
          onConfirm={() => deleteProduct(tenant.id, deleting.id).then(() => { notify(`${deleting.name} deleted`); changed(); })}
          onClose={() => setDeleting(null)}
        />
      )}
      {importing && <ImportDialog notify={notify} onDone={changed} onClose={() => setImporting(false)} />}
    </>
  );
}
