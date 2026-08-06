import { useRef, useState } from 'react';
import { Package, ShieldAlert, Upload, Download } from 'lucide-react';
import { naira } from '../lib/format';
import { parseProductCsv, PRODUCT_CSV_TEMPLATE } from '../lib/csv';

export default function InventoryTab({
  products,
  lowStock,
  canManage,
  newProd,
  onNewProdChange,
  onAddProduct,
  onImportProducts
}) {
  const fileInputRef = useRef(null);
  const [importMessage, setImportMessage] = useState(null);
  const [importError, setImportError] = useState(null);
  const [importing, setImporting] = useState(false);

  function downloadTemplate() {
    const blob = new Blob([PRODUCT_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImportMessage(null);
    setImportError(null);
    setImporting(true);

    try {
      const text = await file.text();
      const { products: rows, errors } = parseProductCsv(text);

      if (errors.length && rows.length === 0) {
        setImportError(errors[0]);
        return;
      }

      const result = onImportProducts(rows);
      if (!result?.ok) {
        setImportError(result?.message || 'Import failed.');
        return;
      }

      const warning = errors.length ? ` ${errors.length} row(s) skipped.` : '';
      setImportMessage(`${result.message}${warning}`);
      if (errors.length) setImportError(errors.slice(0, 3).join(' '));
    } catch {
      setImportError('Could not read that file. Use a CSV or TSV export.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="inventory-grid">
      <section className="panel">
        <div className="section-title">
          <Package size={16} />
          <h2>Stock overview</h2>
        </div>
        {lowStock.length > 0 && (
          <div className="alert-box">
            <ShieldAlert size={14} />
            {lowStock.length} item(s) are running low: {lowStock.map((item) => item.name).join(', ')}
          </div>
        )}
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="mono">{product.id}</td>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td className="mono">{naira(product.price)}</td>
                  <td className={`mono ${product.stock <= 5 ? 'low-stock-cell' : ''}`}>{product.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <Package size={16} />
          <h2>Add new stock</h2>
        </div>
        {canManage ? (
          <>
            <div className="inventory-form">
              <input placeholder="Product name" value={newProd.name} onChange={(e) => onNewProdChange({ ...newProd, name: e.target.value })} />
              <input placeholder="Category" value={newProd.category} onChange={(e) => onNewProdChange({ ...newProd, category: e.target.value })} />
              <div className="input-row">
                <input
                  placeholder="Sell price"
                  type="number"
                  value={newProd.price}
                  onChange={(e) => onNewProdChange({ ...newProd, price: e.target.value })}
                />
                <input
                  placeholder="Cost price"
                  type="number"
                  value={newProd.cost}
                  onChange={(e) => onNewProdChange({ ...newProd, cost: e.target.value })}
                />
              </div>
              <input
                placeholder="Stock quantity"
                type="number"
                value={newProd.stock}
                onChange={(e) => onNewProdChange({ ...newProd, stock: e.target.value })}
              />
              <button type="button" className="primary-btn" onClick={onAddProduct}>
                Add product
              </button>
            </div>

            <div className="import-box">
              <div className="section-title">
                <Upload size={16} />
                <h2>Import products</h2>
              </div>
              <p className="helper">
                Upload a CSV or TSV file from Excel / Google Sheets. Required columns:
                <strong> name, price, stock</strong>. Optional: <strong>sku, cost, category</strong>.
                Matching SKUs update existing products.
              </p>
              <div className="import-actions">
                <button type="button" className="secondary-btn" onClick={downloadTemplate}>
                  <Download size={14} />
                  Download template
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  <Upload size={14} />
                  {importing ? 'Importing…' : 'Upload CSV / TSV'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                  hidden
                  onChange={handleFileChange}
                />
              </div>
              {importMessage && <p className="helper success">{importMessage}</p>}
              {importError && <p className="helper error">{importError}</p>}
            </div>
          </>
        ) : (
          <div className="alert-box">
            <ShieldAlert size={14} />
            Only supervisors, managers and admins can change inventory records.
          </div>
        )}
      </section>
    </div>
  );
}
