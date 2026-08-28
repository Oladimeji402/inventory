import { useEffect, useMemo, useRef, useState } from 'react';
import { can, canSignIn, maxDiscount as maxDiscountFor, STAFF_ROLES, staffStatus } from './data/permissions';
import { useAppData } from './hooks/useAppData';
import { naira } from './lib/format';
import { clearTillDraft, loadTillDraft, saveTillDraft } from './services/sessionDraft';
import LoadingScreen from './components/LoadingScreen';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import ReceiptModal from './components/ReceiptModal';
import SalesTab from './components/SalesTab';
import InventoryTab from './components/InventoryTab';
import ReportsTab from './components/ReportsTab';
import AdminTab from './components/AdminTab';
import LandingPage from './components/landing/LandingPage';
import MerchantApp from './components/merchant/MerchantApp';
import StorefrontApp from './components/storefront/StorefrontApp';
import RiderApp from './components/rider/RiderApp';
import MarketplaceApp from './components/marketplace/MarketplaceApp';
import { ArrowLeft, Store, Terminal } from 'lucide-react';

function createInitialTillState() {
  const draft = loadTillDraft();
  return {
    session: null,
    cart: Array.isArray(draft?.cart) ? draft.cart : [],
    discountPct: typeof draft?.discountPct === 'number' ? draft.discountPct : 0,
    paymentMethod: draft?.paymentMethod || 'Cash',
    customerName: draft?.customerName || 'Walk-in Customer',
    heldSales: Array.isArray(draft?.heldSales) ? draft.heldSales : [],
    draftSession: draft?.session || null
  };
}

