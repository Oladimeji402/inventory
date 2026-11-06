import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, api } = vi.hoisted(() => {
const auth = {
  getSession: vi.fn(),
  getUser: vi.fn(async () => ({ data: { user: { email: 'boss@example.com' } } })),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(async () => ({}))
};

const rider = {
  id: 'rider-1', name: 'Tunde Bakare', phone: '0803 000 1111', email: 'tunde@example.com',
  dateOfBirth: '1995-04-02', vehicleType: 'motorcycle', vehicleMakeModel: 'Honda CG125', plate: 'KJA-482-XD',
  licenseNumber: 'FRSC-998877', licenseExpiry: '2030-01-01', state: 'Lagos', city: 'Ikeja', baseAddress: 'Allen Avenue',
  nextOfKinName: 'Bisi Bakare', nextOfKinPhone: '0803 222 3333', onboardingStatus: 'complete', kycStatus: 'pending_review',
  submissionId: 'sub-1', reviewerNotes: null, submittedAt: '2026-11-01T10:00:00Z', suspended: false, createdAt: '2026-10-30T09:00:00Z',
  requiredDocuments: ['drivers_license_front', 'drivers_license_back', 'vehicle_papers', 'passport_photo'],
  documents: [
    { id: 'doc-1', docType: 'drivers_license_front', path: 'u/drivers_license_front', fileName: 'front.jpg', mimeType: 'image/jpeg', sizeBytes: 120000, status: 'pending', uploadedAt: '2026-11-01T10:00:00Z' },
    { id: 'doc-2', docType: 'passport_photo', path: 'u/passport_photo', fileName: 'me.png', mimeType: 'image/png', sizeBytes: 90000, status: 'approved', uploadedAt: '2026-11-01T10:01:00Z' }
  ],
  deliveries: 3, earned: 7500, paidOut: 2000, availableBalance: 5500, recentTrips: [], payouts: []
};

const api = {
  isPlatformAdmin: vi.fn(async () => true),
  fetchTrends: vi.fn(async () => ({
    data: {
      series: [{ day: '2026-11-04', gmv: 0, orders: 0 }, { day: '2026-11-05', gmv: 0, orders: 0 }],
      statusBreakdown: {}, channelGmv: {}, topStores: [],
      queue: { ridersPendingReview: 2, payoutsPending: 1, payoutsPendingAmount: 4500, unpaidTransfers: 0, suspendedStores: 0, storesPendingKyc: 0, newStores7d: 1, newRiders7d: 2 },
      compare: { gmv7d: 0, gmvPrev7d: 0, orders7d: 0, ordersPrev7d: 0 }
    }
  })),
  fetchPlatformMetrics: vi.fn(async () => ({ data: { totalGmv: 0, gmv30d: 0, totalOrders: 0, activeTenants: 4, activeRiders: 3, verifiedRiders: 1 } })),
  fetchPlatformOrders: vi.fn(async () => ({ data: [] })),
  fetchRiders: vi.fn(async () => ({
    data: [{ id: 'rider-1', name: 'Tunde Bakare', phone: '0803 000 1111', vehicleType: 'motorcycle', plate: 'KJA-482-XD', city: 'Ikeja', state: 'Lagos', kycStatus: 'pending_review', suspended: false, docsRequired: 4, docsUploaded: 2, docsApproved: 1, deliveries: 3, earned: 7500, createdAt: '2026-10-30T09:00:00Z' }]
  })),
  fetchRider: vi.fn(async () => ({ data: rider })),
  getRiderDocumentUrl: vi.fn(async () => 'data:image/gif;base64,R0lGODlhAQABAAAAACw='),
  reviewRiderDocument: vi.fn(async () => ({ data: {} })),
  reviewRiderKyc: vi.fn(async () => ({ data: {} })),
  setRiderSuspended: vi.fn(async () => ({ data: {} }))
};

  return { auth, api };
});

vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: true, supabase: { auth } }));

vi.mock('../../services/admin', async () => {
  const actual = await vi.importActual('../../services/admin');
  return new Proxy({ ...actual }, { get: (target, key) => (key in api ? api[key] : target[key]) });
});

