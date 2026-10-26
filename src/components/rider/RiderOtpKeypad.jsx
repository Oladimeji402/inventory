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
      // Accept matching OTP, 1234, or default 3819
      if (enteredPin === String(expectedOtp) || enteredPin === '1234' || enteredPin === '3819') {
        onVerified(enteredPin);
      } else {
        setErrorMsg('Invalid Security OTP. Please ask the passenger for the 4 digits displayed on their phone screen.');
        setPin('');
      }
    }, 500);
  };

  return (
    <div className="rider-otp-modal-inner" role="dialog" aria-modal="true" aria-labelledby="otp-title">
      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(43, 124, 255, 0.15)', color: '#2B7CFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <ShieldCheck size={32} />
      </div>

      <h3 id="otp-title" style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: 'var(--rider-text)' }}>
        Verify Handover OTP
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--rider-text-muted)', margin: '0 0 16px', lineHeight: 1.4, maxWidth: '320px', marginInline: 'auto' }}>
        Ask recipient for their 4-digit security code. This completes delivery and releases trip fare to your wallet.
      </p>

      {/* 4 OTP Visual Indicators */}
      <div className="otp-dots-wrap" aria-label={`Entered ${pin.length} of 4 digits`}>
        {[0, 1, 2, 3].map(idx => (
          <div 
            key={idx} 
            className={`otp-dot ${pin.length > idx ? 'filled' : ''}`}
          >
            {pin.length > idx ? pin[idx] : ''}
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="otp-error-banner" role="alert">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ATM-Style High-Contrast Touch Numeric Keypad */}
      <div className="otp-keypad-grid" role="group" aria-label="Numeric PIN keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            className="otp-key-btn"
            onClick={() => handleKeyPress(String(num))}
            disabled={isVerifying}
            aria-label={`Digit ${num}`}
          >
            {num}
          </button>
        ))}

        {/* Cancel / Dismiss */}
        <button
          className="otp-key-btn control-cancel"
          onClick={onCancel}
          aria-label="Cancel OTP verification"
        >
          <X size={22} />
        </button>

        {/* 0 */}
        <button
          className="otp-key-btn"
          onClick={() => handleKeyPress('0')}
          disabled={isVerifying}
          aria-label="Digit 0"
        >
          0
        </button>

        {/* Delete */}
        <button
          className="otp-key-btn control-delete"
          onClick={handleDelete}
          disabled={isVerifying || pin.length === 0}
          aria-label="Delete last digit"
        >
          <Delete size={22} />
        </button>
      </div>

      <div style={{ marginTop: '16px', fontSize: '11.5px', color: 'var(--rider-text-muted)' }}>
        Demo code: <strong>{expectedOtp || '3819'}</strong> (or enter <strong>1234</strong>)
      </div>
    </div>
  );
}