export default function App({ initialView }) {
  const getStartingView = () => {
    if (initialView) return initialView;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'marketplace' || params.get('view') === 'shop') return 'marketplace';
      if (params.get('view') === 'rider') return 'rider';
      if (params.get('view') === 'storefront') return 'storefront';
      if (params.get('view') === 'merchant') return 'merchant';
      if (params.get('view') === 'pos') return 'pos';
      if (params.get('view') === 'landing') return 'landing';
      if (process.env.NODE_ENV === 'test') return 'pos';
    }
    return 'landing';
  };

  const [viewMode, setViewMode] = useState(getStartingView);
  const {
    loading,
    products,
    employees,
    sales,
    auditLog,
    setProducts,
    setEmployees,
    recordSale,
    removeSale,
    logActivity
  } = useAppData();

  const initialTill = useRef(createInitialTillState()).current;
  const [session, setSession] = useState(null);
  const [cart, setCart] = useState(initialTill.cart);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('pos');
  const [toast, setToast] = useState(null);
  const [newProd, setNewProd] = useState({ name: '', price: '', cost: '', stock: '', category: '' });
  const [discountPct, setDiscountPct] = useState(initialTill.discountPct);
  const [paymentMethod, setPaymentMethod] = useState(initialTill.paymentMethod);
  const [customerName, setCustomerName] = useState(initialTill.customerName);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [pendingVoidId, setPendingVoidId] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [heldSales, setHeldSales] = useState(initialTill.heldSales);
  const draftRestored = useRef(false);

  const role = session?.employee?.role;
  const roleMaxDiscount = maxDiscountFor(role);
  const canManageStaff = can(role, 'manageStaff');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return ['All', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, categoryFilter]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = subtotal * (discountPct / 100);
  const total = Math.max(0, subtotal - discountAmount);
  const lowStock = products.filter((item) => item.stock <= 5);

  useEffect(() => {
    if (loading || draftRestored.current) return;
    draftRestored.current = true;

    const draftSession = initialTill.draftSession;
    if (!draftSession?.employee?.id) return;

    const match = employees.find((employee) => employee.id === draftSession.employee.id);
    if (!match || !canSignIn(match)) {
      clearTillDraft();
      setCart([]);
      setHeldSales([]);
      setDiscountPct(0);
      setPaymentMethod('Cash');
      setCustomerName('Walk-in Customer');
      return;
    }

    setSession({
      employee: match,
      clockIn: draftSession.clockIn ? new Date(draftSession.clockIn) : new Date()
    });
    if (initialTill.cart.length > 0 || initialTill.heldSales.length > 0) {
      flash('Restored open sale from this device after reconnect.');
    }
  }, [loading, employees, initialTill]);

  useEffect(() => {
    if (loading || !session) return;
    saveTillDraft({
      session: {
        employee: { id: session.employee.id, name: session.employee.name, role: session.employee.role },
        clockIn: session.clockIn instanceof Date ? session.clockIn.toISOString() : session.clockIn
      },
      cart,
      discountPct,
      paymentMethod,
      customerName,
      heldSales
    });
  }, [loading, session, cart, discountPct, paymentMethod, customerName, heldSales]);

  function flash(message) {
    setToast(message);
    window.clearTimeout(flash.timeout);
    flash.timeout = window.setTimeout(() => setToast(null), 2800);
  }

  function resetSaleForm() {
    setCart([]);
    setDiscountPct(0);
    setPaymentMethod('Cash');
    setCustomerName('Walk-in Customer');
  }

  function resetSale() {
    if (cart.length === 0 && discountPct === 0 && customerName === 'Walk-in Customer') {
      return flash('Sale is already empty.');
    }
    resetSaleForm();
    flash('Sale reset.');
  }

  function holdSale() {
    if (!session) return;
    if (cart.length === 0) return flash('Add items before holding a sale.');

    const held = {
      id: `HOLD-${Date.now().toString(36).toUpperCase()}`,
      cart,
      discountPct,
      paymentMethod,
      customerName,
      heldAt: new Date().toISOString()
    };
    setHeldSales((current) => [held, ...current]);
    resetSaleForm();
    flash(`Sale held for ${held.customerName || 'customer'}.`);
  }

  function resumeHeldSale(holdId) {
    const held = heldSales.find((entry) => entry.id === holdId);
    if (!held) return;

    if (cart.length > 0) {
      return flash('Complete, hold, or reset the current sale before resuming another.');
    }

    setCart(held.cart);
    setDiscountPct(held.discountPct);
    setPaymentMethod(held.paymentMethod);
    setCustomerName(held.customerName);
    setHeldSales((current) => current.filter((entry) => entry.id !== holdId));
    flash('Held sale resumed.');
  }

  function handleLogin(employee) {
    setSession({ employee, clockIn: new Date() });
    logActivity(`${employee.name} clocked in`, 'shift');
    flash(`Welcome, ${employee.name}`);
  }

  function clockOut() {
    if (!session) return;
    logActivity(`${session.employee.name} clocked out`, 'shift');
    setSession(null);
    resetSaleForm();
    setHeldSales([]);
    setCategoryFilter('All');
    setPendingVoidId(null);
    setLastReceipt(null);
    setTab('pos');
    clearTillDraft();
  }

  function addToCart(product) {
    if (!session) return;
    if (!can(role, 'sell')) return flash('You do not have permission to process sales.');
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
          if (product && newQty > product.stock) {
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

  function checkout(details = {}) {
    if (!session) return;
    if (cart.length === 0) return flash('Add at least one item before checkout.');
    if (discountPct > roleMaxDiscount) {
      return flash(`Discount limit is ${roleMaxDiscount}% for ${role}.`);
    }

    const tendered = typeof details?.amountTendered === 'number' ? details.amountTendered : total;
    const change = typeof details?.changeDue === 'number' ? details.changeDue : Math.max(0, tendered - total);

    if (paymentMethod === 'Cash' && tendered < total) {
      return flash(`Amount tendered (${naira(tendered)}) is less than total (${naira(total)}).`);
    }

    const nextProducts = products.map((product) => {
      const item = cart.find((entry) => entry.id === product.id);
      return item ? { ...product, stock: product.stock - item.qty } : product;
    });
    setProducts(nextProducts);

    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const sale = {
      id: `TXN-${(sales.length + 1).toString().padStart(4, '0')}`,
      items: cart,
      subtotal,
      discount: discountAmount,
      discountPct,
      total,
      amountTendered: tendered,
      changeDue: change,
      employee: session.employee.name,
      role,
      paymentMethod,
      customerName: customerName.trim() || 'Walk-in Customer',
      time: new Date().toISOString(),
      savedLocally: true,
      savedOffline: offline
    };

    recordSale(sale);
    logActivity(
      `${session.employee.name} completed ${sale.id} for ${naira(total)}${offline ? ' (saved offline on this device)' : ''}`,
      'sale'
    );
    resetSaleForm();
    setLastReceipt(sale);
    if (offline) {
      flash(`${sale.id} saved on this device. Will keep working until network returns.`);
    }
  }

  function requestVoid(saleId) {
    if (!can(role, 'voidSale')) return flash('Only managers and admins can void a sale.');
    setPendingVoidId(saleId);
  }

  function cancelVoid() {
    setPendingVoidId(null);
  }

  function confirmVoid(saleId) {
    const sale = sales.find((entry) => entry.id === saleId);
    if (!sale) return;
    const restocked = products.map((product) => {
      const item = sale.items.find((entry) => entry.id === product.id);
      return item ? { ...product, stock: product.stock + item.qty } : product;
    });
    setProducts(restocked);
    removeSale(saleId);
    logActivity(`${session.employee.name} VOIDED ${saleId}`, 'void');
    setPendingVoidId(null);
    flash(`${saleId} was voided.`);
  }

  function nextSku(existingProducts) {
    const max = existingProducts.reduce((highest, product) => {
      const match = String(product.id || '').match(/(\d+)\s*$/);
      const value = match ? Number(match[1]) : 0;
      return value > highest ? value : highest;
    }, 0);
    return `SKU-${(max + 1).toString().padStart(4, '0')}`;
  }

  function addProduct() {
    if (!can(role, 'manageInventory')) return flash('Only supervisors, managers and admins can add inventory.');
    if (!newProd.name || !newProd.price || !newProd.stock) return flash('Please complete the name, price and stock fields.');

    const id = nextSku(products);
    setProducts([
      ...products,
      {
        id,
        name: newProd.name,
        price: Number(newProd.price),
        cost: Number(newProd.cost) || 0,
        stock: Number(newProd.stock),
        category: newProd.category || 'General'
      }
    ]);
    logActivity(`${session.employee.name} added ${newProd.name} (${id})`, 'stock');
    setNewProd({ name: '', price: '', cost: '', stock: '', category: '' });
    flash('Product added to inventory.');
  }

  function importProducts(rows) {
    if (!can(role, 'manageInventory')) {
      return { ok: false, message: 'Only supervisors, managers and admins can import inventory.' };
    }
    if (!rows?.length) {
      return { ok: false, message: 'No valid products found in the file.' };
    }

    let nextProducts = [...products];
    let added = 0;
    let updated = 0;

    rows.forEach((row) => {
      const existingIndex = row.id
        ? nextProducts.findIndex((product) => product.id.toLowerCase() === row.id.toLowerCase())
        : -1;

      if (existingIndex >= 0) {
        const current = nextProducts[existingIndex];
        nextProducts[existingIndex] = {
          ...current,
          name: row.name,
          price: row.price,
          cost: row.cost,
          stock: row.stock,
          category: row.category || current.category || 'General'
        };
        updated += 1;
        return;
      }

      const id = row.id || nextSku(nextProducts);
      if (nextProducts.some((product) => product.id.toLowerCase() === id.toLowerCase())) {
        nextProducts = nextProducts.map((product) =>
          product.id.toLowerCase() === id.toLowerCase()
            ? {
                ...product,
                name: row.name,
                price: row.price,
                cost: row.cost,
                stock: row.stock,
                category: row.category || product.category || 'General'
              }
            : product
        );
        updated += 1;
        return;
      }

      nextProducts = [
        ...nextProducts,
        {
          id,
          name: row.name,
          price: row.price,
          cost: row.cost,
          stock: row.stock,
          category: row.category || 'General'
        }
      ];
      added += 1;
    });

    setProducts(nextProducts);
    logActivity(
      `${session.employee.name} imported products (${added} added, ${updated} updated)`,
      'stock'
    );
    const message = `Imported ${added + updated} product(s): ${added} added, ${updated} updated.`;
    flash(message);
    return { ok: true, message, added, updated };
  }

  function requireAdmin() {
    if (!canManageStaff) {
      flash('Only the store admin can manage staff.');
      return false;
    }
    return true;
  }

  function nextEmployeeId() {
    const numbers = employees
      .map((employee) => Number(String(employee.id).replace(/\D/g, '')))
      .filter((value) => !Number.isNaN(value));
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return `E${next}`;
  }

  function addStaff({ name, pin, role: newRole }) {
    if (!requireAdmin()) return { error: 'Only the store admin can manage staff.' };

    const trimmed = name.trim();
    if (employees.some((employee) => employee.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      return { error: 'A staff member with that name already exists.' };
    }
    if (!STAFF_ROLES.includes(newRole)) {
      return { error: 'Choose a valid role.' };
    }

    const employee = {
      id: nextEmployeeId(),
      name: trimmed,
      role: newRole,
      pin,
      status: 'active',
      description: `${newRole} account.`
    };

    setEmployees([...employees, employee]);
    logActivity(`${session.employee.name} added staff ${employee.name} (${employee.role})`, 'staff');
    flash(`${employee.name} was added.`);
    return { ok: true, employee };
  }

  function updateEmployee(id, patch, message) {
    if (!requireAdmin()) return { error: 'Only the store admin can manage staff.' };

    const isSelf = id === session.employee.id;
    if (isSelf && (patch.status || patch.role)) {
      flash('You cannot change your own role or status from this panel.');
      return { error: 'You cannot change your own role or status from this panel.' };
    }

    const target = employees.find((employee) => employee.id === id);
    if (!target) return { error: 'Staff member not found.' };

    if (patch.role && target.role === 'Store Admin' && patch.role !== 'Store Admin') {
      const otherAdmins = employees.filter(
        (employee) => employee.id !== id && employee.role === 'Store Admin' && staffStatus(employee) === 'active'
      );
      if (otherAdmins.length === 0) {
        flash('Keep at least one active store admin on the roster.');
        return { error: 'Keep at least one active store admin on the roster.' };
      }
    }

    if (patch.status && patch.status !== 'active' && target.role === 'Store Admin') {
      const otherAdmins = employees.filter(
        (employee) => employee.id !== id && employee.role === 'Store Admin' && staffStatus(employee) === 'active'
      );
      if (otherAdmins.length === 0) {
        flash('Keep at least one active store admin on the roster.');
        return { error: 'Keep at least one active store admin on the roster.' };
      }
    }

    if (patch.name) {
      const trimmed = patch.name.trim();
      const clash = employees.some(
        (employee) => employee.id !== id && employee.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (clash) {
        return { error: 'Another staff member already uses that name.' };
      }
      patch = { ...patch, name: trimmed };
    }

    if (patch.pin !== undefined) {
      const pin = String(patch.pin).replace(/\D/g, '');
      if (pin.length < 4 || pin.length > 6) {
        return { error: 'PIN must be 4 to 6 digits.' };
      }
      patch = { ...patch, pin };
    }

    const nextEmployees = employees.map((employee) => (employee.id === id ? { ...employee, ...patch } : employee));
    setEmployees(nextEmployees);

    if (isSelf && (patch.name || patch.pin)) {
      setSession((current) => ({
        ...current,
        employee: { ...current.employee, ...patch }
      }));
    }

    logActivity(message, 'staff');
    flash(message);
    return { ok: true };
  }

  function promoteStaff(id, nextRole) {
    const target = employees.find((employee) => employee.id === id);
    if (!target || target.role === nextRole) return;
    updateEmployee(id, { role: nextRole }, `${session.employee.name} set ${target.name} to ${nextRole}`);
  }

  function renameStaff(id, nextName) {
    const target = employees.find((employee) => employee.id === id);
    if (!target) return { error: 'Staff member not found.' };
    if (target.name === nextName.trim()) return { ok: true };
    return updateEmployee(id, { name: nextName }, `${session.employee.name} renamed ${target.name} to ${nextName.trim()}`);
  }

  function resetPin(id, nextPin) {
    const target = employees.find((employee) => employee.id === id);
    if (!target) return { error: 'Staff member not found.' };
    return updateEmployee(id, { pin: nextPin }, `${session.employee.name} reset PIN for ${target.name}`);
  }

  function blockStaff(id) {
    const target = employees.find((employee) => employee.id === id);
    if (!target) return;
    updateEmployee(id, { status: 'blocked' }, `${session.employee.name} blocked ${target.name}`);
  }

  function unblockStaff(id) {
    const target = employees.find((employee) => employee.id === id);
    if (!target) return;
    updateEmployee(id, { status: 'active' }, `${session.employee.name} unblocked ${target.name}`);
  }

  function fireStaff(id) {
    const target = employees.find((employee) => employee.id === id);
    if (!target) return;
    updateEmployee(id, { status: 'fired' }, `${session.employee.name} deactivated ${target.name}`);
  }

  function reinstateStaff(id) {
    const target = employees.find((employee) => employee.id === id);
    if (!target) return;
    updateEmployee(id, { status: 'active' }, `${session.employee.name} reactivated ${target.name}`);
  }

  function changeTab(nextTab) {
    if (nextTab === 'admin' && !canManageStaff) {
      flash('Only the store admin can open the admin panel.');
      return;
    }
    setTab(nextTab);
  }

  if (viewMode === 'landing') {
    return (
      <LandingPage 
        onLaunchPOS={() => setViewMode('pos')} 
        onOpenMerchantPortal={() => setViewMode('merchant')}
        onOpenRiderPortal={() => setViewMode('rider')}
        onOpenMarketplace={() => setViewMode('marketplace')}
      />
    );
  }

  if (viewMode === 'marketplace') {
    return (
      <MarketplaceApp
        onOpenStorefront={() => setViewMode('storefront')}
        onExitToLanding={() => setViewMode('landing')}
      />
    );
  }

  if (viewMode === 'merchant') {
    return (
      <MerchantApp
        onLaunchPOS={() => setViewMode('pos')}
        onOpenStorefront={() => setViewMode('storefront')}
        onExitToLanding={() => setViewMode('landing')}
      />
    );
  }

  if (viewMode === 'storefront') {
    return (
      <StorefrontApp
        onExitToLanding={() => setViewMode('landing')}
      />
    );
  }

  if (viewMode === 'rider') {
    return (
      <RiderApp
        onExitToLanding={() => setViewMode('landing')}
      />
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <div className="pos-login-wrapper">
        <div className="pos-sandbox-top-banner">
          <div className="flex items-center gap-2">
            <span className="dot-live"></span>
            <span className="text-xs font-semibold text-white">POS Till Sandbox (Retail Node)</span>
            <span className="text-[11px] text-emerald-400 font-mono hidden sm:inline">&bull; spar-ikeja.counterpoint.app</span>
          </div>
          <button 
            className="btn-back-to-landing"
            onClick={() => setViewMode('landing')}
          >
            <ArrowLeft size={14} />
            <span>Back to Ecosystem Overview</span>
          </button>
        </div>
        <LoginScreen employees={employees} onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="pos-sandbox-top-banner mb-3">
        <div className="flex items-center gap-2">
          <span className="dot-live"></span>
          <span className="text-xs font-semibold text-white">Active Store POS Till</span>
          <span className="text-[11px] text-emerald-400 font-mono hidden sm:inline">&bull; spar-ikeja.counterpoint.app</span>
        </div>
        <button 
          className="btn-back-to-landing"
          onClick={() => setViewMode('landing')}
        >
          <ArrowLeft size={14} />
          <span>Back to Ecosystem Overview</span>
        </button>
      </div>

      <Header
        session={session}
        tab={tab}
        onChangeTab={changeTab}
        onClockOut={clockOut}
        lowStockCount={lowStock.length}
        canManageStaff={canManageStaff}
      />

      {toast && <div className="toast">{toast}</div>}

      <ReceiptModal receipt={lastReceipt} onClose={() => setLastReceipt(null)} />

      {tab === 'pos' && (
        <SalesTab
          products={filteredProducts}
          categories={categories}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          search={search}
          onSearchChange={setSearch}
          onAddToCart={addToCart}
          cart={cart}
          onChangeQty={changeQty}
          onRemoveFromCart={removeFromCart}
          customerName={customerName}
          onCustomerChange={setCustomerName}
          discountPct={discountPct}
          onDiscountChange={setDiscountPct}
          maxDiscount={roleMaxDiscount}
          role={role}
          paymentMethod={paymentMethod}
          onPaymentChange={setPaymentMethod}
          subtotal={subtotal}
          discountAmount={discountAmount}
          total={total}
          onCheckout={checkout}
          onResetSale={resetSale}
          onHoldSale={holdSale}
          heldSales={heldSales}
          onResumeHeldSale={resumeHeldSale}
          session={session}
          onClockOut={clockOut}
        />
      )}

      {tab === 'inventory' && (
        <InventoryTab
          products={products}
          lowStock={lowStock}
          canManage={can(role, 'manageInventory')}
          newProd={newProd}
          onNewProdChange={setNewProd}
          onAddProduct={addProduct}
          onImportProducts={importProducts}
        />
      )}

      {tab === 'reports' && (
        <ReportsTab
          sales={sales}
          auditLog={auditLog}
          lowStockCount={lowStock.length}
          role={role}
          canSell={can(role, 'sell')}
          canVoid={can(role, 'voidSale')}
          canManageInventory={can(role, 'manageInventory')}
          maxDiscount={roleMaxDiscount}
          pendingVoidId={pendingVoidId}
          onRequestVoid={requestVoid}
          onCancelVoid={cancelVoid}
          onConfirmVoid={confirmVoid}
        />
      )}

      {tab === 'admin' && canManageStaff && (
        <AdminTab
          employees={employees}
          currentEmployeeId={session.employee.id}
          onAddStaff={addStaff}
          onPromote={promoteStaff}
          onRename={renameStaff}
          onResetPin={resetPin}
          onBlock={blockStaff}
          onUnblock={unblockStaff}
          onFire={fireStaff}
          onReinstate={reinstateStaff}
        />
      )}
    </div>
  );
}
