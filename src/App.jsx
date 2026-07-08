import { useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, LogOut, Package, Receipt, ClipboardList, ShieldAlert, UserCheck, DollarSign } from 'lucide-react';

const seedProducts = [
  { id: 'SKU-0001', name: 'Peak Milk Tin (Large)', price: 1800, cost: 1500, stock: 42, category: 'Dairy' },
  { id: 'SKU-0002', name: 'Indomie Carton (40pc)', price: 8500, cost: 7200, stock: 18, category: 'Noodles' },
  { id: 'SKU-0003', name: 'Golden Penny Semovita 1kg', price: 1450, cost: 1150, stock: 30, category: 'Grains' },
  { id: 'SKU-0004', name: 'Kings Vegetable Oil 1L', price: 3200, cost: 2700, stock: 25, category: 'Oil' },
  { id: 'SKU-0005', name: 'Coca-Cola 50cl (Pack 12)', price: 4800, cost: 3900, stock: 8, category: 'Drinks' },
  { id: 'SKU-0006', name: 'Dangote Sugar 1kg', price: 1600, cost: 1300, stock: 3, category: 'Grains' },
  { id: 'SKU-0007', name: 'Omo Detergent 900g', price: 2100, cost: 1750, stock: 20, category: 'Household' },
  { id: 'SKU-0008', name: 'Titus Sardine (Tin)', price: 950, cost: 750, stock: 60, category: 'Canned' }
];

const seedEmployees = [
  {
    id: 'E1',
    name: 'Ada Okafor',
    role: 'Sales Representative',
    pin: '1111',
    description: 'Frontline sales and customer service only.'
  },
  {
    id: 'E2',
    name: 'Bola Adebayo',
    role: 'Supervisor',
    pin: '2222',
    description: 'Can assist with stock checks and approvals.'
  },
  {
    id: 'E3',
    name: 'Grace Nwosu',
    role: 'Manager',
    pin: '9999',
    description: 'Can approve discounts, void sales and review reports.'
  },
  {
    id: 'E4',
    name: 'Kemi Yusuf',
    role: 'Store Admin',
    pin: '4444',
    description: 'Full administrative access for inventory and staff controls.'
  }
];

const permissionMatrix = {
  'Sales Representative': {
    sell: true,
    viewInventory: true,
    viewReports: true,
    applyDiscount: 5,
    manageInventory: false,
    voidSale: false,
    manageStaff: false,
    description: 'Handles customer checkout and basic product lookup.'
  },
  Supervisor: {
    sell: true,
    viewInventory: true,
    viewReports: true,
    applyDiscount: 10,
    manageInventory: true,
    voidSale: false,
    manageStaff: false,
    description: 'Supports stock movement and mid-level approvals.'
  },
  Manager: {
    sell: true,
    viewInventory: true,
    viewReports: true,
    applyDiscount: 15,
    manageInventory: true,
    voidSale: true,
    manageStaff: true,
    description: 'Owns day-to-day operations, approvals and exceptions.'
  },
  'Store Admin': {
    sell: true,
    viewInventory: true,
    viewReports: true,
    applyDiscount: 20,
    manageInventory: true,
    voidSale: true,
    manageStaff: true,
    description: 'Full operational control for inventory and staff settings.'
  }
};

const naira = (n) => `₦${n.toLocaleString('en-NG')}`;

