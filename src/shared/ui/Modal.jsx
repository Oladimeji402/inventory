import { X } from 'lucide-react';

export default function Modal({ open, title, onClose, footer, children, width }) {
  if (!open) return null;

  return (
    <div className="merchant-modal-overlay" onClick={onClose}>
      <div
        className="merchant-modal-box"
        style={width ? { maxWidth: width } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="merchant-modal-header">
          <h3 className="merchant-modal-title">{title}</h3>
          <button
            type="button"
            className="merchant-btn-secondary"
            style={{ padding: 6 }}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="merchant-modal-body">{children}</div>
        {footer && <div className="merchant-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
