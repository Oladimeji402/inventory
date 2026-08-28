import React, { useState } from 'react';
import { 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Sparkles,
  TrendingUp
} from 'lucide-react';

const mockPastTrips = [
  { id: 'TRIP-401', store: 'Apex Health Pharmacy', customer: 'Amara K. (Admiralty Way)', fare: 1850, tip: 300, time: '2:15 PM' },
  { id: 'TRIP-400', store: 'GreenGrocer Organic', customer: 'Dr. Femi D. (Ikeja GRA)', fare: 2100, tip: 500, time: '12:40 PM' },
  { id: 'TRIP-399', store: 'Volt Electronics', customer: 'Blessing E. (VI Close)', fare: 2400, tip: 0, time: '10:15 AM' },
  { id: 'TRIP-398', store: 'Apex Health Pharmacy', customer: 'Tolu A. (Bourdillon Rd)', fare: 1950, tip: 400, time: '8:50 AM' },
];

export default function RiderWallet({ walletBalance = 18450, onCashoutSuccess }) {
  const [balance, setBalance] = useState(walletBalance);
  const [trips, setTrips] = useState(mockPastTrips);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [cashoutDone, setCashoutDone] = useState(false);

  const formatNaira = (num) => '₦' + Math.round(Number(num) || 0).toLocaleString();

  const handleCashout = () => {
    if (balance <= 0) return;
    setIsCashingOut(true);
    setTimeout(() => {
      setIsCashingOut(false);
      setCashoutDone(true);
      setBalance(0);
      setTimeout(() => setCashoutDone(false), 4000);
    }, 1200);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      {/* Balance Card */}
      <div style={{ background: '#0a0a0a', color: '#ffffff', borderRadius: '20px', padding: '24px', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '12.5px', color: '#a3a3a3', fontWeight: 600 }}>Available Payout Balance</span>
          <span style={{ fontSize: '11.5px', background: 'rgba(39, 187, 173, 0.2)', color: '#27BBAD', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
            Instant Withdrawal
          </span>
        </div>

        <div className="font-mono" style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {formatNaira(balance)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12px', color: '#a3a3a3' }}>
          <Building2 size={13} color="#27BBAD" />
          <span>Guaranty Trust Bank · 0192837465</span>
        </div>

        <button
          onClick={handleCashout}
          disabled={balance <= 0 || isCashingOut}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            background: balance > 0 ? '#27BBAD' : '#333333',
            color: '#ffffff',
            border: 'none',
            fontSize: '14.5px',
            fontWeight: 800,
            cursor: balance > 0 ? 'pointer' : 'not-allowed',
            marginTop: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'inherit'
          }}
        >
          {isCashingOut ? (
            <span>Processing Bank Transfer...</span>
          ) : (
            <>
              <span>Cash Out to Bank Account</span>
              <ArrowUpRight size={16} />
            </>
          )}
        </button>
      </div>

      {cashoutDone && (
        <div style={{ padding: '14px 18px', background: 'rgba(39, 187, 173, 0.1)', border: '1px solid #27BBAD', borderRadius: '12px', color: '#0f766e', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <CheckCircle2 size={16} color="#27BBAD" />
          <span>₦18,450 successfully sent to your bank account!</span>
        </div>
      )}

      {/* Today's Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Trips Today</div>
          <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#0a0a0a', marginTop: '2px' }}>
            {trips.length + 1}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>100% Tips</div>
          <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#27BBAD', marginTop: '2px' }}>
            ₦1,200
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Driver Score</div>
          <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#0a0a0a', marginTop: '2px' }}>
            4.95 ★
          </div>
        </div>
      </div>

      {/* Recent Completed Trips Ledger */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
          Recent Completed Trips
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {trips.map(t => (
            <div 
              key={t.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0a0a0a' }}>{t.store}</div>
                <div style={{ fontSize: '12px', color: '#737373', marginTop: '2px' }}>{t.customer}</div>
                <div style={{ fontSize: '11px', color: '#a3a3a3', marginTop: '4px' }}>{t.time}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: '#0a0a0a' }}>
                  {formatNaira(t.fare + t.tip)}
                </div>
                {t.tip > 0 && (
                  <span style={{ fontSize: '11px', color: '#27BBAD', fontWeight: 700 }}>
                    +{formatNaira(t.tip)} tip
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