export default function App() {
  const [products, setProducts] = useState(seedProducts);
  const [employees] = useState(seedEmployees);
  const [session, setSession] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('pos');
  const [sales, setSales] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [toast, setToast] = useState(null);
  const [newProd, setNewProd] = useState({ name: '', price: '', cost: '', stock: '', category: '' });
  const [discountPct, setDiscountPct] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [receiptNote, setReceiptNote] = useState('');

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [products, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = subtotal * (discountPct / 100);
  const total = Math.max(0, subtotal - discountAmount);

  const salesByEmployee = useMemo(() => {
    const map = {};
    sales.forEach((sale) => {
      if (!map[sale.employee]) map[sale.employee] = { count: 0, total: 0 };
      map[sale.employee].count += 1;
      map[sale.employee].total += sale.total;
    });
    return map;
  }, [sales]);

  const lowStock = products.filter((item) => item.stock <= 5);

  function flash(message) {
    setToast(message);
    window.clearTimeout(flash.timeout);
    flash.timeout = window.setTimeout(() => setToast(null), 2400);
  }

  function can(action, role = session?.employee?.role) {
    const rights = permissionMatrix[role] || permissionMatrix['Sales Representative'];
    return rights[action];
  }

  function maxDiscount(role = session?.employee?.role) {
    return permissionMatrix[role]?.applyDiscount ?? 0;
  }

  function clockIn() {
    if (!selectedEmp) return;
    if (pinInput !== selectedEmp.pin) {
      setPinError('PIN does not match. Please try again.');
      return;
    }

    setSession({ employee: selectedEmp, clockIn: new Date() });
    setAuditLog((log) => [{ time: new Date(), text: `${selectedEmp.name} clocked in`, type: 'shift' }, ...log]);
    setPinInput('');
    setPinError('');
    setSelectedEmp(null);
    flash(`Welcome, ${selectedEmp.name}`);
  }

  function clockOut() {
    if (!session) return;
    setAuditLog((log) => [{ time: new Date(), text: `${session.employee.name} clocked out`, type: 'shift' }, ...log]);
    setSession(null);
    setCart([]);
    setDiscountPct(0);
    setPaymentMethod('Cash');
    setCustomerName('Walk-in Customer');
    setReceiptNote('');
    setTab('pos');
  }

  function addToCart(product) {
    if (!session) return;
    if (!can('sell')) return flash('You do not have permission to process sales.');
    if (product.stock <= 0) return flash(`${product.name} is out of stock.`);
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          flash(`Only ${product.stock} left in stock.`);
          return current;
        }
        return current.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...current, { ...product, qty: 1 }];
    });
  }

  function changeQty(id, delta) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item;
          const product = products.find((entry) => entry.id === id);
          const newQty = item.qty + delta;
          if (newQty > product.stock) {
            flash(`Only ${product.stock} left in stock.`);
            return item;
          }
          return { ...item, qty: newQty };
        })
        .filter((item) => item.qty > 0)
    );
  }

  function removeFromCart(id) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  function checkout() {
    if (!session) return;
    if (cart.length === 0) return flash('Add at least one item before checkout.');
    if (discountPct > maxDiscount()) {
      return flash(`Discount limit is ${maxDiscount()}% for ${session.employee.role}.`);
    }

    setProducts((current) =>
      current.map((product) => {
        const item = cart.find((entry) => entry.id === product.id);
        return item ? { ...product, stock: product.stock - item.qty } : product;
      })
    );

    const sale = {
      id: `TXN-${(sales.length + 1).toString().padStart(4, '0')}`,
      items: cart,
      subtotal,
      discount: discountAmount,
      total,
      employee: session.employee.name,
      role: session.employee.role,
      paymentMethod,
      customerName,
      note: receiptNote,
      time: new Date()
    };

    setSales((current) => [sale, ...current]);
    setAuditLog((log) => [{ time: new Date(), text: `${session.employee.name} completed ${sale.id} for ${naira(total)}`, type: 'sale' }, ...log]);
    setCart([]);
    setDiscountPct(0);
    setPaymentMethod('Cash');
    setCustomerName('Walk-in Customer');
    setReceiptNote('');
    flash(`Sale complete — ${naira(total)}`);
  }

  function voidSale(saleId) {
    if (!can('voidSale')) return flash('Only managers and admins can void a sale.');
    const sale = sales.find((entry) => entry.id === saleId);
    if (!sale) return;
    setProducts((current) =>
      current.map((product) => {
        const item = sale.items.find((entry) => entry.id === product.id);
        return item ? { ...product, stock: product.stock + item.qty } : product;
      })
    );
    setSales((current) => current.filter((entry) => entry.id !== saleId));
    setAuditLog((log) => [{ time: new Date(), text: `${session.employee.name} VOIDED ${saleId}`, type: 'void' }, ...log]);
    flash(`${saleId} was voided.`);
  }

  function addProduct() {
    if (!can('manageInventory')) return flash('Only supervisors, managers and admins can add inventory.');
    if (!newProd.name || !newProd.price || !newProd.stock) return flash('Please complete the name, price and stock fields.');

    const id = `SKU-${(products.length + 1).toString().padStart(4, '0')}`;
    setProducts((current) => [
      ...current,
      {
        id,
        name: newProd.name,
        price: Number(newProd.price),
        cost: Number(newProd.cost) || 0,
        stock: Number(newProd.stock),
        category: newProd.category || 'General'
      }
    ]);
    setAuditLog((log) => [{ time: new Date(), text: `${session.employee.name} added ${newProd.name} (${id})`, type: 'stock' }, ...log]);
    setNewProd({ name: '', price: '', cost: '', stock: '', category: '' });
    flash('Product added to inventory.');
  }

  const roleCards = Object.entries(permissionMatrix).map(([role, rights]) => ({
    role,
    rights,
    badge: role === 'Manager' ? 'High access' : role === 'Store Admin' ? 'Full control' : 'Standard access'
  }));

  if (!session) {
    return (
      <div className="page-shell">
        <div className="hero-card">
          <div className="hero-top">
            <div className="brand-pill">Professional Retail Demo</div>
            <div className="brand-pill soft">Vercel-ready React POS</div>
          </div>
          <div className="hero-content">
            <div>
              <h1>MarketPOS <span>Operations Demo</span></h1>
              <p>Showcase a realistic retail point-of-sale experience with role-based access, stock controls, and reports for leadership review.</p>
            </div>
            <div className="hero-stats">
              <div>
                <strong>8</strong>
                <span>Products</span>
              </div>
              <div>
                <strong>4</strong>
                <span>Roles</span>
              </div>
              <div>
                <strong>Live</strong>
                <span>Demo</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2">
          <section className="panel">
            <div className="section-title">
              <UserCheck size={16} />
              <h2>Select your role</h2>
            </div>
            <div className="role-list">
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  className={`role-card ${selectedEmp?.id === employee.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedEmp(employee);
                    setPinError('');
                  }}
                >
                  <div>
                    <strong>{employee.name}</strong>
                    <p>{employee.role}</p>
                  </div>
                  <span>{employee.role}</span>
                </button>
              ))}
            </div>

            {selectedEmp && (
              <div className="login-box">
                <label htmlFor="pin">PIN for {selectedEmp.name}</label>
                <input
                  id="pin"
                  autoFocus
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && clockIn()}
                  placeholder="••••"
                />
                {pinError && <p className="helper error">{pinError}</p>}
                <button className="primary-btn" onClick={clockIn}>Clock in</button>
                <p className="helper">Demo PINs: Sales Rep 1111 · Supervisor 2222 · Manager 9999 · Admin 4444</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="section-title">
              <ShieldAlert size={16} />
              <h2>Role restrictions</h2>
            </div>
            <div className="policy-list">
              {roleCards.map((item) => (
                <div key={item.role} className="policy-item">
                  <div className="policy-head">
                    <strong>{item.role}</strong>
                    <span>{item.badge}</span>
                  </div>
                  <p>{item.rights.description}</p>
                  <ul>
                    <li>{item.rights.manageInventory ? 'Can add and manage inventory' : 'Cannot add inventory'}</li>
                    <li>{item.rights.voidSale ? 'Can void transactions' : 'Cannot void transactions'}</li>
                    <li>{item.rights.applyDiscount}% max discount</li>
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-icon"><Receipt size={16} /></div>
          <div>
            <h1>MarketPOS</h1>
            <p>{session.employee.role} · Clocked in</p>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="pill">{session.employee.name}</div>
          <button className="icon-btn" onClick={clockOut} title="Clock out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <nav className="tabs">
        {[
          { id: 'pos', label: 'Sales', icon: Receipt },
          { id: 'inventory', label: 'Inventory', icon: Package },
          { id: 'reports', label: 'Reports', icon: ClipboardList }
        ].map((item) => (
          <button key={item.id} className={`tab ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}

      {tab === 'pos' && (
        <div className="pos-layout">
          <section className="panel">
            <div className="section-title">
              <Search size={16} />
              <h2>Products</h2>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU"
              className="search-input"
            />
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <button key={product.id} className={`product-card ${product.stock <= 0 ? 'disabled' : ''}`} onClick={() => addToCart(product)} disabled={product.stock <= 0}>
                  <div className="product-meta">
                    <span>{product.id}</span>
                    <span>{product.category}</span>
                  </div>
                  <strong>{product.name}</strong>
                  <div className="product-foot">
                    <span>{naira(product.price)}</span>
                    <span className={product.stock <= 5 ? 'stock low' : 'stock'}>{product.stock} left</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <aside className="panel sidebar">
            <div className="section-title">
              <DollarSign size={16} />
              <h2>Current sale</h2>
            </div>
            <div className="cart-list">
              {cart.length === 0 && <div className="empty-state">Your cart is empty. Select a product to begin.</div>}
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-top">
                    <strong>{item.name}</strong>
                    <button onClick={() => removeFromCart(item.id)}><Trash2 size={14} /></button>
                  </div>
                  <div className="cart-item-bottom">
                    <div className="qty-control">
                      <button onClick={() => changeQty(item.id, -1)}><Minus size={12} /></button>
                      <span>{item.qty}</span>
                      <button onClick={() => changeQty(item.id, 1)}><Plus size={12} /></button>
                    </div>
                    <span>{naira(item.price * item.qty)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="receipt-box">
              <label className="field-label">Customer</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />

              <label className="field-label">Discount (%)</label>
              <input
                type="number"
                min="0"
                max={maxDiscount()}
                value={discountPct}
                onChange={(e) => setDiscountPct(Math.max(0, Math.min(maxDiscount(), Number(e.target.value) || 0)))}
              />
              <p className="helper">Allowed limit for {session.employee.role}: {maxDiscount()}%</p>

              <label className="field-label">Payment method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Transfer">Transfer</option>
              </select>

              <label className="field-label">Receipt note</label>
              <input value={receiptNote} onChange={(e) => setReceiptNote(e.target.value)} placeholder="Optional order note" />

              <div className="totals">
                <div><span>Subtotal</span><strong>{naira(subtotal)}</strong></div>
                <div><span>Discount</span><strong>- {naira(discountAmount)}</strong></div>
                <div className="grand-total"><span>Total</span><strong>{naira(total)}</strong></div>
              </div>

              <button className="primary-btn wide" onClick={checkout}>Complete sale</button>
              <div className="receipt-preview">
                <p>Receipt preview</p>
                <span>{session.employee.name}</span>
                <span>{customerName}</span>
                <span>{paymentMethod}</span>
                <span>{naira(total)}</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === 'inventory' && (
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
                      <td>{product.id}</td>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>{naira(product.price)}</td>
                      <td className={product.stock <= 5 ? 'low-stock-cell' : ''}>{product.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <Package size={16} />
              <h2>Inventory controls</h2>
            </div>
            {can('manageInventory') ? (
              <div className="inventory-form">
                <input placeholder="Product name" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} />
                <input placeholder="Category" value={newProd.category} onChange={(e) => setNewProd({ ...newProd, category: e.target.value })} />
                <div className="input-row">
                  <input placeholder="Sell price" type="number" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} />
                  <input placeholder="Cost price" type="number" value={newProd.cost} onChange={(e) => setNewProd({ ...newProd, cost: e.target.value })} />
                </div>
                <input placeholder="Stock quantity" type="number" value={newProd.stock} onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })} />
                <button className="primary-btn" onClick={addProduct}>Add product</button>
              </div>
            ) : (
              <div className="alert-box">
                <ShieldAlert size={14} />
                Only supervisors, managers and admins can change inventory records.
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'reports' && (
        <div className="reports-grid">
          <section className="panel">
            <div className="section-title">
              <ClipboardList size={16} />
              <h2>Performance summary</h2>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <span>Revenue</span>
                <strong>{naira(sales.reduce((sum, item) => sum + item.total, 0))}</strong>
              </div>
              <div className="stat-card">
                <span>Transactions</span>
                <strong>{sales.length}</strong>
              </div>
              <div className="stat-card">
                <span>Low stock</span>
                <strong>{lowStock.length}</strong>
              </div>
              <div className="stat-card">
                <span>Active role</span>
                <strong>{session.employee.role}</strong>
              </div>
            </div>

            <div className="policy-list compact">
              <div className="policy-item">
                <div className="policy-head">
                  <strong>Current role permissions</strong>
                  <span>{session.employee.role}</span>
                </div>
                <ul>
                  <li>Sell items: {can('sell') ? 'Allowed' : 'Blocked'}</li>
                  <li>Void sales: {can('voidSale') ? 'Allowed' : 'Blocked'}</li>
                  <li>Manage inventory: {can('manageInventory') ? 'Allowed' : 'Blocked'}</li>
                  <li>Max discount: {maxDiscount()}%</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <ClipboardList size={16} />
              <h2>Recent activity</h2>
            </div>
            <div className="activity-list">
              {auditLog.length === 0 && <p className="helper">No activity yet.</p>}
              {auditLog.map((entry, index) => (
                <div key={`${entry.text}-${index}`} className="activity-item">
                  <span>{entry.time.toLocaleTimeString()}</span>
                  <p>{entry.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <Receipt size={16} />
              <h2>Recent sales</h2>
            </div>
            <div className="activity-list">
              {sales.length === 0 && <p className="helper">No completed sales yet.</p>}
              {sales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="activity-item">
                  <div className="activity-item-head">
                    <strong>{sale.id}</strong>
                    <span>{naira(sale.total)}</span>
                  </div>
                  <p>{sale.customerName || 'Walk-in Customer'} · {sale.paymentMethod}</p>
                  <div className="activity-actions">
                    <span>{sale.time.toLocaleTimeString()}</span>
                    {can('voidSale') && <button className="link-btn" onClick={() => voidSale(sale.id)}>Void sale</button>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
