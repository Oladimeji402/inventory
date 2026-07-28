import { CheckCircle2, X } from 'lucide-react';
import { naira, formatTime } from '../lib/format';

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;
  const itemCount = receipt.items.reduce((total, item) => total + item.qty, 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="receipt-modal fade-in" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close">
          <X size={14} />
        </button>
        <div className="receipt-modal-icon">
          <CheckCircle2 size={26} />
        </div>
        <h2>Sale complete</h2>
        <p className="receipt-sub">
          {receipt.id} · {formatTime(receipt.time)}
        </p>
        <div className="receipt-modal-lines">
          <div className="line">
            <span>Customer</span>
            <strong>{receipt.customerName || 'Walk-in Customer'}</strong>
          </div>
          <div className="line">
            <span>Items</span>
            <strong>{itemCount}</strong>
          </div>
          <div className="line">
            <span>Payment</span>
            <strong>{receipt.paymentMethod}</strong>
          </div>
          <div className="line">
            <span>Served by</span>
            <strong>{receipt.employee}</strong>
          </div>
        </div>
        <div className="receipt-modal-total">
          <span>Total paid</span>
          <span>{naira(receipt.total)}</span>
        </div>
        <button className="primary-btn wide" onClick={onClose}>
          Start new sale
        </button>
      </div>
    </div>
  );
}
