import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, danger: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, tone = 'info', duration = 3200) => {
    const id = ++idRef.current;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="mx-toast-stack" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone] || Info;
          return (
            <div key={toast.id} className={`mx-toast ${toast.tone}`}>
              <Icon size={15} />
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return showToast;
}
