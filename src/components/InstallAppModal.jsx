import { Download, X, Smartphone } from 'lucide-react';
import Logo from './Logo';

export default function InstallAppModal({ open, installing, onInstall, onClose }) {
  if (!open) return null;

  return (
    <div className="overlay install-overlay" onClick={onClose}>
      <div
        className="install-modal fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
      >
        <button type="button" className="modal-close" onClick={onClose} title="Close" aria-label="Close">
          <X size={16} />
        </button>

        <div className="install-modal-icon">
          <Logo size={42} />
        </div>

        <h2 id="install-modal-title">Install Counterpoint</h2>
        <p>Add this POS to your home screen for faster launch, fullscreen till mode, and offline sales when the network drops.</p>

        <ul className="install-modal-benefits">
          <li>
            <Smartphone size={14} />
            Opens like a store app
          </li>
          <li>
            <Download size={14} />
            Works even without internet
          </li>
        </ul>

        <div className="install-modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Not now
          </button>
          <button type="button" className="primary-btn" onClick={onInstall} disabled={installing}>
            <Download size={15} />
            {installing ? 'Opening…' : 'Install app'}
          </button>
        </div>
      </div>
    </div>
  );
}
