import { ClipboardList, Receipt } from 'lucide-react';
import { naira, formatTime } from '../lib/format';

export default function ReportsTab({
  sales,
  auditLog,
  lowStockCount,
  role,
  canSell,
  canVoid,
  canManageInventory,
  maxDiscount,
  pendingVoidId,
  onRequestVoid,
  onCancelVoid,
  onConfirmVoid
}) {
  const revenue = sales.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="reports-grid">
      <section className="panel">
        <div className="section-title">
          <ClipboardList size={16} />
          <h2>Performance summary</h2>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <span>Revenue</span>
            <strong className="mono">{naira(revenue)}</strong>
          </div>
          <div className="stat-card">
            <span>Transactions</span>
            <strong className="mono">{sales.length}</strong>
          </div>
          <div className="stat-card">
            <span>Low stock</span>
            <strong className="mono">{lowStockCount}</strong>
          </div>
          <div className="stat-card">
            <span>Active role</span>
            <strong>{role}</strong>
          </div>
        </div>

        <div className="policy-list compact">
          <div className="policy-item">
            <div className="policy-head">
              <strong>Current role permissions</strong>
              <span>{role}</span>
            </div>
            <ul>
              <li>Sell items: {canSell ? 'Allowed' : 'Blocked'}</li>
              <li>Void sales: {canVoid ? 'Allowed' : 'Blocked'}</li>
              <li>Manage inventory: {canManageInventory ? 'Allowed' : 'Blocked'}</li>
              <li>Max discount: {maxDiscount}%</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <ClipboardList size={16} />
          <h2>Recent activity</h2>
        </div>
        <div className="activity-list">
          {auditLog.length === 0 && <p className="helper">No activity yet.</p>}
          {auditLog.map((entry, index) => (
            <div key={`${entry.text}-${index}`} className="activity-item">
              <span className="mono">{formatTime(entry.time)}</span>
              <p>{entry.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <Receipt size={16} />
          <h2>Recent sales</h2>
        </div>
        <div className="activity-list">
          {sales.length === 0 && <p className="helper">No completed sales yet.</p>}
          {sales.slice(0, 5).map((sale) => (
            <div key={sale.id} className="activity-item">
              <div className="activity-item-head">
                <strong className="mono">{sale.id}</strong>
                <span className="mono">{naira(sale.total)}</span>
              </div>
              <p>
                {sale.customerName || 'Walk-in Customer'} · {sale.paymentMethod}
              </p>
              <div className="activity-actions">
                <span className="mono">{formatTime(sale.time)}</span>
                {canVoid &&
                  (pendingVoidId === sale.id ? (
                    <div className="confirm-inline">
                      <span>Void this sale?</span>
                      <button className="danger-btn" onClick={() => onConfirmVoid(sale.id)}>
                        Confirm void
                      </button>
                      <button className="link-btn" onClick={onCancelVoid}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="link-btn" onClick={() => onRequestVoid(sale.id)}>
                      Void sale
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
