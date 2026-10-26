import { useState } from 'react';
import { ArrowDownCircle, X, Check } from 'lucide-react';
import { naira } from '../../lib/format';

export default function CashDropModal({ onConfirmDrop, onCancel, currentExpectedCash = 0 }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Excess cash transfer to safe');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) return;
    setIsSubmitting(true);
    onConfirmDrop({
      amount: val,
      reason,
      authorizedBy: authorizedBy.trim() || 'Supervisor'
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '440px',
        padding: '26px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownCircle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0a0a0a' }}>Cash Drop / Payout</h3>
              <span style={{ fontSize: '12px', color: '#737373' }}>Transfer cash from drawer to store safe</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: '#737373', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ background: '#f5f5f5', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
          <span style={{ color: '#525252' }}>Estimated Drawer Cash:</span>
          <strong className="font-mono" style={{ fontSize: '14px', color: '#0a0a0a' }}>{naira(currentExpectedCash)}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#404040', marginBottom: '6px' }}>
              Drop Amount (₦)
            </label>
            <input
              type="number"
              min="100"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '18px',
                fontWeight: 800,
                fontFamily: 'monospace',
                borderRadius: '10px',
                border: '1.5px solid #d4d4d4',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              autoFocus
              required
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#404040', marginBottom: '6px' }}>
              Reason / Destination
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13.5px',
                borderRadius: '10px',
                border: '1px solid #d4d4d4',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#404040', marginBottom: '6px' }}>
              Authorized By (Supervisor / Manager)
            </label>
            <input
              type="text"
              placeholder="e.g. Tunde (Store Manager)"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13.5px',
                borderRadius: '10px',
                border: '1px solid #d4d4d4',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #e5e5e5',
                background: '#ffffff',
                color: '#525252',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: '#ea580c',
                color: '#ffffff',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Check size={16} />
              <span>Record Drop</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
