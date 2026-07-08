import { useState, useMemo } from "react";
import { Search, Plus, Minus, Trash2, LogOut, Package, Receipt, ClipboardList, ShieldAlert } from "lucide-react";

const seedProducts = [
  { id: "SKU-0001", name: "Peak Milk Tin (Large)", price: 1800, cost: 1500, stock: 42, category: "Dairy" },
  { id: "SKU-0002", name: "Indomie Carton (40pc)", price: 8500, cost: 7200, stock: 18, category: "Noodles" },
  { id: "SKU-0003", name: "Golden Penny Semovita 1kg", price: 1450, cost: 1150, stock: 30, category: "Grains" },
  { id: "SKU-0004", name: "Kings Vegetable Oil 1L", price: 3200, cost: 2700, stock: 25, category: "Oil" },
  { id: "SKU-0005", name: "Coca-Cola 50cl (Pack 12)", price: 4800, cost: 3900, stock: 8, category: "Drinks" },
  { id: "SKU-0006", name: "Dangote Sugar 1kg", price: 1600, cost: 1300, stock: 3, category: "Grains" },
  { id: "SKU-0007", name: "Omo Detergent 900g", price: 2100, cost: 1750, stock: 20, category: "Household" },
  { id: "SKU-0008", name: "Titus Sardine (Tin)", price: 950, cost: 750, stock: 60, category: "Canned" },
];

const seedEmployees = [
  { id: "E1", name: "Chidinma Okoro", role: "Cashier", pin: "1111" },
  { id: "E2", name: "Tunde Bakare", role: "Cashier", pin: "2222" },
  { id: "E3", name: "Aunty Grace", role: "Manager", pin: "9999" },
];

const naira = (n) => `₦${n.toLocaleString("en-NG")}`;

