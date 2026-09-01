import React, { useState } from 'react';
import './Rider.css';
import { BRAND } from '../../config/brand';
import RiderRadar from './RiderRadar';
import RiderActiveTrip from './RiderActiveTrip';
import RiderWallet from './RiderWallet';
import RiderProfile from './RiderProfile';
import { 
  Radar, 
  Navigation, 
  Wallet, 
  User, 
  Power, 
  ArrowLeft,
  Bike
} from 'lucide-react';

export default function RiderApp({ onExitToLanding }) {
  const [currentTab, setCurrentTab] = useState('radar'); // 'radar' | 'trip' | 'wallet' | 'profile'
  const [isOnline, setIsOnline] = useState(true);
  const [activeTrip, setActiveTrip] = useState(null);
  const [walletBalance, setWalletBalance] = useState(18450);

  const handleAcceptTrip = (trip) => {
    setActiveTrip(trip);
    setCurrentTab('trip');
  };

  const handleTripCompleted = (trip) => {
    setWalletBalance(prev => prev + trip.fare + trip.tip);
    setActiveTrip(null);
    setCurrentTab('wallet');
  };

  return (
    <div className="rider-root">
      {/* Driver Top Status Bar */}
      <header className="rider-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#2B7CFF', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bike size={16} />
          </div>
          <div>
            <h1 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0a0a0a' }}>
              {BRAND.name} Courier
            </h1>
            <span className="font-mono" style={{ fontSize: '10.5px', color: '#737373', display: 'block' }}>
              Ikeja GRA Node · Rider #284
            </span>
          </div>
        </div>

        {/* Online / Offline Duty Switch */}
        <button
          className={`rider-duty-toggle ${isOnline ? 'online' : ''}`}
          onClick={() => setIsOnline(!isOnline)}
        >
          <span className="rider-duty-dot" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: isOnline ? '#2B7CFF' : '#737373' }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </button>
      </header>

      {/* Main Tab View */}
      <main>
        {currentTab === 'radar' && (
          <RiderRadar 
            isOnline={isOnline}
            onAcceptTrip={handleAcceptTrip}
          />
        )}

        {currentTab === 'trip' && activeTrip && (
          <RiderActiveTrip 
            trip={activeTrip}
            onTripCompleted={handleTripCompleted}
            onCancelTrip={() => { setActiveTrip(null); setCurrentTab('radar'); }}
          />
        )}

        {currentTab === 'wallet' && (
          <RiderWallet 
            walletBalance={walletBalance}
          />
        )}

        {currentTab === 'profile' && (
          <RiderProfile 
            onExitToLanding={onExitToLanding}
          />
        )}
      </main>

      {/* Driver Bottom Navigation Bar */}
      <nav className="rider-bottom-nav">
        <button
          className={`rider-nav-btn ${currentTab === 'radar' ? 'active' : ''}`}
          onClick={() => setCurrentTab('radar')}
        >
          <Radar size={18} />
          <span>Radar</span>
        </button>

        <button
          className={`rider-nav-btn ${currentTab === 'trip' ? 'active' : ''}`}
          onClick={() => {
            if (activeTrip) setCurrentTab('trip');
            else setCurrentTab('radar');
          }}
        >
          <Navigation size={18} />
          <span>Active Trip</span>
        </button>

        <button
          className={`rider-nav-btn ${currentTab === 'wallet' ? 'active' : ''}`}
          onClick={() => setCurrentTab('wallet')}
        >
          <Wallet size={18} />
          <span>Earnings</span>
        </button>

        <button
          className={`rider-nav-btn ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentTab('profile')}
        >
          <User size={18} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
