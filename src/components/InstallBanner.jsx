import { useLayoutEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

/** Height of a fixed bottom tab bar on the page (shop, rides, rider), so the banner sits above it. */
function bottomBarHeight() {
  if (typeof document === 'undefined') return 0;
  const bar = document.querySelector('.sh-tabbar, .rider-bottom-nav');
  if (!bar) return 0;
  const style = window.getComputedStyle(bar);
  return style.display === 'none' || style.position !== 'fixed' ? 0 : bar.offsetHeight;
}

/**
 * Small prompt at the bottom of the screen.
 *  - mode "prompt": the browser can install the app directly (Chrome, Edge, Android).
 *  - mode "ios": Safari cannot, so show the Share → Add to Home Screen steps.
 */
export default function InstallBanner({ open, mode, appName, installing, onInstall, onClose }) {
  const [offset, setOffset] = useState(0);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const measure = () => setOffset(bottomBarHeight());
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open]);

  if (!open) return null;

  return (
    <div className="install-banner" role="region" aria-label={`Install ${appName}`} style={{ '--install-offset': `${offset}px` }}>
      <span className="install-banner-icon" aria-hidden="true">
        {mode === 'ios' ? <Share size={18} /> : <Download size={18} />}
      </span>

      <div className="install-banner-text">
        <strong>Install {appName} as an app</strong>
        {mode === 'ios' && (
          <span>
            Tap <Share size={12} aria-hidden="true" className="install-banner-inline" /> <b>Share</b>, then <b>Add to Home Screen</b>
          </span>
        )}
      </div>

      {mode === 'prompt' && (
        <button type="button" className="install-banner-btn" onClick={onInstall} disabled={installing}>
          {installing ? 'Opening…' : 'Install'}
        </button>
      )}

      <button type="button" className="install-banner-close" onClick={onClose} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
