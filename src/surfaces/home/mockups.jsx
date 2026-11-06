import { Bike, Check, ChevronRight, MapPin, Package, Search, ShoppingBag, Store, Wifi, WifiOff } from 'lucide-react';

/* Illustrative product screens drawn in code, so they stay sharp at any size. Names are samples. */

export function Phone({ children, className = '', style }) {
  return (
    <div className={`hm-phone ${className}`} style={style} aria-hidden="true">
      <div className="hm-phone-screen">
        <div className="hm-phone-island" />
        <div className="hm-phone-status"><span>9:41</span><span className="hm-phone-status-r"><Wifi size={11} /> 100%</span></div>
        {children}
      </div>
    </div>
  );
}

export function ShopScreen() {
  const stores = [
    { n: 'Corner Pharmacy', c: 'Pharmacy & Health', p: 120, l: 'C' },
    { n: 'Fresh Market', c: 'Supermarket', p: 64, l: 'F' },
    { n: 'Volt Electronics', c: 'Electronics', p: 31, l: 'V' }
  ];
  return (
    <div className="hm-scr">
      <div className="hm-scr-title">Stores near you</div>
      <div className="hm-scr-search"><Search size={12} /> Search stores</div>
      <div className="hm-scr-chips"><b>All</b><span>Pharmacy</span><span>Grocery</span></div>
      {stores.map((s) => (
        <div className="hm-scr-card" key={s.n}>
          <span className="hm-scr-avatar">{s.l}</span>
          <div><strong>{s.n}</strong><small>{s.c}</small><small className="hm-scr-sub"><Package size={9} /> {s.p} products in stock</small></div>
        </div>
      ))}
      <div className="hm-scr-tabs"><span className="on"><Store size={13} />Stores</span><span><ShoppingBag size={13} />Orders</span><span><Bike size={13} />Rider</span></div>
    </div>
  );
}

export function RiderScreen() {
  return (
    <div className="hm-scr">
      <div className="hm-scr-row"><div className="hm-scr-title">Requests</div><span className="hm-scr-pill"><i />Online</span></div>
      <div className="hm-scr-card hm-scr-col">
        <div className="hm-scr-row"><small>Placed 2 min ago</small><span className="hm-scr-money">₦2,000</span></div>
        <strong>2× Paracetamol, 1× Vitamin C</strong>
        <div className="hm-scr-stop"><Store size={12} /> Corner Pharmacy</div>
        <div className="hm-scr-stop"><MapPin size={12} /> 12 Admiralty Way, Lekki</div>
        <div className="hm-scr-btn">Accept delivery</div>
      </div>
      <div className="hm-scr-card hm-scr-col hm-scr-dim">
        <div className="hm-scr-row"><small>Placed 9 min ago</small><span className="hm-scr-money">₦1,850</span></div>
        <strong>1× Rice 10kg</strong>
        <div className="hm-scr-stop"><Store size={12} /> Fresh Market</div>
      </div>
      <div className="hm-scr-tabs"><span className="on">Requests</span><span>Trip</span><span>History</span><span>Earnings</span></div>
    </div>
  );
}

export function RidesScreen() {
  return (
    <div className="hm-scr">
      <div className="hm-scr-title">2 offers so far</div>
      <div className="hm-scr-card hm-scr-col">
        <div className="hm-scr-stop"><i className="hm-dot" /> Admiralty Way, Lekki</div>
        <div className="hm-scr-stop"><i className="hm-dot sq" /> Allen Avenue, Ikeja</div>
      </div>
      <div className="hm-scr-card hm-scr-bid">
        <div><strong>Tunde <em>★ 4.8</em></strong><small>Okada · 5 min away</small></div>
        <div className="hm-scr-bidr"><span className="hm-scr-money">₦900</span><span className="hm-scr-btn sm">Accept</span></div>
      </div>
      <div className="hm-scr-card hm-scr-bid">
        <div><strong>Chidi</strong><small>Okada · 3 min away</small></div>
        <div className="hm-scr-bidr"><span className="hm-scr-money">₦1,100</span><span className="hm-scr-btn sm ghost">Accept</span></div>
      </div>
      <div className="hm-scr-offer"><span>−</span><b>₦1,000</b><span>+</span></div>
    </div>
  );
}

