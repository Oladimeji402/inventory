import React, { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  Package,
  ImagePlus,
  Loader2
} from 'lucide-react';
import { STORE_CATEGORIES } from '../../lib/merchantConstants';
import { formatNaira } from '../../lib/formatMoney';
import Modal from '../../shared/ui/Modal';
import DataTable from '../../shared/ui/DataTable';
import Badge from '../../shared/ui/Badge';

const emptyForm = {
  name: '',
  category: 'General Retail',
  price: '',
  cost: '',
  stock: '',
  lowStockThreshold: 5,
  sku: '',
  imageUrl: ''
};

export default function MerchantProducts({
  products = [],
  loading = false,
  canManage = true,
  onSaveProduct,
  onDeleteProduct,
  onSetProductActive,
  onUploadImage,
  isAddModalOpen,
  onCloseAddModal,
  onOpenAddModal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isStatsOpen, setIsStatsOpen] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const activeProductsCount = products.filter((product) => product.isActive).length;
  const lowStockCount = products.filter((product) => product.stock <= product.lowStockThreshold).length;
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
      lowStockThreshold: product.lowStockThreshold,
      sku: product.barcode || '',
      imageUrl: product.imageUrl || ''
    });
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setError('');
    setFormData(emptyForm);
    if (onCloseAddModal) onCloseAddModal();
  };

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUploadImage) return;
    setUploading(true);
    setError('');
    const result = await onUploadImage(file);
    setUploading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setFormData((current) => ({ ...current, imageUrl: result.data.url }));
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
      lowStockThreshold: formData.lowStockThreshold,
      barcode: formData.sku,
      imageUrl: formData.imageUrl,
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
    <div style={{ paddingBottom: 40 }}>
      <div className="merchant-page-header">
        <h1>Product Catalog</h1>
        <div className="merchant-page-header-actions">
          <div className="merchant-search-wrap" style={{ width: 260 }}>
            <Search size={16} color="var(--mx-text-3)" />
            <input
              type="text"
              className="merchant-search-input"
              placeholder="Search product or barcode…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          {canManage && (
            <button className="merchant-btn-primary" onClick={onOpenAddModal}>
              <Plus size={15} />
              <span>New Product</span>
            </button>
          )}
        </div>
      </div>

      <div className="mx-card">
        <div className="merchant-stats-toggle" onClick={() => setIsStatsOpen(!isStatsOpen)}>
          <h3 className="mx-card-title">Product Statistics</h3>
          <button type="button" className="merchant-stats-toggle-btn">
            {isStatsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        {isStatsOpen && (
          <div className="merchant-stats-grid">
            <div>
              <div className="merchant-stat-label">Active Products</div>
              <div className="merchant-stat-value font-mono">{activeProductsCount}</div>
            </div>
            <div>
              <div className="merchant-stat-label">Low / out of stock</div>
              <div className="merchant-stat-value font-mono" style={{ color: lowStockCount > 0 ? 'var(--mx-danger)' : undefined }}>{lowStockCount}</div>
            </div>
            <div>
              <div className="merchant-stat-label">Shelf value</div>
              <div className="merchant-stat-value font-mono">{formatNaira(inventoryValue)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-card" style={{ marginTop: 20 }}>
        <DataTable
          loading={loading}
          rows={filteredProducts}
          empty={{
            icon: Package,
            title: products.length === 0 ? 'No products yet' : 'No matching products',
            desc: products.length === 0
              ? 'Add the items you sell — they are stored on your store only, other stores cannot see them.'
              : 'Try a different search.'
          }}
          columns={[
            {
              key: 'name',
              header: 'Product',
              render: (p) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt="" className="mx-table-thumb" />
                    : <span className="mx-table-thumb-placeholder"><Package size={16} /></span>}
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--mx-text-3)' }}>
                      {p.category}{p.barcode ? ` · ${p.barcode}` : ''}
                    </div>
                  </div>
                </div>
              )
            },
            {
              key: 'stock',
              header: 'Stock',
              render: (p) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="font-mono" style={{ fontWeight: 700 }}>{p.stock}</span>
                  {p.stock === 0
                    ? <Badge tone="danger">Out</Badge>
                    : p.stock <= p.lowStockThreshold
                      ? <Badge tone="warning">Low</Badge>
                      : null}
                </div>
              )
            },
            { key: 'price', header: 'Price', render: (p) => <span className="font-mono" style={{ fontWeight: 700 }}>{formatNaira(p.price)}</span> },
            {
              key: 'active',
              header: 'On storefront',
              render: (p) => (
                <button
                  type="button"
                  className={`merchant-toggle${p.isActive ? ' on' : ''}`}
                  disabled={!canManage}
                  onClick={(e) => { e.stopPropagation(); canManage && onSetProductActive(p.id, !p.isActive); }}
                  aria-label="Toggle storefront visibility"
                >
                  <span className="merchant-toggle-knob" />
                </button>
              )
            },
            ...(canManage ? [{
              key: 'actions',
              header: '',
              align: 'right',
              render: (p) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button className="merchant-icon-btn" onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }} title="Edit"><Edit3 size={14} /></button>
                  <button className="merchant-icon-btn danger" onClick={(e) => { e.stopPropagation(); onDeleteProduct(p.id); }} title="Delete"><Trash2 size={14} /></button>
                </div>
              )
            }] : [])
          ]}
        />
      </div>

      <Modal
        open={isModalVisible}
        title={editingProduct ? 'Edit Product Details' : 'Add New Product'}
        onClose={handleCloseModal}
        footer={
          <>
            <button type="button" className="merchant-btn-secondary" onClick={handleCloseModal}>Cancel</button>
            <button type="submit" form="product-form" className="merchant-btn-primary" disabled={saving}>
              <Check size={14} />
              <span>{saving ? 'Saving…' : editingProduct ? 'Update Product' : 'Publish Product'}</span>
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="merchant-field-group">
            <label className="merchant-field-label">Photo</label>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
            <div className="merchant-photo-picker" onClick={handlePickPhoto}>
              {uploading ? (
                <Loader2 size={20} className="mx-spin" />
              ) : formData.imageUrl ? (
                <img src={formData.imageUrl} alt="" />
              ) : (
                <>
                  <ImagePlus size={20} />
                  <span>Click to add a photo</span>
                </>
              )}
            </div>
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Low-stock alert at</label>
              <input
                type="number"
                min="0"
                value={formData.lowStockThreshold}
                onChange={(event) => setFormData({ ...formData, lowStockThreshold: event.target.value })}
                className="merchant-field-input font-mono"
              />
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
          </div>

          {error && <div className="merchant-form-error">{error}</div>}
        </form>
      </Modal>
    </div>
  );
}
