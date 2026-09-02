import React, { useMemo, useState } from 'react';
import { Plus, Search, Users, Check } from 'lucide-react';
import { formatNaira, countedOrder } from '../../lib/formatMoney';
import DataTable from '../../shared/ui/DataTable';
import Modal from '../../shared/ui/Modal';

const emptyForm = { fullName: '', phone: '', email: '', address: '', notes: '' };

export default function MerchantCustomers({
  customers = [],
  orders = [],
  loading = false,
  canManage = true,
  onSaveCustomer
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rows = useMemo(() => {
    const liveOrders = orders.filter(countedOrder);
    return customers.map((customer) => {
      const customerOrders = liveOrders.filter((order) => order.customerId === customer.id);
      const lifetimeSpend = customerOrders.reduce((sum, order) => sum + order.total, 0);
      const lastOrder = customerOrders[0]; // orders arrive newest-first
      return { ...customer, orderCount: customerOrders.length, lifetimeSpend, lastOrderAgo: lastOrder?.timeAgo || '—' };
    });
  }, [customers, orders]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter((c) =>
      c.fullName.toLowerCase().includes(query) || (c.phone || '').includes(query)
    );
  }, [rows, searchTerm]);

  const closeModal = () => {
    setEditingCustomer(null);
    setIsAddOpen(false);
    setFormData(emptyForm);
    setError('');
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    const result = await onSaveCustomer({ id: editingCustomer?.id, ...formData });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    closeModal();
  };

  const isModalVisible = isAddOpen || editingCustomer !== null;

  return (
    <div>
      <div className="merchant-page-header">
        <h1>Customers</h1>
        <div className="merchant-page-header-actions">
          <div className="merchant-search-wrap" style={{ width: 240 }}>
            <Search size={16} color="var(--mx-text-3)" />
            <input
              type="text"
              className="merchant-search-input"
              placeholder="Search name or phone…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          {canManage && (
            <button className="merchant-btn-primary" onClick={() => setIsAddOpen(true)}>
              <Plus size={15} />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      <div className="mx-card">
        <DataTable
          loading={loading}
          rows={filteredRows}
          onRowClick={canManage ? openEdit : undefined}
          empty={{
            icon: Users,
            title: customers.length === 0 ? 'No customers yet' : 'No matching customers',
            desc: customers.length === 0
              ? 'Customers you add, or who check out on your storefront, will show up here with their order history.'
              : 'Try a different search.'
          }}
          columns={[
            {
              key: 'name',
              header: 'Customer',
              render: (c) => (
                <div>
                  <div style={{ fontWeight: 700 }}>{c.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--mx-text-3)' }}>{c.phone || 'No phone on file'}</div>
                </div>
              )
            },
            { key: 'orders', header: 'Orders', render: (c) => <span className="font-mono">{c.orderCount}</span> },
            { key: 'spend', header: 'Lifetime spend', render: (c) => <span className="font-mono" style={{ fontWeight: 700 }}>{formatNaira(c.lifetimeSpend)}</span> },
            { key: 'last', header: 'Last order', render: (c) => c.lastOrderAgo }
          ]}
        />
      </div>

      <Modal
        open={isModalVisible}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="merchant-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" form="customer-form" className="merchant-btn-primary" disabled={saving}>
              <Check size={14} />
              <span>{saving ? 'Saving…' : 'Save Customer'}</span>
            </button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="merchant-field-group">
            <label className="merchant-field-label">Full name *</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
              className="merchant-field-input"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                className="merchant-field-input font-mono"
                placeholder="+234…"
              />
            </div>
            <div className="merchant-field-group">
              <label className="merchant-field-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                className="merchant-field-input"
              />
            </div>
          </div>
          <div className="merchant-field-group">
            <label className="merchant-field-label">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(event) => setFormData({ ...formData, address: event.target.value })}
              className="merchant-field-input"
            />
          </div>
          <div className="merchant-field-group">
            <label className="merchant-field-label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              className="merchant-field-textarea"
              rows={3}
            />
          </div>
          {error && <div className="merchant-form-error">{error}</div>}
        </form>
      </Modal>
    </div>
  );
}
