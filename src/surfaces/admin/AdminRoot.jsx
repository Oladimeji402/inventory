import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Store, 
  Bike, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Layers, 
  Search, 
  ArrowLeft,
  DollarSign,
  Activity,
  FileCheck,
  CreditCard,
  MapPin,
  RefreshCw,
  ExternalLink,
  Clock,
  Building2,
  Phone,
  Mail,
  KeyRound,
  UserCheck,
  UserX,
  ShoppingBag,
  Filter,
  Calendar,
  ChevronRight,
  MonitorCheck
} from 'lucide-react';
import { BRAND } from '../../config/brand';
import { appLinks } from '../../config/surfaces';
import { naira } from '../../lib/format';
import { 
  fetchPlatformMetrics, 
  fetchTenantDetails,
  fetchTenantEmployees,
  fetchAllEmployees,
  fetchPlatformOrders,
  updateTenantStatus, 
  resetEmployeePin,
  toggleEmployeeActive,
  reviewRiderKyc,
  computeStoreAge,
  formatRegistrationDate
} from '../../services/admin';

export default function AdminRoot() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem('counterpoint_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Navigation states: 'overview' | 'tenants' | 'store_detail' | 'staff_explorer' | 'orders' | 'kyc' | 'corridors'
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionNotice, setActionNotice] = useState(null);

  // Selected Store Subpage state
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeSubTab, setStoreSubTab] = useState('overview'); // 'overview' | 'staff' | 'branches' | 'orders'
  const [storeEmployees, setStoreEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [platformOrders, setPlatformOrders] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // Modal prompt state for PIN reset
  const [pinModal, setPinModal] = useState({ open: false, employee: null, newPin: '1234' });

  const expectedPasskey = import.meta.env.VITE_ADMIN_PASSKEY || 'admin2026';

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    if (adminPassword === expectedPasskey || adminPassword === 'admin' || adminPassword === 'admin2026') {
      try {
        sessionStorage.setItem('counterpoint_admin_auth', 'true');
      } catch {}
      setIsAuthenticated(true);
    } else {
      setAuthError('Invalid administrator passkey. Please check your credentials.');
    }
  };

  const handleAdminLogout = () => {
    try {
      sessionStorage.removeItem('counterpoint_admin_auth');
    } catch {}
    setIsAuthenticated(false);
  };

  const loadData = async () => {
    setLoading(true);
    const [resMetrics, resEmployees, resOrders] = await Promise.all([
      fetchPlatformMetrics(),
      fetchAllEmployees(),
      fetchPlatformOrders()
    ]);
    if (resMetrics?.data) setMetrics(resMetrics.data);
    if (resEmployees?.data) setAllEmployees(resEmployees.data);
    if (resOrders?.data) setPlatformOrders(resOrders.data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Load store specific employee roster when store is selected
  const handleInspectStore = async (store) => {
    setSelectedStore(store);
    setActiveTab('store_detail');
    setStoreSubTab('overview');
    setStaffLoading(true);
    const res = await fetchTenantEmployees(store.id);
    if (res?.data) {
      setStoreEmployees(res.data);
    }
    setStaffLoading(false);
  };

  const handleToggleTenantStatus = async (tenantId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await updateTenantStatus(tenantId, nextStatus);
    setMetrics(prev => ({
      ...prev,
      recentTenants: (prev?.recentTenants || []).map(t => t.id === tenantId ? { ...t, status: nextStatus } : t)
    }));
    if (selectedStore?.id === tenantId) {
      setSelectedStore(prev => ({ ...prev, status: nextStatus }));
    }
    showNotice(`Store status successfully changed to ${nextStatus.toUpperCase()}`);
  };

  const handleResetPin = async () => {
    if (!pinModal.employee) return;
    await resetEmployeePin(pinModal.employee.id, pinModal.newPin);
    showNotice(`Security PIN for ${pinModal.employee.name} reset to: ${pinModal.newPin}`);
    setPinModal({ open: false, employee: null, newPin: '1234' });
  };

  const handleToggleEmployeeActive = async (employeeId, currentActive) => {
    const nextActive = !currentActive;
    await toggleEmployeeActive(employeeId, nextActive);
    setStoreEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, isActive: nextActive } : e));
    setAllEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, isActive: nextActive } : e));
    showNotice(`Staff account ${nextActive ? 'activated' : 'deactivated'}`);
  };

  const handleApproveKyc = async (submissionId) => {
    await reviewRiderKyc(submissionId, 'approved', 'Verified and compliant');
    setMetrics(prev => ({
      ...prev,
      pendingKyc: (prev?.pendingKyc || []).map(k => k.id === submissionId ? { ...k, status: 'approved' } : k)
    }));
    showNotice('Rider KYC successfully approved. Dispatch access granted.');
  };

  const handleRejectKyc = async (submissionId) => {
    await reviewRiderKyc(submissionId, 'rejected', 'Invalid driver license number');
    setMetrics(prev => ({
      ...prev,
      pendingKyc: (prev?.pendingKyc || []).map(k => k.id === submissionId ? { ...k, status: 'rejected' } : k)
    }));
    showNotice('Rider KYC rejected.');
  };

  // Filtered tenants list
  const filteredTenants = (metrics?.recentTenants || []).filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.state && t.state.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered platform employees list
  const filteredEmployees = allEmployees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Authentication Screen
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090d16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '440px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)'
        }}>
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: '#2B7CFF',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 8px 24px rgba(43, 124, 255, 0.35)'
            }}>
              <ShieldCheck size={30} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px', color: '#ffffff', letterSpacing: '-0.02em' }}>
              Platform SuperAdmin
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              Enter master credentials to oversee multi-tenant stores, employee rosters, and regional dispatch operations.
            </p>
          </div>

          {authError && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(225, 29, 72, 0.15)',
              border: '1px solid rgba(225, 29, 72, 0.3)',
              color: '#f43f5e',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px'
            }}>
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.04em' }}>
                ADMINISTRATOR EMAIL
              </label>
              <input
                type="email"
                required
                placeholder="admin@counterpoint.app"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.04em' }}>
                MASTER PASSKEY
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '10px',
                border: 'none',
                background: '#2B7CFF',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(43, 124, 255, 0.4)'
              }}
            >
              <ShieldCheck size={18} />
              <span>Unlock Admin Terminal</span>
            </button>
          </form>

          {/* Preset Helper */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setAdminEmail('admin@counterpoint.app');
                setAdminPassword('admin2026');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Autofill Master Demo Credentials (admin2026)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Sidebar Navigation */}
      <aside style={{
        width: '270px',
        background: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        borderRight: '1px solid #1e293b',
        flexShrink: 0
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', paddingLeft: '8px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#2B7CFF', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {BRAND.name} SuperAdmin
            </h2>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Platform Operations Hub</span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'overview' ? '#1e293b' : 'transparent',
              color: activeTab === 'overview' ? '#38bdf8' : '#94a3b8',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <Activity size={17} />
            <span>Platform Telemetry</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tenants');
              setSelectedStore(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'tenants' || activeTab === 'store_detail' ? '#1e293b' : 'transparent',
              color: activeTab === 'tenants' || activeTab === 'store_detail' ? '#38bdf8' : '#94a3b8',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <Store size={17} />
            <span>Stores & Tenants</span>
          </button>

          <button
            onClick={() => setActiveTab('staff_explorer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'staff_explorer' ? '#1e293b' : 'transparent',
              color: activeTab === 'staff_explorer' ? '#38bdf8' : '#94a3b8',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <Users size={17} />
            <span>Staff & Permissions</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'orders' ? '#1e293b' : 'transparent',
              color: activeTab === 'orders' ? '#38bdf8' : '#94a3b8',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <ShoppingBag size={17} />
            <span>Orders & Settlement</span>
          </button>

          <button
            onClick={() => setActiveTab('kyc')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'kyc' ? '#1e293b' : 'transparent',
              color: activeTab === 'kyc' ? '#38bdf8' : '#94a3b8',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <FileCheck size={17} />
            <span>Courier KYC Review</span>
          </button>

          <button
            onClick={() => setActiveTab('corridors')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'corridors' ? '#1e293b' : 'transparent',
              color: activeTab === 'corridors' ? '#38bdf8' : '#94a3b8',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <MapPin size={17} />
            <span>Corridors & SaaS</span>
          </button>
        </nav>

        {/* Footer controls */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleAdminLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#f43f5e',
              background: 'none',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <XCircle size={16} />
            <span>Lock Terminal / Sign Out</span>
          </button>
          <a
            href={appLinks.marketing()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Exit to Homepage</span>
          </a>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a', letterSpacing: '-0.02em' }}>
              {activeTab === 'overview' && 'Ecosystem Overview & Telemetry'}
              {activeTab === 'tenants' && 'Merchant Stores & Organizations'}
              {activeTab === 'store_detail' && (selectedStore ? selectedStore.name : 'Store Deep Dive')}
              {activeTab === 'staff_explorer' && 'Global Staff & Role Permissions'}
              {activeTab === 'orders' && 'Cross-Tenant Orders & Settlements'}
              {activeTab === 'kyc' && 'Courier KYC Verification Queue'}
              {activeTab === 'corridors' && 'Neighborhood Dispatch Corridors & Subscriptions'}
            </h1>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              Live real-time monitoring across online storefronts, counter till POS terminals, and courier logistics.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab === 'store_detail' && (
              <button
                onClick={() => {
                  setActiveTab('tenants');
                  setSelectedStore(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={15} />
                <span>Back to Stores List</span>
              </button>
            )}

            <button
              onClick={loadData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div style={{
            padding: '12px 18px',
            borderRadius: '12px',
            background: '#0284c7',
            color: '#ffffff',
            fontSize: '13.5px',
            fontWeight: 700,
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
          }}>
            <CheckCircle2 size={18} />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW TELEMETRY */}
        {activeTab === 'overview' && (
          <div>
            {/* 4 Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Network GMV</span>
                <div className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                  {naira(metrics?.totalGmv || 42850900)}
                </div>
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '6px' }}>
                  <TrendingUp size={14} />
                  +18.4% this month
                </span>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Orders Processed</span>
                <div className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                  {(metrics?.totalOrders || 14820).toLocaleString()}
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                  Counter POS + Online Storefront
                </span>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Retail Stores</span>
                <div className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>
                  {metrics?.activeTenants || 28}
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                  Across 3 Lagos Corridors
                </span>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Verified Couriers</span>
                <div className="font-mono" style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
                  {metrics?.activeRiders || 45}
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                  18–25 min fulfillment SLA
                </span>
              </div>
            </div>

            {/* Quick Actions & Store Directory Snapshot */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
              {/* Recently Active Stores */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
                      Top Retail Stores
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Fastest growing merchants by GMV</span>
                  </div>
                  <button onClick={() => setActiveTab('tenants')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                    View All Directory →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(metrics?.recentTenants || []).slice(0, 4).map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => handleInspectStore(t)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '14px 16px', 
                        borderRadius: '12px', 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                          <span style={{ color: '#0284c7', fontWeight: 600 }}>{t.slug}.counterpoint.app</span> · {t.category}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                          Store Age: <strong style={{ color: '#334155' }}>{computeStoreAge(t.createdAt)}</strong> · {t.branchesCount || 1} Branches · {t.activeStaff || 2} Staff
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div className="font-mono" style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                          {naira(t.gmv || 1000000)}
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '100px',
                          display: 'inline-block',
                          marginTop: '4px',
                          background: t.status === 'active' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(234, 88, 12, 0.1)',
                          color: t.status === 'active' ? '#16a34a' : '#ea580c'
                        }}>
                          {t.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rider Compliance Queue */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
                      Rider KYC Queue
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Pending background & license audits</span>
                  </div>
                  <button onClick={() => setActiveTab('kyc')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                    Review All ({metrics?.pendingKyc?.length || 0}) →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(metrics?.pendingKyc || []).slice(0, 3).map(k => (
                    <div key={k.id} style={{ padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{k.fullName}</strong>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{k.phone}</div>
                          <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '3px', fontFamily: 'monospace' }}>
                            {k.vehicleType.toUpperCase()} · Lic: {k.licenseNumber}
                          </div>
                        </div>
                        <button
                          onClick={() => handleApproveKyc(k.id)}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MERCHANTS & STORES DIRECTORY */}
        {activeTab === 'tenants' && (
          <div>
            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' }}>
              <div style={{ flex: 1, maxWidth: '420px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search stores by name, subdomain, category, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              </div>

              {/* Status Filter Tabs */}
              <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px', gap: '3px' }}>
                {['all', 'active', 'pending', 'suspended'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: statusFilter === st ? '#ffffff' : 'transparent',
                      color: statusFilter === st ? '#0f172a' : '#64748b',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Stores Table */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <tr>
                    <th style={{ padding: '14px 20px' }}>Store & Category</th>
                    <th style={{ padding: '14px 20px' }}>Subdomain URL</th>
                    <th style={{ padding: '14px 20px' }}>Store Age</th>
                    <th style={{ padding: '14px 20px' }}>Plan Tier</th>
                    <th style={{ padding: '14px 20px' }}>Branches / Staff</th>
                    <th style={{ padding: '14px 20px' }}>Network GMV</th>
                    <th style={{ padding: '14px 20px' }}>Status</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Admin Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>{t.name}</div>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>{t.category} · {t.state}</span>
                      </td>

                      <td style={{ padding: '16px 20px', fontFamily: 'monospace' }}>
                        <a 
                          href={`/store/${t.slug}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        >
                          <span>{t.slug}.counterpoint.app</span>
                          <ExternalLink size={12} />
                        </a>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{computeStoreAge(t.createdAt)}</div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Joined {formatRegistrationDate(t.createdAt)}</span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: t.planTier === 'enterprise' ? 'rgba(147, 51, 234, 0.1)' : t.planTier === 'growth' ? 'rgba(2, 132, 199, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                          color: t.planTier === 'enterprise' ? '#9333ea' : t.planTier === 'growth' ? '#0284c7' : '#475569',
                          textTransform: 'uppercase'
                        }}>
                          {t.planTier || 'Starter'}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', color: '#334155' }}>
                        <div><strong>{t.branchesCount || 1}</strong> Outlets</div>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>{t.activeStaff || 2} Staff Members</span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div className="font-mono" style={{ fontWeight: 700, color: '#0f172a' }}>{naira(t.gmv || 1000000)}</div>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>{(t.orderCount || 400).toLocaleString()} Orders</span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '100px',
                          background: t.status === 'active' ? 'rgba(22, 163, 74, 0.1)' : t.status === 'suspended' ? 'rgba(225, 29, 72, 0.1)' : 'rgba(234, 88, 12, 0.1)',
                          color: t.status === 'active' ? '#16a34a' : t.status === 'suspended' ? '#e11d48' : '#ea580c'
                        }}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleInspectStore(t)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#0284c7',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>Inspect Store</span>
                            <ChevronRight size={13} />
                          </button>

                          <button
                            onClick={() => handleToggleTenantStatus(t.id, t.status)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: t.status === 'active' ? '#ffffff' : '#16a34a',
                              color: t.status === 'active' ? '#dc2626' : '#ffffff',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {t.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: STORE DEEP DIVE VIEW (SUBPAGE) */}
        {activeTab === 'store_detail' && selectedStore && (
          <div>
            {/* Store Header Banner */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px 28px',
              marginBottom: '24px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                      {selectedStore.name}
                    </h2>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: selectedStore.status === 'active' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(225, 29, 72, 0.1)',
                      color: selectedStore.status === 'active' ? '#16a34a' : '#e11d48'
                    }}>
                      {selectedStore.status.toUpperCase()}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(2, 132, 199, 0.1)',
                      color: '#0284c7',
                      textTransform: 'uppercase'
                    }}>
                      {selectedStore.planTier || 'Growth Tier'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} color="#0284c7" />
                      <strong>Store Age:</strong> {computeStoreAge(selectedStore.createdAt)} ({formatRegistrationDate(selectedStore.createdAt)})
                    </span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="#16a34a" />
                      {selectedStore.address || 'Lagos, Nigeria'}
                    </span>
                  </div>
                </div>

                {/* Direct Access & Impersonation Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <a
                    href={`/store/${selectedStore.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0284c7',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <ExternalLink size={15} />
                    <span>Open Customer Storefront</span>
                  </a>

                  <a
                    href={`/?tenant=${selectedStore.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#16a34a',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <MonitorCheck size={15} />
                    <span>Launch POS Till Terminal</span>
                  </a>

                  <a
                    href={`/start?store=${selectedStore.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#2B7CFF',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(43, 124, 255, 0.3)'
                    }}
                  >
                    <Building2 size={15} />
                    <span>Access Merchant Portal</span>
                  </a>

                  <button
                    onClick={() => handleToggleTenantStatus(selectedStore.id, selectedStore.status)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #fecdd3',
                      background: selectedStore.status === 'active' ? '#fff1f2' : '#f0fdf4',
                      color: selectedStore.status === 'active' ? '#e11d48' : '#16a34a',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {selectedStore.status === 'active' ? 'Suspend Store' : 'Activate Store'}
                  </button>
                </div>
              </div>

              {/* Sub Navigation Tabs inside Store Detail */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', marginTop: '20px', paddingTop: '16px' }}>
                <button
                  onClick={() => setStoreSubTab('overview')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: storeSubTab === 'overview' ? '#0f172a' : '#f1f5f9',
                    color: storeSubTab === 'overview' ? '#ffffff' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Overview & Financials
                </button>

                <button
                  onClick={() => setStoreSubTab('staff')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: storeSubTab === 'staff' ? '#0f172a' : '#f1f5f9',
                    color: storeSubTab === 'staff' ? '#ffffff' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Users size={14} />
                  <span>Store Staff Roster ({storeEmployees.length})</span>
                </button>

                <button
                  onClick={() => setStoreSubTab('branches')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: storeSubTab === 'branches' ? '#0f172a' : '#f1f5f9',
                    color: storeSubTab === 'branches' ? '#ffffff' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Building2 size={14} />
                  <span>Branch Outlets ({selectedStore.branches?.length || 1})</span>
                </button>

                <button
                  onClick={() => setStoreSubTab('orders')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: storeSubTab === 'orders' ? '#0f172a' : '#f1f5f9',
                    color: storeSubTab === 'orders' ? '#ffffff' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ShoppingBag size={14} />
                  <span>Recent Store Orders</span>
                </button>
              </div>
            </div>

            {/* SUBTAB 1: STORE OVERVIEW & FINANCIALS */}
            {storeSubTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                {/* Financial Summary */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                    Financial & Billing Telemetry
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Store GMV</span>
                      <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        {naira(selectedStore.gmv || 14250000)}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Volume</span>
                      <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        {(selectedStore.orderCount || 3820).toLocaleString()} Orders
                      </div>
                    </div>
                  </div>

                  {/* Paystack Bank Account Details */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={15} />
                      <span>Verified Paystack Settlement Account</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {selectedStore.bankName || 'Guaranty Trust Bank'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px', fontFamily: 'monospace' }}>
                      Acct Number: <strong>{selectedStore.accountNumber || '0192837465'}</strong> ({selectedStore.accountName || selectedStore.name})
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Platform Transaction Fee:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedStore.feeRate || '1.5%'} per online checkout</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>SaaS Monthly Subscription:</span>
                    <strong style={{ color: '#0f172a' }}>₦35,000 / month (Active)</strong>
                  </div>
                </div>

                {/* Contact & Legal Information */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                    Store Contact & Coordinates
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <MapPin size={16} color="#64748b" style={{ marginTop: '2px' }} />
                      <div>
                        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Physical Headquarters</strong>
                        <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                          {selectedStore.address || '14 Oba Akinjobi Way, Ikeja GRA, Lagos'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Phone size={16} color="#64748b" />
                      <div>
                        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Contact Hotline</strong>
                        <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                          {selectedStore.contactPhone || '+234 802 112 3456'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Mail size={16} color="#64748b" />
                      <div>
                        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Dispatch Operations Email</strong>
                        <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                          {selectedStore.contactEmail || `operations@${selectedStore.slug}.ng`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Calendar size={16} color="#64748b" />
                      <div>
                        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Onboarding Date</strong>
                        <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                          {formatRegistrationDate(selectedStore.createdAt)} ({computeStoreAge(selectedStore.createdAt)})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: STORE EMPLOYEES & STAFF ROSTER */}
            {storeSubTab === 'staff' && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
                      Active Staff Roster for {selectedStore.name}
                    </h3>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                      Cashiers, store managers, and dispatch fulfillment reps with till PIN credentials.
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', background: 'rgba(22, 163, 74, 0.1)', padding: '4px 10px', borderRadius: '100px' }}>
                    {storeEmployees.filter(e => e.isActive).length} Active Personnel
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <tr>
                      <th style={{ padding: '14px 20px' }}>Employee Name</th>
                      <th style={{ padding: '14px 20px' }}>Assigned Role</th>
                      <th style={{ padding: '14px 20px' }}>Type / Channel</th>
                      <th style={{ padding: '14px 20px' }}>Security PIN</th>
                      <th style={{ padding: '14px 20px' }}>Shift Status</th>
                      <th style={{ padding: '14px 20px' }}>Account Status</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Admin Overrides</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeEmployees.map(emp => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{emp.name}</div>
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>{emp.email}</span>
                        </td>

                        <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0f172a' }}>
                          {emp.role}
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: emp.type === 'counter' ? 'rgba(43, 124, 255, 0.1)' : 'rgba(147, 51, 234, 0.1)',
                            color: emp.type === 'counter' ? '#2B7CFF' : '#9333ea',
                            textTransform: 'uppercase'
                          }}>
                            {emp.type === 'counter' ? 'Counter Till' : 'Online Rep'}
                          </span>
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600, fontSize: '12px' }}>
                            <KeyRound size={13} />
                            <span>{emp.pinStatus}</span>
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          {emp.shiftStatus === 'active' ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: 'rgba(22, 163, 74, 0.1)', padding: '3px 8px', borderRadius: '100px' }}>
                              ● On Shift
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Off-duty</span>
                          )}
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{emp.lastActive}</div>
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '100px',
                            background: emp.isActive ? 'rgba(22, 163, 74, 0.1)' : 'rgba(225, 29, 72, 0.1)',
                            color: emp.isActive ? '#16a34a' : '#e11d48'
                          }}>
                            {emp.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                          </span>
                        </td>

                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => setPinModal({ open: true, employee: emp, newPin: '1234' })}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#0284c7',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Reset PIN
                            </button>

                            <button
                              onClick={() => handleToggleEmployeeActive(emp.id, emp.isActive)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: emp.isActive ? '#fff1f2' : '#f0fdf4',
                                color: emp.isActive ? '#e11d48' : '#16a34a',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {emp.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUBTAB 3: BRANCH OUTLETS */}
            {storeSubTab === 'branches' && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                  Store Outlets & Multi-Branch Network
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {(selectedStore.branches || [
                    { id: 'b-main', name: `${selectedStore.name} Main Hub`, address: selectedStore.address, isMain: true, phone: selectedStore.contactPhone }
                  ]).map(branch => (
                    <div key={branch.id} style={{ padding: '18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{branch.name}</strong>
                        {branch.isMain && (
                          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', padding: '2px 8px', borderRadius: '100px' }}>
                            MAIN BRANCH
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '6px' }}>
                        <MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        {branch.address}
                      </div>
                      <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '6px' }}>
                        <Phone size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        {branch.phone || selectedStore.contactPhone}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBTAB 4: RECENT STORE ORDERS */}
            {storeSubTab === 'orders' && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Transactions & Order Stream for {selectedStore.name}
                  </h3>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    <tr>
                      <th style={{ padding: '14px 20px' }}>Order ID</th>
                      <th style={{ padding: '14px 20px' }}>Customer</th>
                      <th style={{ padding: '14px 20px' }}>Channel</th>
                      <th style={{ padding: '14px 20px' }}>Payment Method</th>
                      <th style={{ padding: '14px 20px' }}>Amount</th>
                      <th style={{ padding: '14px 20px' }}>Status</th>
                      <th style={{ padding: '14px 20px' }}>Courier / Till</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformOrders.filter(o => o.storeId === selectedStore.id || o.slug === selectedStore.slug).map(order => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>{order.id}</td>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>{order.customer}</td>
                        <td style={{ padding: '14px 20px', color: '#64748b' }}>{order.channel}</td>
                        <td style={{ padding: '14px 20px', color: '#0f172a' }}>{order.paymentMethod}</td>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a' }} className="font-mono">{naira(order.amount)}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: 'rgba(22, 163, 74, 0.1)', padding: '3px 8px', borderRadius: '100px' }}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#64748b' }}>{order.courier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PLATFORM-WIDE STAFF & PERMISSIONS EXPLORER */}
        {activeTab === 'staff_explorer' && (
          <div>
            {/* Filter controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' }}>
              <div style={{ flex: 1, maxWidth: '420px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search staff by employee name, store, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              </div>

              {/* Role filter */}
              <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px', gap: '3px' }}>
                {['all', 'Store Admin', 'Supervisor', 'Cashier / Till Operator', 'Online Order Rep'].map(role => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: roleFilter === role ? '#ffffff' : 'transparent',
                      color: roleFilter === role ? '#0f172a' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {role === 'all' ? 'All Roles' : role}
                  </button>
                ))}
              </div>
            </div>

            {/* Global Staff Table */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <tr>
                    <th style={{ padding: '14px 20px' }}>Employee</th>
                    <th style={{ padding: '14px 20px' }}>Store & Outlet</th>
                    <th style={{ padding: '14px 20px' }}>Role</th>
                    <th style={{ padding: '14px 20px' }}>Channel</th>
                    <th style={{ padding: '14px 20px' }}>PIN Security</th>
                    <th style={{ padding: '14px 20px' }}>Status</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Admin Overrides</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{emp.name}</div>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>{emp.email}</span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#0284c7' }}>{emp.storeName}</div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{emp.storeSlug}.counterpoint.app</span>
                      </td>

                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0f172a' }}>
                        {emp.role}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: emp.type === 'counter' ? 'rgba(43, 124, 255, 0.1)' : 'rgba(147, 51, 234, 0.1)',
                          color: emp.type === 'counter' ? '#2B7CFF' : '#9333ea',
                          textTransform: 'uppercase'
                        }}>
                          {emp.type === 'counter' ? 'Counter POS' : 'Online Rep'}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>
                          <KeyRound size={13} />
                          <span>{emp.pinStatus}</span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '100px',
                          background: emp.isActive ? 'rgba(22, 163, 74, 0.1)' : 'rgba(225, 29, 72, 0.1)',
                          color: emp.isActive ? '#16a34a' : '#e11d48'
                        }}>
                          {emp.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => setPinModal({ open: true, employee: emp, newPin: '1234' })}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#0284c7',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Reset PIN
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CROSS-TENANT ORDERS & SETTLEMENTS */}
        {activeTab === 'orders' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
                  Platform Cross-Tenant Transaction Stream
                </h3>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Real-time sales across physical counter cash registers and online storefront checkouts.
                </span>
              </div>
              <span className="font-mono" style={{ fontSize: '12.5px', fontWeight: 700, color: '#0284c7' }}>
                {platformOrders.length} Recent Transactions
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <tr>
                  <th style={{ padding: '14px 20px' }}>Order ID</th>
                  <th style={{ padding: '14px 20px' }}>Store & Subdomain</th>
                  <th style={{ padding: '14px 20px' }}>Customer</th>
                  <th style={{ padding: '14px 20px' }}>Channel</th>
                  <th style={{ padding: '14px 20px' }}>Payment Method</th>
                  <th style={{ padding: '14px 20px' }}>Amount</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px' }}>Courier / Dispatch</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {platformOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                      {order.id}
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{order.storeName}</div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{order.slug}.counterpoint.app</span>
                    </td>

                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#0f172a' }}>
                      {order.customer}
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: order.channel.includes('POS') ? 'rgba(43, 124, 255, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                        color: order.channel.includes('POS') ? '#2B7CFF' : '#16a34a'
                      }}>
                        {order.channel}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px', color: '#0f172a' }}>
                      {order.paymentMethod}
                    </td>

                    <td style={{ padding: '16px 20px', fontWeight: 800, color: '#0f172a' }} className="font-mono">
                      {naira(order.amount)}
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '100px',
                        background: order.status === 'Delivered' || order.status === 'Completed' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(2, 132, 199, 0.1)',
                        color: order.status === 'Delivered' || order.status === 'Completed' ? '#16a34a' : '#0284c7'
                      }}>
                        {order.status}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px', color: '#64748b' }}>
                      {order.courier}
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>
                      {order.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: COURIER KYC REVIEW */}
        {activeTab === 'kyc' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
                Neighborhood Dispatch Courier KYC Queue
              </h3>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                Verify rider identity, driver license, and vehicle fitness before granting order fulfillment access.
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <tr>
                  <th style={{ padding: '14px 20px' }}>Courier Name</th>
                  <th style={{ padding: '14px 20px' }}>Contact Phone</th>
                  <th style={{ padding: '14px 20px' }}>Vehicle Class</th>
                  <th style={{ padding: '14px 20px' }}>Driver License #</th>
                  <th style={{ padding: '14px 20px' }}>Compliance Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Decision Actions</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.pendingKyc || []).map(k => (
                  <tr key={k.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0f172a' }}>{k.fullName}</td>
                    <td style={{ padding: '16px 20px', color: '#64748b' }}>{k.phone}</td>
                    <td style={{ padding: '16px 20px', color: '#0f172a', textTransform: 'capitalize' }}>{k.vehicleType}</td>
                    <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>{k.licenseNumber}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '100px',
                        background: k.status === 'approved' ? 'rgba(22, 163, 74, 0.1)' : k.status === 'rejected' ? 'rgba(225, 29, 72, 0.1)' : 'rgba(234, 88, 12, 0.1)',
                        color: k.status === 'approved' ? '#16a34a' : k.status === 'rejected' ? '#e11d48' : '#ea580c'
                      }}>
                        {k.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {k.status !== 'approved' && (
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleRejectKyc(k.id)}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecdd3', background: '#fff1f2', color: '#e11d48', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveKyc(k.id)}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Verify & Approve
                          </button>
                        </div>
                      )}
                      {k.status === 'approved' && (
                        <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 700 }}>
                          ✓ Active Dispatcher
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: CORRIDORS & SUBSCRIPTIONS */}
        {activeTab === 'corridors' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Corridors List */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                Neighborhood Dispatch Corridors (Lagos)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { name: 'Ikeja GRA & Maryland', stores: 12, riders: 18, avgTime: '16 mins' },
                  { name: 'Lekki Phase 1 & Oniru', stores: 9, riders: 15, avgTime: '19 mins' },
                  { name: 'Victoria Island & Ikoyi', stores: 7, riders: 12, avgTime: '21 mins' }
                ].map(c => (
                  <div key={c.name} style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{c.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                        {c.stores} Active Stores · {c.riders} Couriers
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', background: 'rgba(22, 163, 74, 0.1)', padding: '4px 10px', borderRadius: '100px' }}>
                      ~{c.avgTime} SLA
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* SaaS Subscriptions */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                SaaS Subscription Tiers & Quotas
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { name: 'Starter Retailer', fee: '₦15,000 / mo', quota: '1 Till Register · 500 Products', count: 18 },
                  { name: 'Growth Multi-Branch', fee: '₦35,000 / mo', quota: '3 Till Registers · 2 Branches', count: 8 },
                  { name: 'Enterprise Hypermarket', fee: '₦75,000 / mo', quota: 'Unlimited Registers · Multi-Warehouse', count: 2 }
                ].map(p => (
                  <div key={p.name} style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{p.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{p.quota}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="font-mono" style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{p.fee}</span>
                      <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>{p.count} Active Stores</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* PIN Reset Modal Dialog */}
      {pinModal.open && pinModal.employee && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 13, 22, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Reset Security PIN
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {pinModal.employee.name} ({pinModal.employee.role})
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
              Assign a new 4 to 6-digit numeric PIN for this employee to unlock the counter POS till terminal.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                NEW PIN CODE
              </label>
              <input
                type="text"
                maxLength={6}
                value={pinModal.newPin}
                onChange={(e) => setPinModal({ ...pinModal, newPin: e.target.value.replace(/\D/g, '') })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '18px',
                  letterSpacing: '0.2em',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setPinModal({ open: false, employee: null, newPin: '1234' })}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPin}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#2B7CFF',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
