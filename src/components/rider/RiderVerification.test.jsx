import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMyVerification, uploadRiderDocument, submitVerification } = vi.hoisted(() => ({
  fetchMyVerification: vi.fn(),
  uploadRiderDocument: vi.fn(),
  submitVerification: vi.fn()
}));

vi.mock('../../services/riderVerification', () => ({ fetchMyVerification, uploadRiderDocument, submitVerification }));

import RiderVerification from './RiderVerification';
import { requiredDocumentTypes, validateDocumentFile } from '../../lib/riderDocuments';

const baseState = (overrides = {}) => ({
  kycStatus: 'not_started',
  vehicleType: 'motorcycle',
  suspended: false,
  required: ['drivers_license_front', 'drivers_license_back', 'vehicle_papers', 'passport_photo'],
  documents: [],
  ...overrides
});

const doc = (docType, status = 'pending', extra = {}) => ({ docType, status, fileName: `${docType}.jpg`, sizeBytes: 2048, ...extra });

function renderScreen(props = {}) {
  return render(<RiderVerification userId="user-1" rider={{ vehicle_type: 'motorcycle', kyc_status: 'not_started' }} riderName="Tunde" onRefresh={vi.fn()} onSignOut={vi.fn()} {...props} />);
}

describe('required documents by vehicle', () => {
  it('asks bicycle riders only for a photo and everyone else for licence, papers and photo', () => {
    expect(requiredDocumentTypes('bicycle')).toEqual(['passport_photo']);
    for (const vehicle of ['motorcycle', 'tricycle', 'car', 'van']) {
      expect(requiredDocumentTypes(vehicle)).toEqual(['drivers_license_front', 'drivers_license_back', 'vehicle_papers', 'passport_photo']);
    }
  });

  it('rejects wrong file types and oversized files before uploading', () => {
    expect(validateDocumentFile(new File(['x'], 'a.exe', { type: 'application/x-msdownload' }))).toMatch(/JPG, PNG, WebP or PDF/);
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    expect(validateDocumentFile(big)).toMatch(/5 MB/);
    expect(validateDocumentFile(new File(['x'], 'ok.jpg', { type: 'image/jpeg' }))).toBe('');
  });
});

describe('RiderVerification screen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows vehicle-specific document slots and keeps Send disabled until all are uploaded', async () => {
    fetchMyVerification.mockResolvedValue(baseState({ vehicleType: 'tricycle', documents: [doc('passport_photo')] }));
    renderScreen({ rider: { vehicle_type: 'tricycle', kyc_status: 'not_started' } });

    expect(await screen.findByText(/Tricycle \(Keke\) operator licence — front/i)).toBeInTheDocument();
    expect(screen.getByText('Vehicle registration papers')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send for review/i })).toBeDisabled();
    expect(screen.getByText(/Upload all 4 documents/i)).toBeInTheDocument();
  });

  it('uploads a chosen file for the right slot, then reloads', async () => {
    fetchMyVerification.mockResolvedValue(baseState());
    uploadRiderDocument.mockResolvedValue({});
    renderScreen();

    const input = await screen.findByLabelText(/Upload Rider's licence — front/i);
    const file = new File(['img'], 'front.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(uploadRiderDocument).toHaveBeenCalledWith('user-1', 'drivers_license_front', file));
    expect(fetchMyVerification.mock.calls.length).toBeGreaterThan(1);
  });

  it('shows an upload error instead of pretending it worked', async () => {
    fetchMyVerification.mockResolvedValue(baseState());
    uploadRiderDocument.mockRejectedValue(new Error('Files must be 5 MB or smaller'));
    renderScreen();

    fireEvent.change(await screen.findByLabelText(/Upload Passport photograph/i), { target: { files: [new File(['i'], 'me.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByText(/5 MB or smaller/i)).toBeInTheDocument();
  });

  it('enables Send once everything is uploaded and submits for review', async () => {
    const full = baseState({ documents: baseState().required.map((t) => doc(t)) });
    fetchMyVerification.mockResolvedValue(full);
    submitVerification.mockResolvedValue({ status: 'pending_review' });
    const onRefresh = vi.fn();
    renderScreen({ onRefresh });

    const send = await screen.findByRole('button', { name: /Send for review/i });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);
    await waitFor(() => expect(submitVerification).toHaveBeenCalled());
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it('shows the admin reason for a rejected document and requires replacing it', async () => {
    fetchMyVerification.mockResolvedValue(baseState({
      kycStatus: 'rejected',
      reviewerNotes: 'Photo is blurry',
      documents: baseState().required.map((t) => (t === 'vehicle_papers' ? doc(t, 'rejected', { notes: 'Papers are expired' }) : doc(t, 'approved')))
    }));
    renderScreen();

    expect(await screen.findByText('Papers are expired')).toBeInTheDocument();
    expect(screen.getByText(/We could not approve your documents/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send for review/i })).toBeDisabled();
    expect(screen.getByText(/Replace the rejected documents first/i)).toBeInTheDocument();
  });

  it('locks uploads while under review and when suspended', async () => {
    fetchMyVerification.mockResolvedValue(baseState({ kycStatus: 'pending_review', documents: baseState().required.map((t) => doc(t)) }));
    const { unmount } = renderScreen();
    expect(await screen.findByText(/waiting for review/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Choose file|Replace file/i })).not.toBeInTheDocument();
    unmount();

    fetchMyVerification.mockResolvedValue(baseState({ kycStatus: 'verified', suspended: true, suspensionReason: 'Too many cancellations' }));
    renderScreen({ rider: { vehicle_type: 'motorcycle', kyc_status: 'verified', suspended_at: '2026-11-01' } });
    expect(await screen.findByText(/Your rider account is suspended/i)).toBeInTheDocument();
    expect(screen.getByText(/Too many cancellations/i)).toBeInTheDocument();
  });
});