/** Wide browser-style card of the merchant dashboard. */
export function DashboardCard() {
  return (
    <div className="hm-dash" aria-hidden="true">
      <div className="hm-dash-bar"><i /><i /><i /><span>merchant.stv.com</span></div>
      <div className="hm-dash-body">
        <div className="hm-dash-side">
          <b>Overview</b><span>Orders</span><span>Products</span><span>Customers</span><span>Analytics</span>
        </div>
        <div className="hm-dash-main">
          <div className="hm-dash-stats">
            <div><small>Sales today</small><strong>₦184,500</strong><em>▲ 12.4%</em></div>
            <div><small>Orders</small><strong>23</strong><em>▲ 4</em></div>
            <div><small>Low stock</small><strong>5</strong><em className="warn">Restock</em></div>
          </div>
          <svg className="hm-dash-chart" viewBox="0 0 400 120" preserveAspectRatio="none">
            <defs><linearGradient id="hm-dash-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2B7CFF" stopOpacity=".45" /><stop offset="1" stopColor="#2B7CFF" stopOpacity="0" /></linearGradient></defs>
            <path d="M0 96 C40 90 60 70 100 74 S160 40 200 48 S270 70 310 36 S370 18 400 10 L400 120 L0 120Z" fill="url(#hm-dash-g)" />
            <path className="hm-dash-line" d="M0 96 C40 90 60 70 100 74 S160 40 200 48 S270 70 310 36 S370 18 400 10" fill="none" stroke="#5AA0FF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="hm-dash-orders">
            {[['#A81F3C', 'Amara K.', 'Paid', '₦7,700'], ['#7C21BE', 'Dr. Femi', 'Preparing', '₦12,400'], ['#05D2E7', 'Blessing E.', 'Delivered', '₦4,850']].map(([id, n, s, t]) => (
              <div key={id}><span className="hm-dash-id">{id}</span><span>{n}</span><span className={`hm-dash-tag ${s === 'Delivered' ? 'ok' : s === 'Paid' ? 'info' : 'warn'}`}>{s}</span><b>{t}</b></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small illustrations used inside the bento tiles. */
export function StorefrontMini() {
  return (
    <div className="hm-mini-browser" aria-hidden="true">
      <div className="hm-mini-url"><i /> your-store.stv.com</div>
      <div className="hm-mini-grid">
        {[['Peak Milk', '₦1,200'], ['Rice 10kg', '₦14,500'], ['Palm Oil', '₦3,800'], ['Bread', '₦900']].map(([n, p]) => (
          <div key={n}><span className="hm-mini-img" /><b>{n}</b><small>{p}</small></div>
        ))}
      </div>
    </div>
  );
}

export function OfflineMini() {
  return (
    <div className="hm-mini-offline" aria-hidden="true">
      <div className="hm-mini-net"><WifiOff size={14} /> No internet — selling continues</div>
      <div className="hm-mini-queue"><span>Sale · ₦3,200</span><em>Saved on this device</em></div>
      <div className="hm-mini-queue"><span>Sale · ₦850</span><em>Saved on this device</em></div>
      <div className="hm-mini-sync"><Check size={13} /> Back online — 2 sales synced</div>
    </div>
  );
}

export function StockMini() {
  return (
    <div className="hm-mini-stock" aria-hidden="true">
      {[['Paracetamol', 86], ['Vitamin C', 42], ['Antiseptic', 12]].map(([n, v]) => (
        <div key={n}><span>{n}</span><div className="hm-mini-bar"><i style={{ '--w': `${v}%` }} /></div><b>{v}</b></div>
      ))}
    </div>
  );
}

export function VerifiedMini() {
  return (
    <div className="hm-mini-verified" aria-hidden="true">
      {['Licence reviewed', 'Vehicle papers reviewed', 'Photo reviewed'].map((t) => (<div key={t}><span><Check size={12} /></span>{t}</div>))}
      <div className="hm-mini-badge">Verified rider</div>
    </div>
  );
}

export function SecureMini() {
  return (
    <div className="hm-mini-secure" aria-hidden="true">
      <div><small>Card payment</small><strong>₦7,700</strong></div>
      <ChevronRight size={16} />
      <div className="ok"><Check size={14} /> Confirmed with Paystack</div>
    </div>
  );
}
