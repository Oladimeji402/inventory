import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Filter, 
  Edit3, 
  Eye, 
  MoreHorizontal, 
  Star, 
  Box, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Trophy, 
  RotateCcw, 
  Check, 
  X,
  Sparkles
} from 'lucide-react';

const initialProductList = [
  {
    id: 'PROD-01',
    name: 'Peak Evaporated Milk (400g Tin)',
    category: 'Groceries',
    rating: '4.8',
    performance: 'Excellent',
    views: '1,420',
    sold: '840',
    gaugePct: 92,
    stock: 94,
    price: 3400,
    cost: 2600,
    visible: true,
    sku: '6151100010214',
    emoji: '🥛'
  },
  {
    id: 'PROD-02',
    name: 'Amoxicillin 500mg (20 Capsules)',
    category: 'Pharmacy',
    rating: '4.9',
    performance: 'Excellent',
    views: '980',
    sold: '620',
    gaugePct: 88,
    stock: 45,
    price: 3800,
    cost: 2800,
    visible: true,
    sku: '6151100010221',
    emoji: '💊'
  },
  {
    id: 'PROD-03',
    name: 'Golden Penny Spaghetti (500g)',
    category: 'Groceries',
    rating: '4.6',
    performance: 'Good',
    views: '730',
    sold: '410',
    gaugePct: 74,
    stock: 240,
    price: 1800,
    cost: 1350,
    visible: true,
    sku: '6151100010238',
    emoji: '🍝'
  },
  {
    id: 'PROD-04',
    name: 'Digital Blood Pressure Monitor',
    category: 'Pharmacy',
    rating: '4.7',
    performance: 'Good',
    views: '340',
    sold: '28',
    gaugePct: 65,
    stock: 12,
    price: 24500,
    cost: 18000,
    visible: true,
    sku: '6151100010245',
    emoji: '🩺'
  },
  {
    id: 'PROD-05',
    name: 'Anker PowerCore 20,000mAh Bank',
    category: 'Electronics',
    rating: '4.9',
    performance: 'Excellent',
    views: '1,120',
    sold: '185',
    gaugePct: 90,
    stock: 18,
    price: 28000,
    cost: 21500,
    visible: false,
    sku: '6151100010252',
    emoji: '🔋'
  },
  {
    id: 'PROD-06',
    name: 'Baby Care Gentle Moisturizer (500ml)',
    category: 'Beauty',
    rating: '4.5',
    performance: 'Good',
    views: '410',
    sold: '94',
    gaugePct: 70,
    stock: 36,
    price: 6200,
    cost: 4800,
    visible: true,
    sku: '6151100010269',
    emoji: '🧴'
  },
  {
    id: 'PROD-07',
    name: 'First Aid Antiseptic Liquid (250ml)',
    category: 'Pharmacy',
    rating: '4.2',
    performance: 'Attention',
    views: '190',
    sold: '15',
    gaugePct: 35,
    stock: 3,
    price: 2100,
    cost: 1500,
    visible: true,
    sku: '6151100010276',
    emoji: '🩹'
  }
];