function FontLoader() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=DM+Mono:wght@400;500&display=swap');
      @keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .rise-in { animation: riseIn 0.35s ease both; }
      .fade-in { animation: fadeIn 0.4s ease both; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #2a3129; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #3a4238; }
    `}</style>
  );
}

export default function POSDemo() {
  const [products, setProducts] = useState(seedProducts);
  const [employees] = useState(seedEmployees);
  const [session, setSession] = useState(null); // { employee, clockIn }
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [selectedEmp, setSelectedEmp] = useState(null);

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pos");
  const [sales, setSales] = useState([]); // {id, items, total, employee, time}
  const [auditLog, setAuditLog] = useState([]);
  const [toast, setToast] = useState(null);

  const [newProd, setNewProd] = useState({ name: "", price: "", cost: "", stock: "", category: "" });

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [products, search]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function clockIn() {
    if (!selectedEmp) return;
    if (pinInput !== selectedEmp.pin) {
      setPinError("Wrong PIN. Try again.");
      return;
    }
    setSession({ employee: selectedEmp, clockIn: new Date() });
    setAuditLog((l) => [{ time: new Date(), text: `${selectedEmp.name} clocked in`, type: "shift" }, ...l]);
    setPinInput("");
    setPinError("");
    setSelectedEmp(null);
  }

  function clockOut() {
    setAuditLog((l) => [{ time: new Date(), text: `${session.employee.name} clocked out`, type: "shift" }, ...l]);
    setSession(null);
    setCart([]);
    setTab("pos");
  }

  function addToCart(product) {
    if (product.stock <= 0) return flash(`${product.name} is out of stock`);
    setCart((c) => {
      const existing = c.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          flash(`Only ${product.stock} left in stock`);
          return c;
        }
        return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...c, { ...product, qty: 1 }];
    });
  }

  function changeQty(id, delta) {
    setCart((c) =>
      c
        .map((i) => {
          if (i.id !== id) return i;
          const product = products.find((p) => p.id === id);
          const newQty = i.qty + delta;
          if (newQty > product.stock) {
            flash(`Only ${product.stock} left in stock`);
            return i;
          }
          return { ...i, qty: newQty };
        })
        .filter((i) => i.qty > 0)
    );
  }

  function removeFromCart(id) {
    setCart((c) => c.filter((i) => i.id !== id));
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  function checkout() {
    if (cart.length === 0) return;
    setProducts((prods) =>
      prods.map((p) => {
        const item = cart.find((i) => i.id === p.id);
        return item ? { ...p, stock: p.stock - item.qty } : p;
      })
    );
    const sale = {
      id: `TXN-${(sales.length + 1).toString().padStart(4, "0")}`,
      items: cart,
      total: cartTotal,
      employee: session.employee.name,
      time: new Date(),
    };
    setSales((s) => [sale, ...s]);
    setAuditLog((l) => [
      { time: new Date(), text: `${session.employee.name} completed sale ${sale.id} — ${naira(cartTotal)}`, type: "sale" },
      ...l,
    ]);
    setCart([]);
    flash(`Sale complete — ${naira(cartTotal)}`);
  }

  function voidSale(saleId) {
    if (session.employee.role !== "Manager") return flash("Only a manager can void a sale");
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    setProducts((prods) =>
      prods.map((p) => {
        const item = sale.items.find((i) => i.id === p.id);
        return item ? { ...p, stock: p.stock + item.qty } : p;
      })
    );
    setSales((s) => s.filter((x) => x.id !== saleId));
    setAuditLog((l) => [
      { time: new Date(), text: `${session.employee.name} VOIDED ${saleId} — ${naira(sale.total)} (stock restored)`, type: "void" },
      ...l,
    ]);
    flash(`${saleId} voided`);
  }

  function addProduct() {
    if (!newProd.name || !newProd.price || !newProd.stock) return flash("Fill name, price and stock");
    const id = `SKU-${(products.length + 1).toString().padStart(4, "0")}`;
    setProducts((p) => [
      ...p,
      {
        id,
        name: newProd.name,
        price: Number(newProd.price),
        cost: Number(newProd.cost) || 0,
        stock: Number(newProd.stock),
        category: newProd.category || "General",
      },
    ]);
    setAuditLog((l) => [{ time: new Date(), text: `${session.employee.name} added product ${newProd.name} (${id})`, type: "stock" }, ...l]);
    setNewProd({ name: "", price: "", cost: "", stock: "", category: "" });
    flash("Product added");
  }

  const salesByEmployee = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      if (!map[s.employee]) map[s.employee] = { count: 0, total: 0 };
      map[s.employee].count += 1;
      map[s.employee].total += s.total;
    });
    return map;
  }, [sales]);

  const lowStock = products.filter((p) => p.stock <= 5);

  // ---------- LOGIN SCREEN ----------
  if (!session) {
    return (
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          backgroundImage:
            "radial-gradient(circle at 15% 10%, rgba(201,255,58,0.06), transparent 40%), radial-gradient(circle at 85% 90%, rgba(201,255,58,0.04), transparent 45%)",
        }}
        className="min-h-screen w-full bg-[#0e1210] text-[#e8e4d8] flex items-center justify-center p-6"
      >
        <FontLoader />
        <div className="w-full max-w-sm rise-in">
          <div className="flex justify-center mb-5">
            <span className="text-[9px] tracking-[0.25em] uppercase text-[#4a5248] border border-[#2a3129] rounded-full px-3 py-1">
              Prototype · Internal Demo
            </span>
          </div>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[#c9ff3a] text-xs tracking-[0.3em] uppercase mb-3">
              <span className="w-1.5 h-1.5 bg-[#c9ff3a] rounded-full animate-pulse" />
              Terminal 01 · Online
            </div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-4xl font-extrabold tracking-tight">
              MARKET<span className="text-[#c9ff3a]">POS</span>
            </h1>
            <p className="text-[#7a8078] text-sm mt-2">Select your name and clock in to start your shift</p>
          </div>

          <div className="bg-[#141a15] border border-[#232b23] rounded-xl p-5 space-y-2 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]">
            {employees.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setSelectedEmp(e);
                  setPinError("");
                }}
                className={`w-full text-left px-4 py-3.5 rounded-lg border transition-all duration-200 flex items-center justify-between group ${
                  selectedEmp?.id === e.id
                    ? "border-[#c9ff3a] bg-[#1f2620] shadow-[0_0_0_1px_rgba(201,255,58,0.15)]"
                    : "border-[#232b23] hover:border-[#3a4238] bg-[#171c19] hover:bg-[#191f1a]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      selectedEmp?.id === e.id ? "bg-[#c9ff3a] text-[#0e1210]" : "bg-[#232b23] text-[#9aa192]"
                    }`}
                  >
                    {e.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{e.name}</div>
                    <div className="text-[#7a8078] text-xs">{e.role}</div>
                  </div>
                </div>
                {e.role === "Manager" && <ShieldAlert size={16} className="text-[#c9ff3a]" />}
              </button>
            ))}
          </div>

          {selectedEmp && (
            <div className="mt-4 bg-[#141a15] border border-[#232b23] rounded-xl p-5 rise-in shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]">
              <label className="text-xs text-[#7a8078] uppercase tracking-wider">PIN for {selectedEmp.name}</label>
              <input
                autoFocus
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && clockIn()}
                className="w-full mt-2 bg-[#0e1210] border border-[#3a4238] rounded-md px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-[#c9ff3a] transition-colors"
                placeholder="····"
              />
              {pinError && <p className="text-red-400 text-xs mt-2">{pinError}</p>}
              <button
                onClick={clockIn}
                className="w-full mt-3 bg-[#c9ff3a] text-[#0e1210] font-bold py-3 rounded-md hover:bg-[#b8ee2a] active:scale-[0.99] transition-all"
              >
                Clock In →
              </button>
              <p className="text-[#4a5248] text-[10px] mt-2 text-center">demo pins — cashiers: 1111 / 2222, manager: 9999</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- MAIN APP ----------
  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }} className="min-h-screen w-full bg-[#0e1210] text-[#e8e4d8] flex flex-col">
      <FontLoader />
      {/* Top bar */}
      <div className="border-b border-[#232b23] bg-[#12160f] px-5 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.25)] z-10">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#c9ff3a] flex items-center justify-center">
              <Receipt size={14} className="text-[#0e1210]" />
            </div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="font-extrabold text-lg tracking-tight">
              MARKET<span className="text-[#c9ff3a]">POS</span>
            </h1>
          </div>
          <div className="flex gap-1 bg-[#0e1210] border border-[#232b23] rounded-lg p-1">
            {[
              { id: "pos", label: "Sell", icon: Receipt },
              { id: "inventory", label: "Inventory", icon: Package },
              { id: "reports", label: "Shift Report", icon: ClipboardList },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                  tab === t.id ? "bg-[#c9ff3a] text-[#0e1210]" : "text-[#9aa192] hover:text-[#e8e4d8] hover:bg-[#191f1a]"
                }`}
              >
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-[9px] tracking-[0.2em] uppercase text-[#4a5248] border border-[#232b23] rounded-full px-2.5 py-1">
            Prototype
          </span>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                session.employee.role === "Manager" ? "bg-[#c9ff3a] text-[#0e1210]" : "bg-[#232b23] text-[#9aa192]"
              }`}
            >
              {session.employee.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold leading-tight">{session.employee.name}</div>
              <div className="text-[10px] text-[#7a8078] uppercase tracking-wider flex items-center gap-1 justify-end">
                <span className="w-1 h-1 bg-[#c9ff3a] rounded-full" /> {session.employee.role} · on shift
              </div>
            </div>
          </div>
          <button onClick={clockOut} className="text-[#7a8078] hover:text-red-400 transition-colors p-2 rounded-md hover:bg-[#191f1a]" title="Clock out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#c9ff3a] text-[#0e1210] font-semibold text-sm px-4 py-2.5 rounded-lg shadow-[0_10px_30px_-5px_rgba(201,255,58,0.4)] fade-in">
          {toast}
        </div>
      )}

      {/* POS TAB */}
      {tab === "pos" && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8078]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product name or SKU..."
                className="w-full bg-[#141a15] border border-[#232b23] rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#c9ff3a] transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  className={`text-left p-3.5 rounded-xl border transition-all duration-200 ${
                    p.stock <= 0
                      ? "border-[#232b23] bg-[#12160f] opacity-40 cursor-not-allowed"
                      : "border-[#232b23] bg-[#141a15] hover:border-[#c9ff3a] hover:bg-[#1a2118] hover:shadow-[0_10px_25px_-8px_rgba(201,255,58,0.15)] active:scale-[0.98]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] text-[#5a6258] font-mono">{p.id}</span>
                    <span className="text-[9px] text-[#4a5248] uppercase tracking-wider">{p.category}</span>
                  </div>
                  <div className="text-sm font-semibold leading-snug mb-3">{p.name}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#c9ff3a] font-bold text-sm">{naira(p.price)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.stock <= 5 ? "bg-red-900/40 text-red-400" : "bg-[#1c211d] text-[#7a8078]"}`}>
                      {p.stock} left
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="w-80 border-l border-[#232b23] bg-[#12160f] flex flex-col">
            <div className="p-4 border-b border-[#232b23]">
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="font-bold text-sm uppercase tracking-wider text-[#9aa192]">
                Current Sale
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 && (
                <div className="text-center mt-12 px-4">
                  <Receipt size={22} className="mx-auto text-[#2a3129] mb-2" />
                  <p className="text-[#4a5248] text-sm">Tap a product to add it here</p>
                </div>
              )}
              {cart.map((item) => (
                <div key={item.id} className="bg-[#171c19] border border-[#232b23] rounded-lg p-3 rise-in">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold leading-snug pr-2">{item.name}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-[#7a8078] hover:text-red-400 shrink-0 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-[#0e1210] rounded-md border border-[#232b23]">
                      <button onClick={() => changeQty(item.id, -1)} className="p-1.5 text-[#c9ff3a] hover:bg-[#191f1a] rounded-l-md transition-colors"><Minus size={12} /></button>
                      <span className="text-xs w-5 text-center">{item.qty}</span>
                      <button onClick={() => changeQty(item.id, 1)} className="p-1.5 text-[#c9ff3a] hover:bg-[#191f1a] rounded-r-md transition-colors"><Plus size={12} /></button>
                    </div>
                    <span className="text-[#c9ff3a] text-sm font-bold">{naira(item.price * item.qty)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#232b23]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[#7a8078] text-sm">Total</span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-2xl font-extrabold text-[#c9ff3a]">
                  {naira(cartTotal)}
                </span>
              </div>
              <button
                onClick={checkout}
                disabled={cart.length === 0}
                className="w-full bg-[#c9ff3a] disabled:bg-[#232b23] disabled:text-[#4a5248] text-[#0e1210] font-bold py-3 rounded-lg hover:bg-[#b8ee2a] active:scale-[0.99] transition-all"
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {tab === "inventory" && (
        <div className="flex-1 p-5 overflow-y-auto grid md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="font-bold text-sm uppercase tracking-wider text-[#9aa192]">
                Stock — {products.length} items
              </h2>
            </div>
            {lowStock.length > 0 && (
              <div className="bg-red-900/15 border border-red-800/40 rounded-lg p-3 text-xs text-red-300 flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                {lowStock.length} item(s) running low: {lowStock.map((p) => p.name).join(", ")}
              </div>
            )}
            <div className="border border-[#232b23] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#141a15] text-[#7a8078] uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-3 font-semibold">SKU</th>
                    <th className="text-left p-3 font-semibold">Product</th>
                    <th className="text-left p-3 font-semibold">Category</th>
                    <th className="text-right p-3 font-semibold">Price</th>
                    <th className="text-right p-3 font-semibold">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-[#1c211d] hover:bg-[#141a15] transition-colors">
                      <td className="p-3 text-[#5a6258] font-mono">{p.id}</td>
                      <td className="p-3 font-semibold">{p.name}</td>
                      <td className="p-3 text-[#7a8078]">{p.category}</td>
                      <td className="p-3 text-right text-[#c9ff3a]">{naira(p.price)}</td>
                      <td className={`p-3 text-right ${p.stock <= 5 ? "text-red-400 font-bold" : ""}`}>{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="font-bold text-sm uppercase tracking-wider text-[#9aa192] mb-3">
              Add Product
            </h2>
            <div className="bg-[#141a15] border border-[#232b23] rounded-xl p-4 space-y-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)]">
              <input placeholder="Product name" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} className="w-full bg-[#0e1210] border border-[#232b23] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9ff3a] transition-colors" />
              <input placeholder="Category" value={newProd.category} onChange={(e) => setNewProd({ ...newProd, category: e.target.value })} className="w-full bg-[#0e1210] border border-[#232b23] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9ff3a] transition-colors" />
              <div className="flex gap-2">
                <input placeholder="Sell price" type="number" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} className="w-full bg-[#0e1210] border border-[#232b23] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9ff3a] transition-colors" />
                <input placeholder="Cost price" type="number" value={newProd.cost} onChange={(e) => setNewProd({ ...newProd, cost: e.target.value })} className="w-full bg-[#0e1210] border border-[#232b23] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9ff3a] transition-colors" />
              </div>
              <input placeholder="Stock quantity" type="number" value={newProd.stock} onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })} className="w-full bg-[#0e1210] border border-[#232b23] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9ff3a] transition-colors" />
              <button onClick={addProduct} className="w-full bg-[#c9ff3a] text-[#0e1210] font-bold py-2.5 rounded-lg hover:bg-[#b8ee2a] active:scale-[0.99] transition-all text-sm">
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORTS TAB */}
      {tab === "reports" && (
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Revenue (Session)", value: naira(sales.reduce((s, x) => s + x.total, 0)) },
              { label: "Transactions", value: sales.length },
              { label: "Staff On This Shift", value: new Set(sales.map((s) => s.employee)).size || (session ? 1 : 0) },
              { label: "Low Stock Alerts", value: lowStock.length },
            ].map((k) => (
              <div key={k.label} className="bg-[#141a15] border border-[#232b23] rounded-xl p-4 rise-in">
                <div className="text-[10px] uppercase tracking-wider text-[#7a8078] mb-1.5">{k.label}</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-2xl font-extrabold text-[#c9ff3a]">
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wider text-[#7a8078] mb-3">Sales by Employee</h2>
              <div className="space-y-2 mb-6">
                {Object.keys(salesByEmployee).length === 0 && (
                  <p className="text-[#4a5248] text-sm">No sales recorded yet this session.</p>
                )}
                {Object.entries(salesByEmployee).map(([name, data]) => (
                  <div key={name} className="bg-[#171c19] border border-[#232b23] rounded-lg p-3.5 flex justify-between items-center hover:border-[#3a4238] transition-colors">
                    <div>
                      <div className="font-semibold text-sm">{name}</div>
                      <div className="text-[#7a8078] text-xs">{data.count} transaction(s)</div>
                    </div>
                    <span className="text-[#c9ff3a] font-bold">{naira(data.total)}</span>
                  </div>
                ))}
              </div>

              <h2 className="font-bold text-sm uppercase tracking-wider text-[#7a8078] mb-3">Transactions</h2>
              <div className="space-y-2">
                {sales.length === 0 && <p className="text-[#4a5248] text-sm">Nothing sold yet — head to the Sell tab.</p>}
                {sales.map((s) => (
                  <div key={s.id} className="bg-[#171c19] border border-[#232b23] rounded-lg p-3.5 hover:border-[#3a4238] transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-mono text-[#7a8078]">{s.id}</span>
                        <div className="text-sm">{s.employee} · {s.items.length} item(s)</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#c9ff3a]">{naira(s.total)}</span>
                        {session.employee.role === "Manager" && (
                          <button onClick={() => voidSale(s.id)} className="text-[10px] text-red-400 border border-red-800/50 rounded px-2 py-1 hover:bg-red-900/20 transition-colors">
                            Void
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-bold text-sm uppercase tracking-wider text-[#7a8078] mb-3 flex items-center gap-2">
                <ShieldAlert size={14} /> Audit Log
              </h2>
              <div className="bg-[#141a15] border border-[#232b23] rounded-xl p-4 space-y-1.5 max-h-[600px] overflow-y-auto">
                {auditLog.length === 0 && <p className="text-[#4a5248] text-sm">No activity logged yet.</p>}
                {auditLog.map((a, i) => (
                  <div key={i} className="text-xs flex gap-2 py-1.5 border-b border-[#1c211d] last:border-0">
                    <span className="text-[#4a5248] shrink-0">{a.time.toLocaleTimeString()}</span>
                    <span
                      className={
                        a.type === "void" ? "text-red-400" : a.type === "sale" ? "text-[#c9ff3a]" : "text-[#9aa192]"
                      }
                    >
                      {a.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
