import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Box,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Package
} from 'lucide-react';
import { STORE_CATEGORIES } from '../../lib/merchantConstants';
import { formatNaira } from '../../lib/formatMoney';

const emptyForm = {
  name: '',
  category: 'General Retail',
  price: '',
  cost: '',
  stock: '',
  sku: ''
};

export default function MerchantProducts({
  products = [],
  loading = false,
  canManage = true,
  onSaveProduct,
  onDeleteProduct,
  onSetProductActive,
  isAddModalOpen,
  onCloseAddModal,
  onOpenAddModal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isStatsOpen, setIsStatsOpen] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeProductsCount = products.filter((product) => product.isActive).length;
  const lowStockCount = products.filter((product) => product.stock <= 5).length;
  const inventoryValue = products.reduce((sum, product) => sum + product.price * product.stock, 0);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return products.filter((product) => {
      if (!query) return true;
      return product.name.toLowerCase().includes(query)
        || (product.barcode || '').toLowerCase().includes(query)
        || (product.category || '').toLowerCase().includes(query);
    });
  }, [products, searchTerm]);

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setError('');
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      sku: product.barcode || ''
    });
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setError('');
    setFormData(emptyForm);
    if (onCloseAddModal) onCloseAddModal();
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    const result = await onSaveProduct({
      id: editingProduct?.id,
      name: formData.name,
      category: formData.category,
      price: formData.price,
      cost: formData.cost,
      stock: formData.stock,
      barcode: formData.sku,
      isActive: editingProduct ? editingProduct.isActive : true
    });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    handleCloseModal();
  };

  const isModalVisible = isAddModalOpen || editingProduct !== null;

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: 0, letterSpacing: '-0.02em' }}>
          All Product List
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1.5px solid #e5e5e5', borderRadius: '8px', padding: '8px 14px', width: '260px' }}>
            <Search size={16} color="#a3a3a3" />
            <input
              type="text"
              placeholder="Search product or barcode..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '13.5px' }}
            />
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#ffffff', border: '1.5px solid #e5e5e5', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#525252' }}>
            <span>Show All Products</span>
            <span style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: '100px', fontSize: '11.5px', fontWeight: 700, color: '#0a0a0a' }}>
              {products.length}
            </span>
          </div>
          {canManage && (
            <button
              className="merchant-btn-primary"
              style={{ padding: '9px 18px', background: '#0a0a0a', borderColor: '#0a0a0a' }}
              onClick={onOpenAddModal}
            >
              <Plus size={15} />
              <span>New Product</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setIsStatsOpen(!isStatsOpen)}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0a0a0a' }}>Product Statistic</h3>
          <button type="button" style={{ background: 'none', border: 'none', color: '#737373', cursor: 'pointer' }}>
            {isStatsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        {isStatsOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>Active Products</div>
              <div className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0a0a0a', marginTop: '4px' }}>{activeProductsCount}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>Low / out of stock</div>
              <div className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0a0a0a', marginTop: '4px' }}>{lowStockCount}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>Shelf value</div>
              <div className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0a0a0a', marginTop: '4px' }}>{formatNaira(inventoryValue)}</div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="merchant-card" style={{ textAlign: 'center', padding: '48px', color: '#737373' }}>Loading catalog…</div>
      ) : filteredProducts.length === 0 ? (
        <div className="merchant-card" style={{ textAlign: 'center', padding: '56px 24px', color: '#737373' }}>
          <Package size={36} color="#d4d4d4" style={{ margin: '0 auto 8px', display: 'block' }} />
          <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#0a0a0a' }}>
            {products.length === 0 ? 'No products yet' : 'No matching products'}
          </p>
          <p style={{ fontSize: '13px', margin: 0 }}>
            {products.length === 0
              ? 'Add the items you sell. They are stored on your tenant only — other stores cannot see them.'
              : 'Try a different search.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'grid',
                gridTemplateColumns: '2.2fr 1fr 1fr 0.8fr 0.8fr',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 3px' }}>{product.name}</h4>
                <div style={{ fontSize: '12px', color: '#737373' }}>
                  {product.category}{product.barcode ? ` · ${product.barcode}` : ''}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '16px' }}>
                <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Stock</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Box size={14} color="#737373" />
                  <span className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: product.stock <= 5 ? '#e11d48' : '#0a0a0a' }}>
                    {product.stock}
                  </span>
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '16px' }}>
                <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Price</div>
                <div className="font-mono" style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>{formatNaira(product.price)}</div>
              </div>
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '16px' }}>
                <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600, marginBottom: '4px' }}>On storefront</div>
                <div
                  onClick={() => canManage && onSetProductActive(product.id, !product.isActive)}
                  style={{
                    width: '38px',
                    height: '22px',
                    borderRadius: '100px',
                    background: product.isActive ? '#0a0a0a' : '#e5e5e5',
                    cursor: canManage ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    position: 'absolute',
                    top: '3px',
                    left: product.isActive ? '19px' : '3px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>
              {canManage && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                  <button
                    onClick={() => handleOpenEdit(product)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e5e5', background: '#ffffff', cursor: 'pointer' }}
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e5e5', background: '#ffffff', cursor: 'pointer', color: '#b91c1c' }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalVisible && (
        <div className="merchant-modal-overlay" onClick={handleCloseModal}>
          <div className="merchant-modal-box" onClick={(event) => event.stopPropagation()}>
            <div className="merchant-modal-header">
              <h3 className="merchant-modal-title">
                {editingProduct ? 'Edit Product Details' : 'Add New Product to Store'}
              </h3>
              <button type="button" onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#737373' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="merchant-modal-body">
                <div className="merchant-field-group">
                  <label className="merchant-field-label">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Peak Milk 400g"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="merchant-field-input"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="merchant-field-group">
                    <label className="merchant-field-label">Category</label>
                    <select
                      value={formData.category}
                      onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                      className="merchant-field-select"
                    >
                      {STORE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="merchant-field-group">
                    <label className="merchant-field-label">Shelf Stock (Units) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(event) => setFormData({ ...formData, stock: event.target.value })}
                      className="merchant-field-input font-mono"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="merchant-field-group">
                    <label className="merchant-field-label">Selling Price (₦) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(event) => setFormData({ ...formData, price: event.target.value })}
                      className="merchant-field-input font-mono"
                    />
                  </div>
                  <div className="merchant-field-group">
                    <label className="merchant-field-label">Cost Price (₦)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cost}
                      onChange={(event) => setFormData({ ...formData, cost: event.target.value })}
                      className="merchant-field-input font-mono"
                    />
                  </div>
                </div>
                <div className="merchant-field-group">
                  <label className="merchant-field-label">Barcode / SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(event) => setFormData({ ...formData, sku: event.target.value })}
                    className="merchant-field-input font-mono"
                  />
                </div>
                {error && <div style={{ color: '#b91c1c', fontSize: '13px' }}>{error}</div>}
              </div>
              <div className="merchant-modal-footer">
                <button type="button" className="merchant-btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="merchant-btn-primary" disabled={saving} style={{ background: '#0a0a0a', borderColor: '#0a0a0a' }}>
                  <Check size={14} />
                  <span>{saving ? 'Saving…' : editingProduct ? 'Update Product' : 'Publish Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
