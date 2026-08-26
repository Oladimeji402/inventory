import { CheckCircle2, Printer, X, ShoppingBag, HardDrive } from 'lucide-react';
import { naira, formatTime } from '../lib/format';

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;
  const itemCount = receipt.items.reduce((total, item) => total + item.qty, 0);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="receipt-modal fade-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Sale Receipt">
        <button className="modal-close no-print" onClick={onClose} title="Close">
          <X size={16} />
        </button>

        <div className="receipt-paper" id="printable-receipt">
          <div className="receipt-header">
            <div className="receipt-store-brand">
              <ShoppingBag size={20} className="receipt-brand-icon" />
              <h3>COUNTERPOINT RETAIL</h3>
            </div>
            <p className="receipt-sub-heading">Sales Receipt &amp; Customer Invoice</p>
            <div className="receipt-meta-grid mono">
              <div>
                <span>Receipt:</span>
                <strong>{receipt.id}</strong>
              </div>
              <div>
                <span>Date/Time:</span>
                <strong>{formatTime(receipt.time)}</strong>
              </div>
              <div>
                <span>Cashier:</span>
                <strong>
                  {receipt.employee} ({receipt.role})
                </strong>
              </div>
              <div>
                <span>Customer:</span>
                <strong>{receipt.customerName || 'Walk-in Customer'}</strong>
              </div>
              <div>
                <span>Payment:</span>
                <strong>{receipt.paymentMethod}</strong>
              </div>
            </div>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-items-table">
            <div className="receipt-items-head mono">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Total</span>
            </div>
            <div className="receipt-items-body">
              {receipt.items.map((item) => (
                <div key={item.id} className="receipt-item-row">
                  <div className="receipt-item-desc">
                    <strong>{item.name}</strong>
                    <span className="mono receipt-sku">{item.id}</span>
                  </div>
                  <span className="mono text-center">{item.qty}</span>
                  <span className="mono text-right">{naira(item.price)}</span>
                  <span className="mono text-right font-bold">{naira(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-summary mono">
            <div className="summary-line">
              <span>
                Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
              <span>{naira(receipt.subtotal)}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="summary-line discount">
                <span>Discount ({receipt.discountPct || 0}%)</span>
                <span>- {naira(receipt.discount)}</span>
              </div>
            )}
            <div className="summary-line grand-total-line">
              <strong>TOTAL PAID</strong>
              <strong>{naira(receipt.total)}</strong>
            </div>

            {receipt.paymentMethod === 'Cash' && typeof receipt.amountTendered === 'number' && (
              <>
                <div className="summary-line tender-line">
                  <span>Cash tendered:</span>
                  <span>{naira(receipt.amountTendered)}</span>
                </div>
                <div className="summary-line change-line">
                  <strong>Change given:</strong>
                  <strong className="change-text">{naira(receipt.changeDue || 0)}</strong>
                </div>
              </>
            )}
          </div>

          {receipt.savedOffline && (
            <div className="receipt-offline-note no-print">
              <HardDrive size={14} />
              <span>Saved on this till while offline. Sale is safe — no network needed.</span>
            </div>
          )}

          <div className="receipt-divider" />

          <div className="receipt-footer">
            <p className="receipt-thanks">Thank you for your patronage!</p>
            <p className="receipt-policy">Goods sold in good condition are covered by store policy.</p>
            <p className="receipt-powered mono">Powered by Counterpoint POS</p>
          </div>
        </div>

        <div className="receipt-modal-actions no-print">
          <button type="button" className="secondary-btn print-btn" onClick={handlePrint}>
            <Printer size={16} />
            Print receipt
          </button>
          <button type="button" className="primary-btn new-sale-btn" onClick={onClose}>
            <CheckCircle2 size={16} />
            Start new sale
          </button>
        </div>
      </div>
    </div>
  );
}