export default function MerchantProducts({ isAddModalOpen, onCloseAddModal, onOpenAddModal }) {
  const [products, setProducts] = useState(initialProductList);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isStatsOpen, setIsStatsOpen] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'Groceries',
    price: '',
    cost: '',
    stock: '',
    sku: '',
    emoji: '📦'
  });

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  // Stats Calculations
  const activeProductsCount = products.filter(p => p.visible).length;
  const totalSoldItems = products.reduce((sum, p) => sum + parseInt(p.sold || 0), 0);
  const winningProduct = products.reduce((prev, curr) => (parseInt(curr.sold) > parseInt(prev.sold) ? curr : prev), products[0]);

  // Toggle Visibility switch
  const handleToggleVisibility = (id) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, visible: !p.visible } : p));
  };

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return products.filter(p => {
      const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, searchTerm, categoryFilter]);

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      sku: p.sku,
      emoji: p.emoji
    });
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    if (onCloseAddModal) onCloseAddModal();
    setFormData({ name: '', category: 'Groceries', price: '', cost: '', stock: '', sku: '', emoji: '📦' });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        ...formData,
        price: Number(formData.price),
        cost: Number(formData.cost),
        stock: Number(formData.stock)
      } : p));
    } else {
      const newProd = {
        id: 'PROD-' + Math.floor(100 + Math.random() * 900),
        ...formData,
        rating: '5.0',
        performance: 'Excellent',
        views: '1',
        sold: '0',
        gaugePct: 85,
        price: Number(formData.price),
        cost: Number(formData.cost) || 0,
        stock: Number(formData.stock) || 0,
        visible: true,
        sku: formData.sku || String(Math.floor(1000000000000 + Math.random() * 9000000000000))
      };
      setProducts(prev => [newProd, ...prev]);
    }
    handleCloseModal();
  };

  // Mini semi-circle performance gauge SVG
  const renderGauge = (pct) => {
    const isHigh = pct >= 80;
    const isMedium = pct >= 50 && pct < 80;
    const color = isHigh ? '#2B7CFF' : isMedium ? '#10b981' : '#f43f5e';
    const strokeDash = (pct / 100) * 126;

    return (
      <svg width="44" height="26" viewBox="0 0 50 28" style={{ overflow: 'visible' }}>
        <path
          d="M 5 25 A 20 20 0 0 1 45 25"
          fill="none"
          stroke="#e5e5e5"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 5 25 A 20 20 0 0 1 45 25"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="63"
          strokeDashoffset={63 - (pct / 100) * 63}
        />
      </svg>
    );
  };

  const isModalVisible = isAddModalOpen || editingProduct !== null;

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* ── TOP ACTION BAR ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: 0, letterSpacing: '-0.02em' }}>
          All Product List
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1.5px solid #e5e5e5', borderRadius: '8px', padding: '8px 14px', width: '260px' }}>
            <Search size={16} color="#a3a3a3" />
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '13.5px' }}
            />
          </div>

          {/* Sort Button */}
          <button className="merchant-btn-secondary" style={{ padding: '8px 14px' }}>
            <SlidersHorizontal size={14} />
            <span>Sort By</span>
          </button>

          {/* Filter Total Count */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#ffffff', border: '1.5px solid #e5e5e5', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#525252' }}>
            <span>Show All Products</span>
            <span style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: '100px', fontSize: '11.5px', fontWeight: 700, color: '#0a0a0a' }}>
              {products.length}
            </span>
          </div>

          {/* New Product CTA */}
          <button 
            className="merchant-btn-primary" 
            style={{ padding: '9px 18px', background: '#0a0a0a', borderColor: '#0a0a0a' }}
            onClick={onOpenAddModal}
          >
            <Plus size={15} />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* ── PRODUCT STATISTIC COLLAPSIBLE BANNER ───────────────────── */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setIsStatsOpen(!isStatsOpen)}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0a0a0a' }}>
            Product Statistic
          </h3>
          <button style={{ background: 'none', border: 'none', color: '#737373', cursor: 'pointer' }}>
            {isStatsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {isStatsOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #f0f0f0' }}>
            {/* Active Products */}
            <div style={{ borderRight: '1px solid #f0f0f0', paddingRight: '16px' }}>
              <div style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>Active Products</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0a0a0a' }}>{activeProductsCount}</span>
                <span style={{ fontSize: '12px', color: '#737373', fontWeight: 500 }}>Live Items</span>
              </div>
            </div>

            {/* Winning Product */}
            <div style={{ borderRight: '1px solid #f0f0f0', paddingRight: '16px' }}>
              <div style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>Top Winning Product</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '18px' }}>{winningProduct.emoji}</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {winningProduct.name}
                </span>
              </div>
            </div>

            {/* Average Performance */}
            <div style={{ borderRight: '1px solid #f0f0f0', paddingRight: '16px' }}>
              <div style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>Average Performance</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                {renderGauge(84)}
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#2B7CFF' }}>Excellent!</span>
              </div>
            </div>

            {/* Products Sold */}
            <div style={{ borderRight: '1px solid #f0f0f0', paddingRight: '16px' }}>
              <div style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>Total Products Sold</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0a0a0a' }}>{totalSoldItems.toLocaleString()}</span>
                <span style={{ fontSize: '12px', color: '#737373', fontWeight: 500 }}>units</span>
              </div>
            </div>

            {/* Returns / Issues */}
            <div>
              <div style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>Return Rate</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0a0a0a' }}>0.4%</span>
                <span style={{ fontSize: '12px', color: '#2B7CFF', fontWeight: 600 }}>Very Low</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RICH PRODUCT ROWS ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredProducts.map((p) => {
          return (
            <div 
              key={p.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'grid',
                gridTemplateColumns: '2.2fr 1.6fr 1fr 1fr 0.8fr 0.8fr',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Product Info & Thumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  background: '#f7fafa', 
                  border: '1px solid #e5e5e5',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0 
                }}>
                  {p.emoji}
                </div>

                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#737373' }}>
                    <span>SKU: {p.sku.slice(0, 10)}</span>
                    <span>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b', fontWeight: 600 }}>
                      <Star size={11} fill="#f59e0b" color="#f59e0b" />
                      {p.rating}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance & Views */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid #f0f0f0', paddingLeft: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>
                    Performance <strong style={{ color: p.gaugePct >= 80 ? '#2B7CFF' : '#0a0a0a' }}>{p.performance}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#525252', marginTop: '2px' }}>
                    <span className="font-mono">👁 {p.views}</span>
                    <span>·</span>
                    <span className="font-mono">🛍 {p.sold}</span>
                  </div>
                </div>
                {renderGauge(p.gaugePct)}
              </div>

              {/* Stock */}
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '16px' }}>
                <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Stock</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Box size={14} color="#737373" />
                  <span className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: p.stock <= 5 ? '#e11d48' : '#0a0a0a' }}>
                    {p.stock}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '16px' }}>
                <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Product Price</div>
                <div className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: '#0a0a0a', marginTop: '2px' }}>
                  {formatNaira(p.price)}
                </div>
              </div>

              {/* Visibility Switch */}
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '16px' }}>
                <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600, marginBottom: '4px' }}>Visibility</div>
                <div 
                  onClick={() => handleToggleVisibility(p.id)}
                  style={{
                    width: '38px',
                    height: '22px',
                    borderRadius: '100px',
                    background: p.visible ? '#0a0a0a' : '#e5e5e5',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    position: 'absolute',
                    top: '3px',
                    left: p.visible ? '19px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                <button 
                  onClick={() => handleOpenEdit(p)}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e5e5', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#525252' }}
                  title="Edit"
                >
                  <Edit3 size={14} />
                </button>
                <button 
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e5e5', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#525252' }}
                  title="Preview"
                >
                  <Eye size={14} />
                </button>
                <button 
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e5e5', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#525252' }}
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── PAGINATION BAR ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28px', padding: '0 8px' }}>
        <button className="merchant-btn-secondary" style={{ padding: '8px 16px' }}>
          Previous
        </button>
        <span style={{ fontSize: '13px', color: '#737373', fontWeight: 600 }}>
          Page 1 of 4
        </span>
        <button className="merchant-btn-secondary" style={{ padding: '8px 16px' }}>
          Next
        </button>
      </div>

      {/* ── ADD / EDIT PRODUCT MODAL ──────────────────────────────── */}
      {isModalVisible && (
        <div className="merchant-modal-overlay" onClick={handleCloseModal}>
          <div className="merchant-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="merchant-modal-header">
              <h3 className="merchant-modal-title">
                {editingProduct ? 'Edit Product Details' : 'Add New Product to Store'}
              </h3>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#737373' }}>
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
                    placeholder="e.g. 4 Tier Shelving Unit"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="merchant-field-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="merchant-field-group">
                    <label className="merchant-field-label">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="merchant-field-select"
                    >
                      <option value="Groceries">Groceries & Food</option>
                      <option value="Pharmacy">Pharmacy & Healthcare</option>
                      <option value="Electronics">Electronics & Gadgets</option>
                      <option value="Beauty">Beauty & Cosmetics</option>
                      <option value="Furniture">Furniture & Setup</option>
                      <option value="Fashion">Fashion & Apparel</option>
                    </select>
                  </div>

                  <div className="merchant-field-group">
                    <label className="merchant-field-label">Shelf Stock (Units) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 92"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
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
                      placeholder="e.g. 14500"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="merchant-field-input font-mono"
                    />
                  </div>

                  <div className="merchant-field-group">
                    <label className="merchant-field-label">Cost Price (₦)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 11000"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="merchant-field-input font-mono"
                    />
                  </div>
                </div>

                <div className="merchant-field-group">
                  <label className="merchant-field-label">Barcode / SKU Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 6151100010214"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="merchant-field-input font-mono"
                  />
                </div>
              </div>

              <div className="merchant-modal-footer">
                <button type="button" className="merchant-btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="merchant-btn-primary" style={{ background: '#0a0a0a', borderColor: '#0a0a0a' }}>
                  <Check size={14} />
                  <span>{editingProduct ? 'Update Product' : 'Publish Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
