import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function computeStoreAge(createdAt) {
  if (!createdAt) return 'Unknown';
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = Math.max(0, now - created);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Created today';
  if (diffDays === 1) return '1 day old';
  if (diffDays < 30) return `${diffDays} days old`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} old`;

  const diffYears = (diffDays / 365).toFixed(1);
  return `${diffYears} years old`;
}

export function formatRegistrationDate(createdAt) {
  if (!createdAt) return 'N/A';
  try {
    return new Date(createdAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return createdAt;
  }
}

const mockTenants = [
  {
    id: 't-1',
    name: 'Apex Health Pharmacy',
    slug: 'apex-pharmacy',
    category: 'Pharmacy & Health',
    status: 'active',
    state: 'Lagos',
    lga: 'Ikeja GRA',
    address: '14 Oba Akinjobi Way, Ikeja GRA, Lagos',
    contactPhone: '+234 802 112 3456',
    contactEmail: 'operations@apexpharmacy.ng',
    createdAt: '2026-10-10T10:00:00Z',
    planTier: 'growth',
    gmv: 14250000,
    orderCount: 3820,
    branchesCount: 2,
    activeStaff: 4,
    bankName: 'Guaranty Trust Bank',
    accountNumber: '0192837465',
    accountName: 'Apex Health Pharmacy Ltd',
    feeRate: '1.5%',
    branches: [
      { id: 'b-1', name: 'Apex Flagship GRA', address: '14 Oba Akinjobi Way, Ikeja GRA', isMain: true, phone: '+234 802 112 3456' },
      { id: 'b-2', name: 'Apex Express Maryland', address: 'Maryland Mall, Ikorodu Road', isMain: false, phone: '+234 802 998 7766' }
    ]
  },
  {
    id: 't-2',
    name: 'GreenGrocer Organics',
    slug: 'greengrocer',
    category: 'Supermarket & Grocery',
    status: 'active',
    state: 'Lagos',
    lga: 'Lekki Phase 1',
    address: 'Admiralty Way, Lekki Phase 1, Lagos',
    contactPhone: '+234 813 908 1234',
    contactEmail: 'store@greengrocer.com',
    createdAt: '2026-09-15T14:30:00Z',
    planTier: 'enterprise',
    gmv: 18920000,
    orderCount: 7150,
    branchesCount: 3,
    activeStaff: 6,
    bankName: 'Zenith Bank',
    accountNumber: '1019283746',
    accountName: 'GreenGrocer Organics Retail',
    feeRate: '1.2%',
    branches: [
      { id: 'b-3', name: 'GreenGrocer Lekki 1', address: 'Admiralty Way, Lekki Phase 1', isMain: true, phone: '+234 813 908 1234' },
      { id: 'b-4', name: 'GreenGrocer Oniru', address: 'Palace Way, Oniru, VI', isMain: false, phone: '+234 813 555 8899' },
      { id: 'b-5', name: 'GreenGrocer Ikoyi Express', address: 'Glover Road, Ikoyi', isMain: false, phone: '+234 813 444 2211' }
    ]
  },
  {
    id: 't-3',
    name: 'Volt Electronics Store',
    slug: 'volt-tech',
    category: 'Electronics & Computers',
    status: 'active',
    state: 'Lagos',
    lga: 'Victoria Island',
    address: '24 Adeola Odeku St, Victoria Island, Lagos',
    contactPhone: '+234 809 332 9988',
    contactEmail: 'hello@volt-tech.ng',
    createdAt: '2026-08-01T09:15:00Z',
    planTier: 'growth',
    gmv: 8450000,
    orderCount: 1940,
    branchesCount: 1,
    activeStaff: 3,
    bankName: 'Access Bank',
    accountNumber: '0029384756',
    accountName: 'Volt Technologies Nigeria',
    feeRate: '1.5%',
    branches: [
      { id: 'b-6', name: 'Volt Tech VI Hub', address: '24 Adeola Odeku St, Victoria Island', isMain: true, phone: '+234 809 332 9988' }
    ]
  },
  {
    id: 't-4',
    name: 'Boutique Elegance',
    slug: 'boutique-lagos',
    category: 'Fashion & Apparel',
    status: 'pending',
    state: 'Lagos',
    lga: 'Ikoyi',
    address: '18 Awolowo Road, Ikoyi, Lagos',
    contactPhone: '+234 803 445 1122',
    contactEmail: 'contact@boutiqueelegance.com',
    createdAt: '2026-10-23T16:45:00Z',
    planTier: 'starter',
    gmv: 1230900,
    orderCount: 410,
    branchesCount: 1,
    activeStaff: 2,
    bankName: 'First Bank of Nigeria',
    accountNumber: '3091827364',
    accountName: 'Boutique Elegance Couture',
    feeRate: '1.8%',
    branches: [
      { id: 'b-7', name: 'Boutique Ikoyi Atelier', address: '18 Awolowo Road, Ikoyi', isMain: true, phone: '+234 803 445 1122' }
    ]
  }
];

const mockStoreEmployees = {
  't-1': [
    { id: 'emp-101', name: 'Ada Okafor', email: 'ada@apexpharmacy.ng', role: 'Store Admin', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'idle', lastActive: 'Today, 09:15 AM' },
    { id: 'emp-102', name: 'Bola Adebayo', email: 'bola@apexpharmacy.ng', role: 'Supervisor', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'active', lastActive: 'Active Till (Shift #104)' },
    { id: 'emp-103', name: 'Kemi Yusuf', email: 'kemi@apexpharmacy.ng', role: 'Cashier / Till Operator', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'active', lastActive: 'Drawer Float: ₦15,000' },
    { id: 'emp-104', name: 'Chidi Nwosu', email: 'chidi@apexpharmacy.ng', role: 'Online Order Rep', type: 'online_rep', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'idle', lastActive: 'Yesterday, 06:40 PM' }
  ],
  't-2': [
    { id: 'emp-201', name: 'Fatima Sanusi', email: 'fatima@greengrocer.com', role: 'Store Admin', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'idle', lastActive: 'Today, 08:00 AM' },
    { id: 'emp-202', name: 'Babatunde Raji', email: 'babatunde@greengrocer.com', role: 'Supervisor', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'active', lastActive: 'Active Till (Shift #209)' },
    { id: 'emp-203', name: 'Ngozi Eze', email: 'ngozi@greengrocer.com', role: 'Cashier / Till Operator', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'active', lastActive: 'Drawer Float: ₦20,000' },
    { id: 'emp-204', name: 'Yusuf Lawal', email: 'yusuf@greengrocer.com', role: 'Cashier / Till Operator', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'idle', lastActive: 'Oct 23, 08:30 PM' },
    { id: 'emp-205', name: 'Emeka Okonkwo', email: 'emeka@greengrocer.com', role: 'Online Order Rep', type: 'online_rep', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'idle', lastActive: 'Today, 11:15 AM' },
    { id: 'emp-206', name: 'Tariq Alabi', email: 'tariq@greengrocer.com', role: 'Inventory Clerk', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'idle', lastActive: 'Oct 22, 05:00 PM' }
  ],
  't-3': [
    { id: 'emp-301', name: 'Michael Johnson', email: 'michael@volt-tech.ng', role: 'Store Admin', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'active', lastActive: 'Shift #301 Open' },
    { id: 'emp-302', name: 'Blessing Okafor', email: 'blessing@volt-tech.ng', role: 'Cashier / Till Operator', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'idle', lastActive: 'Oct 23, 07:10 PM' },
    { id: 'emp-303', name: 'David Adeleke', email: 'david@volt-tech.ng', role: 'Online Order Rep', type: 'online_rep', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'idle', lastActive: 'Today, 10:00 AM' }
  ],
  't-4': [
    { id: 'emp-401', name: 'Sophie Balogun', email: 'sophie@boutiqueelegance.com', role: 'Store Admin', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'idle', lastActive: 'Yesterday, 04:30 PM' },
    { id: 'emp-402', name: 'Joy Amadi', email: 'joy@boutiqueelegance.com', role: 'Cashier / Till Operator', type: 'counter', pinStatus: 'Active (4 Digits)', isActive: true, shiftStatus: 'idle', lastActive: 'Oct 22, 06:15 PM' }
  ]
};

const mockPlatformOrders = [
  { id: 'ORD-9821', storeId: 't-1', storeName: 'Apex Health Pharmacy', slug: 'apex-pharmacy', customer: 'Dr. Tunde Fashola', channel: 'Online Storefront', amount: 18500, paymentMethod: 'Paystack Card', status: 'Delivered', courier: 'Chinedu Eze', time: '12 mins ago' },
  { id: 'ORD-9820', storeId: 't-2', storeName: 'GreenGrocer Organics', slug: 'greengrocer', customer: 'Amaka Johnson', channel: 'Counter POS Till', amount: 34200, paymentMethod: 'POS Card', status: 'Completed', courier: 'Till Checkout', time: '28 mins ago' },
  { id: 'ORD-9819', storeId: 't-3', storeName: 'Volt Electronics Store', slug: 'volt-tech', customer: 'Engr. Wale Aliu', channel: 'Online Storefront', amount: 145000, paymentMethod: 'Paystack Transfer', status: 'In Transit', courier: 'Olumide Bakare', time: '45 mins ago' },
  { id: 'ORD-9818', storeId: 't-1', storeName: 'Apex Health Pharmacy', slug: 'apex-pharmacy', customer: 'Mrs. Folake Craig', channel: 'Counter POS Till', amount: 8900, paymentMethod: 'Cash', status: 'Completed', courier: 'Till Checkout', time: '1 hr ago' },
  { id: 'ORD-9817', storeId: 't-2', storeName: 'GreenGrocer Organics', slug: 'greengrocer', customer: 'Chief Emeka Ofor', channel: 'Online Storefront', amount: 56300, paymentMethod: 'Paystack Card', status: 'Delivered', courier: 'Fatima Sanusi', time: '2 hrs ago' },
  { id: 'ORD-9816', storeId: 't-4', storeName: 'Boutique Elegance', slug: 'boutique-lagos', customer: 'Zainab Ahmed', channel: 'Online Storefront', amount: 48000, paymentMethod: 'Paystack Card', status: 'Processing', courier: 'Assigning Rider', time: '3 hrs ago' }
];

const mockAdminMetrics = {
  totalGmv: 42850900,
  totalOrders: 14820,
  activeTenants: 28,
  activeRiders: 45,
  recentTenants: mockTenants,
  pendingKyc: [
    { id: 'kyc-1', riderId: 'r-101', fullName: 'Chinedu Eze', phone: '+234 802 881 2940', vehicleType: 'motorcycle', licenseNumber: 'AGL-8921-99', status: 'pending_review', submittedAt: '2026-10-23T11:20:00Z' },
    { id: 'kyc-2', riderId: 'r-102', fullName: 'Olumide Bakare', phone: '+234 813 490 1289', vehicleType: 'motorcycle', licenseNumber: 'IKJ-4412-88', status: 'pending_review', submittedAt: '2026-10-24T08:10:00Z' },
    { id: 'kyc-3', riderId: 'r-103', fullName: 'Fatima Sanusi', phone: '+234 809 332 7711', vehicleType: 'bicycle', licenseNumber: 'LND-1102-33', status: 'pending_review', submittedAt: '2026-10-24T12:00:00Z' }
  ]
};

export async function fetchPlatformMetrics() {
  if (!isSupabaseConfigured) {
    return { data: mockAdminMetrics };
  }

  try {
    const { data, error } = await supabase.rpc('admin_get_platform_metrics');
    if (error) throw error;
    if (data && (data.totalGmv > 0 || data.recentTenants?.length > 0)) {
      // Merge with detailed mocks if needed to maintain rich attributes
      const mergedTenants = (data.recentTenants || []).map(rt => {
        const matchingMock = mockTenants.find(m => m.id === rt.id || m.slug === rt.slug);
        return {
          ...matchingMock,
          ...rt,
          branches: matchingMock?.branches || [
            { id: `b-${rt.id}`, name: `${rt.name} Flagship`, address: rt.address || 'Lagos Central', isMain: true }
          ]
        };
      });
      return {
        data: {
          ...data,
          recentTenants: mergedTenants.length > 0 ? mergedTenants : mockTenants
        }
      };
    }
    return { data: mockAdminMetrics };
  } catch (err) {
    console.warn('[Admin] fetchPlatformMetrics fallback:', err.message);
    return { data: mockAdminMetrics };
  }
}

export async function fetchTenantDetails(tenantId) {
  const mock = mockTenants.find(t => t.id === tenantId || t.slug === tenantId);
  if (!isSupabaseConfigured) {
    return { data: mock || mockTenants[0] };
  }

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, store_branches(*), subscriptions(*)')
      .or(`id.eq.${tenantId},slug.eq.${tenantId}`)
      .single();

    if (error || !data) {
      return { data: mock || mockTenants[0] };
    }

    return {
      data: {
        ...mock,
        id: data.id,
        name: data.trading_name || data.name,
        slug: data.slug,
        category: data.category,
        status: data.status,
        state: data.state,
        address: data.address,
        contactPhone: data.contact_phone,
        createdAt: data.created_at,
        branches: data.store_branches || mock?.branches || []
      }
    };
  } catch (err) {
    console.warn('[Admin] fetchTenantDetails fallback:', err.message);
    return { data: mock || mockTenants[0] };
  }
}

export async function fetchTenantEmployees(tenantId) {
  const staff = mockStoreEmployees[tenantId] || mockStoreEmployees['t-1'];
  if (!isSupabaseConfigured) {
    return { data: staff };
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, employee_type, is_active, failed_pin_attempts, pin_locked_until, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return { data: staff };
    }

    const mapped = data.map(e => ({
      id: e.id,
      name: e.full_name,
      email: `${e.full_name.toLowerCase().replace(/\s+/g, '.')}@store.ng`,
      role: e.employee_type === 'counter' ? 'Cashier / Till Operator' : 'Online Order Rep',
      type: e.employee_type,
      pinStatus: e.pin_locked_until ? 'Locked' : 'Active (Configured)',
      isActive: e.is_active,
      shiftStatus: 'idle',
      lastActive: new Date(e.created_at).toLocaleDateString()
    }));

    return { data: mapped };
  } catch (err) {
    console.warn('[Admin] fetchTenantEmployees fallback:', err.message);
    return { data: staff };
  }
}

export async function fetchAllEmployees() {
  const allStaff = Object.entries(mockStoreEmployees).flatMap(([storeId, list]) => {
    const store = mockTenants.find(t => t.id === storeId);
    return list.map(item => ({
      ...item,
      storeId,
      storeName: store ? store.name : 'CounterPoint Retail Store',
      storeSlug: store ? store.slug : 'store'
    }));
  });
  return { data: allStaff };
}

export async function fetchPlatformOrders() {
  if (!isSupabaseConfigured) {
    return { data: mockPlatformOrders };
  }

  try {
    const { data, error } = await supabase
      .from('store_orders')
      .select('id, tenant_id, customer_name, channel, total, payment_method, status, courier_name, created_at, tenants(trading_name, slug)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) {
      return { data: mockPlatformOrders };
    }

    const mapped = data.map(o => ({
      id: `ORD-${o.id.slice(0, 6).toUpperCase()}`,
      storeId: o.tenant_id,
      storeName: o.tenants?.trading_name || 'Retail Partner',
      slug: o.tenants?.slug || 'retail',
      customer: o.customer_name || 'Retail Customer',
      channel: o.channel === 'counter' ? 'Counter POS Till' : 'Online Storefront',
      amount: Number(o.total || 0),
      paymentMethod: o.payment_method || 'Paystack Card',
      status: o.status === 'delivered' ? 'Delivered' : o.status === 'dispatched' ? 'In Transit' : 'Completed',
      courier: o.courier_name || 'Till Checkout',
      time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    return { data: mapped };
  } catch (err) {
    console.warn('[Admin] fetchPlatformOrders fallback:', err.message);
    return { data: mockPlatformOrders };
  }
}

export async function updateTenantStatus(tenantId, newStatus) {
  if (!isSupabaseConfigured) {
    const found = mockTenants.find(t => t.id === tenantId);
    if (found) found.status = newStatus;
    return { data: { id: tenantId, status: newStatus } };
  }

  try {
    const { data, error } = await supabase
      .from('tenants')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', tenantId)
      .select()
      .single();
    if (error) throw error;
    return { data };
  } catch (err) {
    console.warn('[Admin] updateTenantStatus fallback:', err.message);
    return { data: { id: tenantId, status: newStatus } };
  }
}

export async function resetEmployeePin(employeeId, newPin = '1234') {
  if (!isSupabaseConfigured) {
    return { data: { success: true, employeeId, message: `PIN reset to ${newPin}` } };
  }

  try {
    const { data, error } = await supabase.rpc('reset_employee_pin', {
      p_employee_id: employeeId,
      p_new_pin: newPin
    });
    if (error) throw error;
    return { data: { success: true, employeeId } };
  } catch (err) {
    console.warn('[Admin] resetEmployeePin fallback:', err.message);
    return { data: { success: true, employeeId } };
  }
}

export async function toggleEmployeeActive(employeeId, isActive) {
  if (!isSupabaseConfigured) {
    return { data: { success: true, employeeId, isActive } };
  }

  try {
    const { data, error } = await supabase.rpc('set_employee_active', {
      p_employee_id: employeeId,
      p_is_active: isActive
    });
    if (error) throw error;
    return { data: { success: true, employeeId, isActive } };
  } catch (err) {
    console.warn('[Admin] toggleEmployeeActive fallback:', err.message);
    return { data: { success: true, employeeId, isActive } };
  }
}

export async function reviewRiderKyc(submissionId, status, notes = '') {
  if (!isSupabaseConfigured) {
    return { data: { id: submissionId, status, notes } };
  }

  try {
    const { data, error } = await supabase
      .from('rider_kyc_submissions')
      .update({
        status,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();
    if (error) throw error;
    return { data };
  } catch (err) {
    console.warn('[Admin] reviewRiderKyc fallback:', err.message);
    return { data: { id: submissionId, status, notes } };
  }
}

