import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Store, 
  Bike, 
  ShoppingBag, 
  Clock, 
  Receipt, 
  ShieldCheck,
  Zap,
  MapPin,
  CheckCircle2,
  Navigation
} from 'lucide-react';

export default function InteractiveLiveDemoWidget() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll('.lp-reveal') || [];
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.1 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const storeCatalog = [
    {
      storeName: 'Apex Health Pharmacy',
      category: 'Pharmacy & Wellness',
      subdomain: 'apex-pharmacy.stv.com',
      productName: 'Amoxicillin 500mg (20 Caps)',
      sku: 'SKU-PHARM-102',
      price: '₦3,800',
      initialStock: 14,
      buyerName: 'Amara K.',
      buyerAddress: 'Apt 4B, Admiralty Way, Lekki',
      riderName: 'Samuel O. (Rider #284)',
      vehicle: 'Yamaha 125cc'
    },
    {
      storeName: 'GreenGrocer Organic Mart',
      category: 'Supermarket & Food',
      subdomain: 'greengrocer.stv.com',
      productName: 'Cold-Pressed Almond Milk (1L)',
      sku: 'SKU-GROC-441',
      price: '₦4,500',
      initialStock: 8,
      buyerName: 'Femi D.',
      buyerAddress: '12 Isaac John St, Ikeja GRA',
      riderName: 'Tunde B. (Rider #119)',
      vehicle: 'Electric Scooter X'
    },
    {
      storeName: 'Volt Electronics & Audio',
      category: 'Consumer Electronics',
      subdomain: 'volt-tech.stv.com',
      productName: 'Anker USB-C Power Bank 20k',
      sku: 'SKU-TECH-882',
      price: '₦28,000',
      initialStock: 5,
      buyerName: 'Blessing E.',
      buyerAddress: 'Plot 8, Victoria Island Close',
      riderName: 'Ibrahim K. (Rider #092)',
      vehicle: 'Bajaj Pulsar 150'
    }
  ];

  const [selectedStoreIndex, setSelectedStoreIndex] = useState(0);
  const [demoState, setDemoState] = useState('idle'); // 'idle' | 'ringing' | 'syncing' | 'in_transit' | 'delivered'
  const [currentStock, setCurrentStock] = useState(storeCatalog[0].initialStock);
  const [logs, setLogs] = useState([]);
  const [etaTimer, setEtaTimer] = useState(18);
  const [progressPct, setProgressPct] = useState(0);

  const currentStore = storeCatalog[selectedStoreIndex];

  // Reset stock count when store changes
  useEffect(() => {
    setCurrentStock(currentStore.initialStock);
    setDemoState('idle');
    setLogs([]);
    setProgressPct(0);
    setEtaTimer(18);
  }, [selectedStoreIndex]);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ time, msg, type }, ...prev.slice(0, 6)]);
  };

  const handleStartSimulation = () => {
    if (demoState !== 'idle') return;

    // Step 1: Ringing Sale
    setDemoState('ringing');
    addLog(`[Storefront] Customer initiated checkout at ${currentStore.subdomain}`, 'info');

    setTimeout(() => {
      // Step 2: Syncing Inventory
      setDemoState('syncing');
      setCurrentStock(prev => Math.max(0, prev - 1));
      addLog(`[Inventory Sync] Live catalog stock decremented to ${currentStore.initialStock - 1} units in real time`, 'success');
      addLog(`[Settlement] ${currentStore.price} direct payment confirmed`, 'success');

      setTimeout(() => {
        // Step 3: Courier Dispatch & Transit
        setDemoState('in_transit');
        addLog(`[Radar] Auto-dispatched nearest verified courier: ${currentStore.riderName}`, 'info');
        addLog(`[Route Batch] Corridor delivery route optimized (ETA ~18 mins)`, 'info');

        // Animate progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += 25;
          setProgressPct(progress);
          setEtaTimer(prev => Math.max(1, prev - 4));

          if (progress >= 100) {
            clearInterval(interval);
            setDemoState('delivered');
            addLog(`[Proof of Delivery] OTP verified. Handed over to ${currentStore.buyerName}`, 'success');
            addLog(`[Payout] 100% courier trip fare & tips deposited to driver wallet`, 'success');
          }
        }, 900);

      }, 1300);
    }, 1100);
  };

  const handleReset = () => {
    setDemoState('idle');
    setCurrentStock(currentStore.initialStock);
    setLogs([]);
    setProgressPct(0);
    setEtaTimer(18);
  };

  return (
    <section id="live-demo" className="lp-section lp-demo-section" ref={sectionRef}>
      <div className="lp-container">
        {/* Header without pill */}
        <div className="lp-section-header-center lp-reveal">
          <span className="lp-eyebrow">Interactive Simulation</span>
          <h2 className="lp-h2">Watch the 3-way network execute in real time.</h2>
          <p className="lp-body" style={{ marginTop: '16px' }}>
            Experience how a storefront checkout decrements live shelf inventory and auto-dispatches an on-demand courier in seconds.
          </p>

          {/* Store Category Selectors */}
          <div className="lp-demo-selectors" style={{ marginTop: '32px' }}>
            {storeCatalog.map((store, idx) => (
              <button
                key={store.storeName}
                className={`lp-demo-sel-btn ${selectedStoreIndex === idx ? 'active' : ''}`}
                onClick={() => setSelectedStoreIndex(idx)}
                disabled={demoState !== 'idle' && demoState !== 'delivered'}
              >
                <Store size={15} color={selectedStoreIndex === idx ? '#27BBAD' : '#737373'} />
                <span>{store.storeName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* The Live Interactive Sandbox Box */}
        <div className="lp-demo-card lp-reveal lp-reveal-d1">
          {/* Top Bar */}
          <div className="lp-demo-top-bar">
            <div className="lp-demo-top-left">
              <span className="lp-preview-dot" />
              <span className="font-mono" style={{ fontSize: '12.5px', fontWeight: 600 }}>
                ACTIVE TENANT: {currentStore.subdomain}
              </span>
            </div>
            {demoState !== 'idle' && (
              <button className="lp-btn-reset" onClick={handleReset}>
                <RotateCcw size={13} />
                <span>Reset Demo</span>
              </button>
            )}
          </div>

          {/* 3 Interactive Grid Columns */}
          <div className="lp-demo-3col-grid">
            {/* Column 1: Store & Inventory */}
            <div className="lp-demo-col">
              <div className="lp-demo-col-header">
                <div className="lp-demo-col-title-wrap">
                  <div className="lp-check-icon">
                    <Store size={13} />
                  </div>
                  <div>
                    <h4 className="lp-demo-col-title">1. Merchant Inventory</h4>
                    <span className="lp-demo-col-sub font-mono">{currentStore.subdomain}</span>
                  </div>
                </div>
                <span className={`lp-demo-status-pill ${demoState === 'ringing' || demoState === 'syncing' ? 'active' : demoState === 'delivered' ? 'success' : ''}`}>
                  {demoState === 'idle' ? 'Ready' : demoState === 'ringing' ? 'Checking out...' : demoState === 'syncing' ? 'Syncing...' : 'Synced'}
                </span>
              </div>

              <div className="lp-demo-col-body">
                <div className="lp-preview-item">
                  <div>
                    <div className="lp-preview-item-title">{currentStore.productName}</div>
                    <div className="lp-preview-item-sub font-mono">{currentStore.sku}</div>
                  </div>
                  <div className="lp-preview-item-price">{currentStore.price}</div>
                </div>

                <div className="lp-demo-stock-box">
                  <span style={{ fontSize: '13px', color: 'var(--lp-text-2)' }}>Live Catalog Stock:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--lp-text)' }}>
                      {currentStock} units
                    </span>
                    {demoState !== 'idle' && (
                      <span className="font-mono" style={{ fontSize: '12px', fontWeight: 700, color: '#27BBAD' }}>(-1 sold)</span>
                    )}
                  </div>
                </div>

                {demoState !== 'idle' && (
                  <div className="lp-demo-receipt-mini">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#27BBAD', fontWeight: 600, fontSize: '11.5px', marginBottom: '4px' }}>
                      <Receipt size={13} />
                      <span className="font-mono">DIGITAL RECEIPT #{Math.floor(100000 + Math.random() * 900000)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: 'var(--lp-text-2)' }}>Amount Paid</span>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--lp-text)' }}>{currentStore.price}</span>
                    </div>
                  </div>
                )}

                {demoState === 'idle' && (
                  <button className="lp-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }} onClick={handleStartSimulation}>
                    <Play size={14} />
                    <span>Trigger Order Checkout</span>
                  </button>
                )}
              </div>
            </div>

            {/* Column 2: Neighborhood Marketplace */}
            <div className="lp-demo-col">
              <div className="lp-demo-col-header">
                <div className="lp-demo-col-title-wrap">
                  <div className="lp-check-icon">
                    <ShoppingBag size={13} />
                  </div>
                  <div>
                    <h4 className="lp-demo-col-title">2. Shopper Hub</h4>
                    <span className="lp-demo-col-sub font-mono">shop.stv.com</span>
                  </div>
                </div>
                <span className={`lp-demo-status-pill ${demoState === 'in_transit' ? 'active' : demoState === 'delivered' ? 'success' : ''}`}>
                  {demoState === 'in_transit' ? 'In Transit' : demoState === 'delivered' ? 'Arrived' : 'Live Stream'}
                </span>
              </div>

              <div className="lp-demo-col-body">
                <div className="lp-demo-shopper-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="lp-preview-tag">{currentStore.category}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--lp-text-3)', fontWeight: 600 }}>
                      <Clock size={12} />
                      <span>{demoState === 'in_transit' ? `${etaTimer} mins` : '18 mins'}</span>
                    </span>
                  </div>
                  <h5 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px', color: 'var(--lp-text)' }}>{currentStore.productName}</h5>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontWeight: 700, color: 'var(--lp-text)', fontSize: '15px' }}>{currentStore.price}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#27BBAD' }}>{currentStock} available</span>
                  </div>
                  <div style={{ marginTop: '12px', padding: '10px', background: '#fafafa', border: '1px solid var(--lp-border)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--lp-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Delivery Destination:</div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--lp-text)', marginTop: '2px' }}>{currentStore.buyerName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--lp-text-2)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={11} color="#27BBAD" />
                      <span>{currentStore.buyerAddress}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Courier Dispatch Radar */}
            <div className="lp-demo-col">
              <div className="lp-demo-col-header">
                <div className="lp-demo-col-title-wrap">
                  <div className="lp-check-icon">
                    <Bike size={13} />
                  </div>
                  <div>
                    <h4 className="lp-demo-col-title">3. Courier Radar</h4>
                    <span className="lp-demo-col-sub font-mono">rider.stv.com</span>
                  </div>
                </div>
                <span className={`lp-demo-status-pill ${demoState === 'delivered' ? 'success' : demoState === 'in_transit' ? 'active' : ''}`}>
                  {demoState === 'idle' ? 'Standby' : demoState === 'delivered' ? 'Delivered' : demoState === 'in_transit' ? 'In Route' : 'Matching'}
                </span>
              </div>

              <div className="lp-demo-col-body">
                {/* Modern GPS Simulated Route Card */}
                <div className="lp-gps-route-card">
                  <div className="lp-gps-route-nodes">
                    <div className="lp-gps-node origin">
                      <div className="lp-gps-node-dot" />
                      <div>
                        <div className="lp-gps-node-label">Pickup Origin</div>
                        <div className="lp-gps-node-name">{currentStore.storeName}</div>
                      </div>
                    </div>

                    <div className="lp-gps-transit-line-wrap">
                      <div className="lp-gps-transit-track">
                        <div className="lp-gps-transit-fill" style={{ width: `${progressPct}%` }} />
                      </div>
                      <div 
                        className="lp-gps-rider-marker" 
                        style={{ left: `${Math.min(92, Math.max(8, progressPct))}%` }}
                      >
                        <Bike size={13} color="#ffffff" />
                      </div>
                    </div>

                    <div className="lp-gps-node destination">
                      <div className="lp-gps-node-dot dest" />
                      <div>
                        <div className="lp-gps-node-label">Doorstep Dropoff</div>
                        <div className="lp-gps-node-name">{currentStore.buyerAddress.split(',')[0]}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Telemetry Driver Card */}
                <div className="lp-gps-driver-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Navigation size={13} color="#27BBAD" />
                      <strong style={{ fontSize: '13px', color: 'var(--lp-text)' }}>{currentStore.riderName}</strong>
                    </div>
                    <span className="font-mono" style={{ fontSize: '11.5px', color: 'var(--lp-text-3)' }}>{currentStore.vehicle}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--lp-border)', fontSize: '12px' }}>
                    <span style={{ color: 'var(--lp-text-2)' }}>Status:</span>
                    <strong style={{ color: '#27BBAD' }}>
                      {demoState === 'delivered' ? '✓ Handover OTP Verified' : demoState === 'in_transit' ? `In Route (ETA ~${etaTimer} mins)` : 'Awaiting Order'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Event Stream */}
          {logs.length > 0 && (
            <div className="lp-demo-stream">
              <div className="lp-demo-stream-header">
                <ShieldCheck size={14} color="#27BBAD" />
                <span className="font-mono" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  PLATFORM EVENT STREAM & AUDIT TRAIL
                </span>
              </div>
              <div className="lp-demo-stream-body">
                {logs.map((log, index) => (
                  <div key={index} className="lp-demo-stream-item">
                    <span className="font-mono" style={{ color: 'var(--lp-text-3)', fontSize: '11.5px' }}>[{log.time}]</span>
                    <span style={{ fontSize: '12.5px', color: log.type === 'success' ? '#27BBAD' : 'var(--lp-text)' }}>
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
