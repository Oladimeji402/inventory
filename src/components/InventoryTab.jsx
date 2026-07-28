import { Package, ShieldAlert } from 'lucide-react';
import { naira } from '../lib/format';

export default function InventoryTab({ products, lowStock, canManage, newProd, onNewProdChange, onAddProduct }) {
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
            <button className="primary-btn" onClick={onAddProduct}>
              Add product
            </button>
          </div>
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
