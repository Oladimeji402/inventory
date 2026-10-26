import { useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  CreditCard, 
  Banknote, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { naira } from '../../lib/format';

export default function XZReportModal({ 
  mode = 'X', // 'X' (interim reading) or 'Z' (end-of-shift closeout)
  reportData = {}, 
  cashierName = 'Cashier',
  onClose,
  onConfirmCloseShift 
}) {
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zReportComplete, setZReportComplete] = useState(null);

  const {
    shiftId = 'SHIFT-001',
    openedAt = new Date().toISOString(),
    openingFloat = 10000,
    cashDrops = 0,
    cashSales = 0,
    cardSales = 0,
    transferSales = 0,
    totalSales = 0,
    expectedCash = 10000,
    drops = []
  } = reportData;

  const countedVal = actualCash !== '' ? Number(actualCash) : null;
  const variance = countedVal !== null ? countedVal - expectedCash : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleFinalClose = (e) => {
    e.preventDefault();
    if (countedVal === null) return;
    setIsSubmitting(true);
    const completed = {
      ...reportData,
      actualCash: countedVal,
      variance,
      notes,
      closedAt: new Date().toISOString()
    };
    setZReportComplete(completed);
    if (onConfirmCloseShift) {
      onConfirmCloseShift(countedVal, notes);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
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
        maxWidth: '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '26px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: mode === 'Z' ? 'rgba(225, 29, 72, 0.1)' : 'rgba(43, 124, 255, 0.1)',
              color: mode === 'Z' ? '#e11d48' : '#2B7CFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0a0a0a' }}>
                {mode === 'Z' ? 'End-of-Shift Z-Report' : 'Interim X-Report'}
              </h3>
              <span className="font-mono" style={{ fontSize: '11px', color: '#737373' }}>
                {shiftId} · Cashier: {cashierName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#f5f5f5',
                border: '1px solid #e5e5e5',
                padding: '6px 10px',
                borderRadius: '8px',
                color: '#525252',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#737373', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Shift Timestamp Info Banner */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontWeight: 600 }}>Shift Opened:</span> {new Date(openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>Reading Time:</span> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Breakdown Table */}
        <div style={{ border: '1px solid #e5e5e5', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '12px 16px', background: '#fafafa', borderBottom: '1px solid #e5e5e5', fontSize: '12px', fontWeight: 800, color: '#404040', textTransform: 'uppercase' }}>
            Cash Drawer Breakdown
          </div>

          <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
            <span style={{ color: '#525252' }}>Opening Float</span>
            <strong className="font-mono">{naira(openingFloat)}</strong>
          </div>

          <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
            <span style={{ color: '#525252' }}>+ Cash Sales</span>
            <strong className="font-mono" style={{ color: '#16a34a' }}>+{naira(cashSales)}</strong>
          </div>

          <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
            <span style={{ color: '#525252' }}>- Cash Drops to Safe ({drops.length})</span>
            <strong className="font-mono" style={{ color: '#ea580c' }}>-{naira(cashDrops)}</strong>
          </div>

          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', background: 'rgba(43, 124, 255, 0.05)', fontSize: '14.5px', fontWeight: 800 }}>
            <span style={{ color: '#0a0a0a' }}>Expected Drawer Cash</span>
            <span className="font-mono" style={{ color: '#2B7CFF' }}>{naira(expectedCash)}</span>
          </div>
        </div>

        {/* Digital Payment Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: '#f5f5f5', borderRadius: '12px', padding: '12px' }}>
            <span style={{ fontSize: '11px', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>POS Card Sales</span>
            <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px', color: '#0a0a0a' }}>
              {naira(cardSales)}
            </div>
          </div>
          <div style={{ background: '#f5f5f5', borderRadius: '12px', padding: '12px' }}>
            <span style={{ fontSize: '11px', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>Bank Transfers</span>
            <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px', color: '#0a0a0a' }}>
              {naira(transferSales)}
            </div>
          </div>
        </div>

        {/* Total GMV banner */}
        <div style={{ background: '#0a0a0a', color: '#ffffff', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#a3a3a3', textTransform: 'uppercase', fontWeight: 700 }}>Total Shift Sales</span>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
              {naira(totalSales)}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#a3a3a3' }}>
            All payment methods
          </div>
        </div>

        {/* Mode Z Reconciliation Form */}
        {mode === 'Z' && !zReportComplete && (
          <form onSubmit={handleFinalClose} style={{ borderTop: '2px dashed #e5e5e5', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 10px', color: '#0a0a0a' }}>
              Physical Cash Count & Closeout
            </h4>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#404040', marginBottom: '6px' }}>
                Actual Physical Cash Counted in Drawer (₦)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="Count physical notes and coins..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '18px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  borderRadius: '10px',
                  border: '1.5px solid #2B7CFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                autoFocus
                required
              />
            </div>

            {/* Variance Alert */}
            {countedVal !== null && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: variance === 0 ? 'rgba(22, 163, 74, 0.1)' : variance < 0 ? 'rgba(225, 29, 72, 0.1)' : 'rgba(234, 88, 12, 0.1)',
                color: variance === 0 ? '#16a34a' : variance < 0 ? '#e11d48' : '#ea580c',
                fontSize: '13px',
                fontWeight: 700
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {variance === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{variance === 0 ? 'Exact Match (No Variance)' : variance < 0 ? 'Cash Shortage' : 'Cash Overage'}</span>
                </div>
                <span className="font-mono" style={{ fontSize: '15px' }}>
                  {variance > 0 ? `+${naira(variance)}` : naira(variance)}
                </span>
              </div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#404040', marginBottom: '6px' }}>
                Shift Notes / Variance Explanation (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain any discrepancy or handover instructions..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: '1px solid #d4d4d4',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || actualCash === ''}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: '#e11d48',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)'
              }}
            >
              <ShieldCheck size={18} />
              <span>Finalize Z-Report & Clock Out</span>
            </button>
          </form>
        )}

        {mode === 'Z' && zReportComplete && (
          <div style={{ borderTop: '2px dashed #e5e5e5', paddingTop: '16px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <CheckCircle2 size={24} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px', color: '#0a0a0a' }}>
              Shift Successfully Closed & Audited
            </h4>
            <p style={{ fontSize: '13px', color: '#737373', margin: '0 0 16px' }}>
              Z-Report recorded with variance of {naira(zReportComplete.variance)}.
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: '#0a0a0a',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Close & Return to Sign In
            </button>
          </div>
        )}

        {mode === 'X' && (
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #e5e5e5',
              background: '#ffffff',
              color: '#0a0a0a',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Dismiss X-Report
          </button>
        )}
      </div>
    </div>
  );
}
