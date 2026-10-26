import React, { useState } from 'react';
import { 
  X, 
  Truck, 
  Search, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Phone, 
  Store, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { MOCK_ORDERS } from './marketplaceData';

export default function MarketplaceOrderTrackingModal({
  isOpen,
  onClose,
  initialOrderId = 'NC-9842'
}) {
  const [orderQuery, setOrderQuery] = useState(initialOrderId);
  const [selectedOrder, setSelectedOrder] = useState(MOCK_ORDERS[initialOrderId] || MOCK_ORDERS['NC-9842']);
  const [notFound, setNotFound] = useState(false);

  if (!isOpen) return null;

  function handleSearchOrder(e) {
    e.preventDefault();
    const cleanId = orderQuery.trim().toUpperCase();
    if (MOCK_ORDERS[cleanId]) {
      setSelectedOrder(MOCK_ORDERS[cleanId]);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  }

  function handleSelectSample(orderId) {
    setOrderQuery(orderId);
    setSelectedOrder(MOCK_ORDERS[orderId]);
    setNotFound(false);
  }

  return (
    <div className="mp-modal-backdrop" onClick={onClose}>
      <div className="mp-tracking-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mp-modal-header">
          <div className="mp-drawer-title-group">
            <Truck size={20} className="text-blue-500" />
            <h3 className="mp-drawer-title">Live Courier Order Tracker</h3>
          </div>
          <button type="button" className="mp-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search bar & Demo buttons */}
        <div className="mp-tracking-search-bar">
          <form className="mp-tracking-form" onSubmit={handleSearchOrder}>
            <div className="mp-tracking-input-wrap">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Enter Order Reference (e.g. NC-9842)"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                className="mp-tracking-input"
              />
            </div>
            <button type="submit" className="mp-tracking-submit-btn">
              Track Order
            </button>
          </form>

          {/* Quick Demo links */}
          <div className="mp-tracking-demos">
            <span className="mp-tracking-demo-label">Demo Active Orders:</span>
            <button
              type="button"
              className={`mp-demo-chip ${selectedOrder?.id === 'NC-9842' ? 'active' : ''}`}
              onClick={() => handleSelectSample('NC-9842')}
            >
              NC-9842 (In Transit · 6m)
            </button>
            <button
              type="button"
              className={`mp-demo-chip ${selectedOrder?.id === 'NC-7215' ? 'active' : ''}`}
              onClick={() => handleSelectSample('NC-7215')}
            >
              NC-7215 (Delivered)
            </button>
          </div>
        </div>

        {/* Order Details Body */}
        {notFound ? (
          <div className="mp-tracking-not-found">
            <AlertCircle size={36} className="text-amber-500" />
            <h4>Order Reference Not Found</h4>
            <p>Please verify the reference code sent via WhatsApp or SMS, or click one of the demo order buttons above.</p>
          </div>
        ) : selectedOrder && (
          <div className="mp-tracking-content">
            {/* Top Summary Banner */}
            <div className="mp-tracking-summary-card">
              <div className="mp-summary-left">
                <span className="mp-summary-order-badge">Reference: {selectedOrder.id}</span>
                <h4 className="mp-summary-store">{selectedOrder.storeName}</h4>
                <div className="mp-summary-items">
                  Items: {selectedOrder.items.join(', ')}
                </div>
              </div>
              <div className="mp-summary-right">
                <div className="mp-summary-eta-badge">
                  <Clock size={14} />
                  <span>{selectedOrder.eta}</span>
                </div>
                <div className="mp-summary-total">Total: {selectedOrder.total}</div>
              </div>
            </div>

            {/* Courier Rider Card */}
            <div className="mp-courier-assigned-card">
              <div className="mp-courier-avatar">
                <Truck size={20} />
              </div>
              <div className="mp-courier-info">
                <div className="mp-courier-name">{selectedOrder.courierName}</div>
                <div className="mp-courier-phone">
                  <Phone size={12} />
                  <span>{selectedOrder.courierPhone}</span>
                </div>
              </div>
              <div className="mp-courier-status-pill">
                <span className="mp-green-dot" />
                <span>GPS Radar Connected</span>
              </div>
            </div>

            {/* 4-Stage Timeline */}
            <div className="mp-tracking-timeline">
              {selectedOrder.stages.map((stage, idx) => {
                const isCompleted = idx + 1 <= selectedOrder.step;
                const isCurrent = idx + 1 === selectedOrder.step;

                return (
                  <div key={stage.title} className={`mp-timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="mp-timeline-icon-wrap">
                      {isCompleted ? (
                        <CheckCircle size={16} />
                      ) : (
                        <span className="mp-timeline-num">{idx + 1}</span>
                      )}
                    </div>
                    <div className="mp-timeline-text">
                      <div className="mp-timeline-header">
                        <span className="mp-timeline-title">{stage.title}</span>
                        <span className="mp-timeline-time">{stage.time}</span>
                      </div>
                      <p className="mp-timeline-desc">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Escrow Guarantee Note */}
            <div className="mp-tracking-escrow-note">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Doorstep Escrow Security: Do not release handover PIN until your package seal is inspected.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