import AdminRoot from './AdminRoot';

beforeAll(() => {
  window.scrollTo = vi.fn();
  // run count-up animations instantly
  window.matchMedia = (query) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
});

beforeEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, '', '/admin');
});
afterEach(() => window.history.pushState({}, '', '/'));

describe('Admin sign-in', () => {
  it('shows the sign-in form and rejects a wrong password (no built-in passkey)', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<AdminRoot />);

    fireEvent.change(await screen.findByLabelText(/Administrator email/i), { target: { value: 'x@y.co' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'admin2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(await screen.findByText(/Sign-in failed/i)).toBeInTheDocument();
    expect(screen.queryByText(/Overview/)).not.toBeInTheDocument();
  });

  it('signs a non-admin account straight back out', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    auth.signInWithPassword.mockResolvedValue({ error: null });
    api.isPlatformAdmin.mockResolvedValueOnce(false);
    render(<AdminRoot />);

    fireEvent.change(await screen.findByLabelText(/Administrator email/i), { target: { value: 'user@y.co' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret-pass' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(await screen.findByText(/does not have platform admin access/i)).toBeInTheDocument();
    expect(auth.signOut).toHaveBeenCalled();
  });
});

describe('Admin console', () => {
  beforeEach(() => auth.getSession.mockResolvedValue({ data: { session: { user: {} } } }));

  it('shows the overview with real counts and the work queue', async () => {
    render(<AdminRoot />);
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(await screen.findByText(/Riders waiting for document review/i)).toBeInTheDocument();
    expect(screen.getByText(/Rider payouts to settle/i)).toBeInTheDocument();
    // sidebar badges come from the queue
    const riderLink = screen.getByRole('link', { name: /^Riders/ });
    expect(within(riderLink).getByText('2')).toBeInTheDocument();
    // numbers the old dashboard invented must never appear
    for (const invented of ['42,850,900', '14,820', '+18.4%']) expect(document.body.textContent).not.toContain(invented);
  });

  it('opens a rider and shows every detail plus the uploaded documents', async () => {
    window.history.pushState({}, '', '/admin/riders');
    render(<AdminRoot />);

    fireEvent.click(await screen.findByText('Tunde Bakare'));
    expect(await screen.findByRole('heading', { name: 'Tunde Bakare' })).toBeInTheDocument();

    for (const text of ['FRSC-998877', 'KJA-482-XD', 'Honda CG125', 'Allen Avenue', 'Bisi Bakare', 'tunde@example.com']) {
      expect(screen.getByText(new RegExp(text))).toBeInTheDocument();
    }
    expect(screen.getByText(/Rider's licence — front/i)).toBeInTheDocument();
    expect(screen.getByText('Vehicle registration papers')).toBeInTheDocument();
    expect(screen.getAllByText('Not uploaded').length).toBe(2);
    // can't verify until every document is approved
    expect(screen.getByRole('button', { name: /Verify rider/i })).toBeDisabled();
  });

  it('requires a reason before rejecting a document', async () => {
    window.history.pushState({}, '', '/admin/riders/rider-1');
    render(<AdminRoot />);

    fireEvent.click((await screen.findAllByRole('button', { name: /^Reject$/i }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: /Reject document/i }));
    expect(await screen.findByText(/Reason shown to the rider is required/i)).toBeInTheDocument();
    expect(api.reviewRiderDocument).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Reason shown to the rider/i), { target: { value: 'Blurry photo' } });
    fireEvent.click(screen.getByRole('button', { name: /Reject document/i }));
    await waitFor(() => expect(api.reviewRiderDocument).toHaveBeenCalledWith('doc-1', 'rejected', 'Blurry photo'));
  });

  it('approves a document in one click', async () => {
    window.history.pushState({}, '', '/admin/riders/rider-1');
    render(<AdminRoot />);

    fireEvent.click(await screen.findByRole('button', { name: /^Approve$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Approve document/i }));
    await waitFor(() => expect(api.reviewRiderDocument).toHaveBeenCalledWith('doc-1', 'approved'));
  });
});
