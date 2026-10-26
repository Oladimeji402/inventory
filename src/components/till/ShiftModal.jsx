import { useState } from 'react';
import { Banknote, Check, ArrowRight } from 'lucide-react';
import { naira } from '../../lib/format';

export default function ShiftModal({ onOpenShift, defaultFloat = 10000, cashierName = 'Cashier' }) {
  const [openingFloat, setOpeningFloat] = useState(defaultFloat);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickPicks = [5000, 10000, 20000, 50000];

  const handleSubmit = (e) => {
    e?.preventDefault();
    setIsSubmitting(true);
    onOpenShift(Number(openingFloat) || 0);
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
        maxWidth: '460px',
        padding: '28px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'rgba(43, 124, 255, 0.1)',
          color: '#2B7CFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Banknote size={28} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: '#0a0a0a' }}>
          Open Cash Drawer Shift
        </h2>
        <p style={{ fontSize: '13px', color: '#737373', margin: '0 0 20px', lineHeight: 1.5 }}>
          Welcome, <strong>{cashierName}</strong>. Enter the opening physical cash float placed in the till drawer.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#404040', marginBottom: '6px', textTransform: 'uppercase' }}>
              Opening Drawer Float (₦)
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '22px',
                fontWeight: 800,
                fontFamily: 'monospace',
                borderRadius: '12px',
                border: '1.5px solid #d4d4d4',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              autoFocus
              required
            />
          </div>

          {/* Quick preset buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
            {quickPicks.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setOpeningFloat(amt)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '8px',
                  border: openingFloat === amt ? '1.5px solid #2B7CFF' : '1px solid #e5e5e5',
                  background: openingFloat === amt ? 'rgba(43, 124, 255, 0.08)' : '#f9f9f9',
                  color: openingFloat === amt ? '#2B7CFF' : '#525252',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {naira(amt)}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '12px',
              border: 'none',
              background: '#2B7CFF',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(43, 124, 255, 0.4)'
            }}
          >
            <span>Confirm Opening Float & Start Shift</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
