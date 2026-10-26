import React, { useState } from 'react';
import './Rider.css';
import { BRAND } from '../../config/brand';
import RiderRadar from './RiderRadar';
import RiderSchoolContracts from './RiderSchoolContracts';
import RiderActiveTrip from './RiderActiveTrip';
import RiderWallet from './RiderWallet';
import RiderProfile from './RiderProfile';
import { 
  Radar, 
  Navigation, 
  Wallet, 
  User, 
  GraduationCap,
  Sun,
  Moon,
  Bike,
  ShieldCheck,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { acceptDispatch } from '../../services/rider';

export default function RiderApp({ rider, profile, onExitToLanding }) {
  const [currentTab, setCurrentTab] = useState('radar'); // 'radar' | 'contracts' | 'trip' | 'wallet' | 'profile'
  const [isOnline, setIsOnline] = useState(true);
  const [sunlightMode, setSunlightMode] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState('okada'); // 'okada' | 'maruwa' | 'car'
  const [activeTrip, setActiveTrip] = useState(null);
  const [walletBalance, setWalletBalance] = useState(38450);

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  const handleAcceptTrip = async (trip) => {
    try {
      const res = await acceptDispatch(trip.orderId);
      setActiveTrip(res?.data || trip);
    } catch {
      setActiveTrip(trip);
    }
    setCurrentTab('trip');
  };

  const handleTripCompleted = (trip) => {
    const tripTotal = (trip.fare || 1850) + (trip.tip || 0);
    setWalletBalance(prev => prev + tripTotal);
    setActiveTrip(null);
    setCurrentTab('wallet');
  };

  const vehicleEmojis = {
    okada: '🏍️',
    maruwa: '🛺',
    car: '🚗'
  };

  return (
    <div className={`rider-root ${sunlightMode ? 'sunlight-mode' : ''}`}>
      {/* Driver Top Status & Duty Header Bar */}
      <header className="rider-top-bar" role="banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Active vehicle badge with switcher */}
          <button 
            className="rider-vehicle-badge-btn"
            onClick={() => {
              const order = ['okada', 'maruwa', 'car'];
              const next = order[(order.indexOf(activeVehicle) + 1) % order.length];
              setActiveVehicle(next);
            }}
            title="Switch Operating Fleet (Okada, Maruwa, Taxi)"
            aria-label={`Current vehicle is ${activeVehicle}. Click to switch vehicle type`}
          >
            <span style={{ fontSize: '18px' }}>{vehicleEmojis[activeVehicle]}</span>
            <span style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'capitalize' }}>
              {activeVehicle}
            </span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <h1 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--rider-text)' }}>
                {BRAND.name} Mobility
              </h1>
              <ShieldCheck size={14} color="#10B981" />
            </div>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--rider-text-muted)', display: 'block' }}>
              Ikeja Node · #RDR-284
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Sunlight Mode High-Contrast Accessibility Switch */}
          <button
            className={`rider-sunlight-toggle ${sunlightMode ? 'active' : ''}`}
            onClick={() => setSunlightMode(!sunlightMode)}
            title="Toggle High-Contrast Sunlight Mode for outdoor glare"
            aria-label="Toggle Sunlight High-Contrast Mode"
            aria-pressed={sunlightMode}
          >
            {sunlightMode ? <Sun size={15} color="#F59E0B" /> : <Sun size={15} color="#737373" />}
            <span className="sunlight-label">{sunlightMode ? 'Sunlight' : 'Standard'}</span>
          </button>

          {/* Online / Offline Duty Switch */}
          <button
            className={`rider-duty-toggle ${isOnline ? 'online' : ''}`}
            onClick={() => setIsOnline(!isOnline)}
            aria-label={isOnline ? 'Go Offline' : 'Go Online'}
            aria-pressed={isOnline}
          >
            <span className="rider-duty-dot" />
            <span style={{ fontSize: '12px', fontWeight: 800, color: isOnline ? '#2B7CFF' : 'var(--rider-text-muted)' }}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Tab Screen */}
      <main id="rider-main-content">
        {currentTab === 'radar' && (
          <RiderRadar 
            isOnline={isOnline}
            onAcceptTrip={handleAcceptTrip}
            selectedVehicle={activeVehicle}
          />
        )}

        {currentTab === 'contracts' && (
          <RiderSchoolContracts 
            isOnline={isOnline}
          />
        )}

        {currentTab === 'trip' && (
          activeTrip ? (
            <RiderActiveTrip 
              trip={activeTrip}
              onTripCompleted={handleTripCompleted}
              onCancelTrip={() => { setActiveTrip(null); setCurrentTab('radar'); }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '480px', margin: '0 auto' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--rider-card-inner-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--rider-text-muted)' }}>
                <Navigation size={28} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: 'var(--rider-text)' }}>
                No Trip Currently Active
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--rider-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
                Switch to the Radar tab to accept incoming rides, errands, or morning school run bids.
              </p>
              <button
                onClick={() => setCurrentTab('radar')}
                className="rider-primary-touch-btn"
                style={{ height: '52px', maxWidth: '240px', margin: '0 auto' }}
              >
                Go to Radar
              </button>
            </div>
          )
        )}

        {currentTab === 'wallet' && (
          <RiderWallet 
            walletBalance={walletBalance}
          />
        )}

        {currentTab === 'profile' && (
          <RiderProfile 
            profile={profile}
            currentVehicle={activeVehicle}
            onVehicleChange={(veh) => setActiveVehicle(veh)}
            onExitToLanding={onExitToLanding}
          />
        )}
      </main>

      {/* Driver Bottom Navigation Bar (5 Touch Tabs) */}
      <nav className="rider-bottom-nav" role="tablist" aria-label="Driver Navigation">
        <button
          role="tab"
          aria-selected={currentTab === 'radar'}
          className={`rider-nav-btn ${currentTab === 'radar' ? 'active' : ''}`}
          onClick={() => setCurrentTab('radar')}
        >
          <Radar size={20} />
          <span>Radar</span>
        </button>

        <button
          role="tab"
          aria-selected={currentTab === 'contracts'}
          className={`rider-nav-btn ${currentTab === 'contracts' ? 'active' : ''}`}
          onClick={() => setCurrentTab('contracts')}
        >
          <GraduationCap size={20} />
          <span>Contracts</span>
        </button>

        <button
          role="tab"
          aria-selected={currentTab === 'trip'}
          className={`rider-nav-btn ${currentTab === 'trip' ? 'active' : ''}`}
          onClick={() => setCurrentTab('trip')}
        >
          <div style={{ position: 'relative' }}>
            <Navigation size={20} />
            {activeTrip && <span className="rider-nav-active-pip" />}
          </div>
          <span>Active Trip</span>
        </button>

        <button
          role="tab"
          aria-selected={currentTab === 'wallet'}
          className={`rider-nav-btn ${currentTab === 'wallet' ? 'active' : ''}`}
          onClick={() => setCurrentTab('wallet')}
        >
          <Wallet size={20} />
          <span>Earnings</span>
        </button>

        <button
          role="tab"
          aria-selected={currentTab === 'profile'}
          className={`rider-nav-btn ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentTab('profile')}
        >
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
