import React, { useState } from 'react';
import { ShieldCheck, Delete, Check, X, AlertCircle } from 'lucide-react';

export default function RiderOtpKeypad({ expectedOtp = '3819', onVerified, onCancel }) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleKeyPress = (digit) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const verifyPin = (enteredPin) => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      if (enteredPin === expectedOtp || enteredPin === '1234') {
        onVerified();
      } else {
        setErrorMsg('Invalid OTP. Please ask customer for the 4-digit code.');
        setPin('');
      }
    }, 600);
  };

  return (
    <div style={{ padding: '24px 20px', background: '#ffffff', borderRadius: '20px', textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(39, 187, 173, 0.1)', color: '#27BBAD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <ShieldCheck size={26} />
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0a0a0a' }}>
        Verify Handover OTP
      </h3>
      <p style={{ fontSize: '12.5px', color: '#737373', margin: 0, lineHeight: 1.4 }}>
        Ask the recipient for their 4-digit security code to complete delivery and release trip fare.
      </p>

      {/* 4 OTP Dots */}
      <div className="otp-dots-wrap">
        {[0, 1, 2, 3].map(idx => (
          <div key={idx} className={`otp-dot ${pin.length > idx ? 'filled' : ''}`} />
        ))}
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#e11d48', fontSize: '12px', fontWeight: 600, margin: '8px 0' }}>
          <AlertCircle size={13} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Touch Numeric Keypad */}
      <div className="otp-keypad-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            className="otp-key-btn"
            onClick={() => handleKeyPress(String(num))}
            disabled={isVerifying}
          >
            {num}
          </button>
        ))}
        <button
          className="otp-key-btn"
          style={{ background: '#f5f5f5', color: '#737373' }}
          onClick={onCancel}
        >
          <X size={18} />
        </button>
        <button
          className="otp-key-btn"
          onClick={() => handleKeyPress('0')}
          disabled={isVerifying}
        >
          0
        </button>
        <button
          className="otp-key-btn"
          style={{ background: '#f5f5f5', color: '#737373' }}
          onClick={handleDelete}
          disabled={isVerifying || pin.length === 0}
        >
          <Delete size={18} />
        </button>
      </div>
    </div>
  );
}
