import React, { useState } from 'react';
import { X, User, Lock, Mail, Phone, ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';

export default function MarketplaceAuthModal({
  isOpen,
  onClose,
  onLoginSuccess
}) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setSuccessMsg(true);
    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess({
          name: fullName || 'Valued Shopper',
          email: email || 'shopper@example.com'
        });
      }
      onClose();
    }, 1200);
  }

  function handleDemoLogin() {
    setEmail('tunde.adeleke@example.com');
    setPassword('••••••••');
    setFullName('Tunde Adeleke');
    setSuccessMsg(true);
    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess({
          name: 'Tunde Adeleke',
          email: 'tunde.adeleke@example.com'
        });
      }
      onClose();
    }, 900);
  }

  return (
    <div className="mp-modal-backdrop" onClick={onClose}>
      <div className="mp-auth-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mp-modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="mp-auth-header">
          <div className="mp-auth-icon-wrap">
            <User size={24} />
          </div>
          <h3 className="mp-auth-title">{isSignUp ? 'Create Customer Account' : 'Welcome to Subtech Ventures'}</h3>
          <p className="mp-auth-sub">
            {isSignUp ? 'Track orders, save favorite stores, and enjoy faster corridor checkout.' : 'Sign in to access your order history and saved addresses.'}
          </p>
        </div>

        {successMsg ? (
          <div className="mp-auth-success-box">
            <CheckCircle size={36} className="text-emerald-500" />
            <h4>Signed In Successfully!</h4>
            <p>Welcome back! Refreshing your marketplace profile...</p>
          </div>
        ) : (
          <form className="mp-auth-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="mp-form-field">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tunde Adeleke"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mp-input"
                />
              </div>
            )}

            <div className="mp-form-field">
              <label>Email Address</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mp-input"
              />
            </div>

            {isSignUp && (
              <div className="mp-form-field">
                <label>Phone Number (for courier SMS)</label>
                <input
                  type="tel"
                  required
                  placeholder="+234 800 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mp-input"
                />
              </div>
            )}

            <div className="mp-form-field">
              <label>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mp-input"
              />
            </div>

            <button type="submit" className="mp-auth-submit-btn">
              <span>{isSignUp ? 'Create Account' : 'Sign In to Subtech'}</span>
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              className="mp-auth-demo-btn"
              onClick={handleDemoLogin}
            >
              <span>1-Click Demo Shopper Login</span>
            </button>

            <div className="mp-auth-toggle-row">
              {isSignUp ? (
                <span>
                  Already have an account?{' '}
                  <button type="button" onClick={() => setIsSignUp(false)} className="mp-auth-switch-link">
                    Sign In
                  </button>
                </span>
              ) : (
                <span>
                  New to Subtech?{' '}
                  <button type="button" onClick={() => setIsSignUp(true)} className="mp-auth-switch-link">
                    Create an account
                  </button>
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
