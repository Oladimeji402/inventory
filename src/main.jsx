import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { PwaProvider } from './components/PwaProvider';
import './index.css';

if (typeof window !== 'undefined') {
  registerSW({ immediate: true });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PwaProvider>
      <App />
    </PwaProvider>
  </React.StrictMode>
);
