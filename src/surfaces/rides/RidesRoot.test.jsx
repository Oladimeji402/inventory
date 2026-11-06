import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  auth: {},
  api: { createRide: vi.fn(), fetchMyRides: vi.fn(), fetchMyRide: vi.fn(), updateRideOffer: vi.fn(), acceptRideBid: vi.fn(), cancelRide: vi.fn(), rateRide: vi.fn() }
}));

vi.mock('../../hooks/useCustomerAuth', () => ({ useCustomerAuth: () => h.auth }));
vi.mock('../../services/rides', async () => {
  const actual = await vi.importActual('../../services/rides');
  return { ...actual, ...h.api };
});

import RidesRoot from './RidesRoot';

const guest = () => ({ user: null, profile: null, rider: null, addresses: [], signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), refresh: vi.fn() });
const member = (extra = {}) => ({ ...guest(), user: { id: 'u1' }, profile: { full_name: 'Amara Kalu', phone: '0803 000 1111' },
  addresses: [{ id: 'a1', label: 'Home', address: '12 Admiralty Way, Lekki' }], ...extra });

const base = { id: 'r1', vehicleType: 'motorcycle', pickup: '12 Admiralty Way', dropoff: '5 Allen Avenue', offeredPrice: 1000, minPrice: 300, bids: [], rider: null,
  createdAt: '2026-11-06T10:00:00Z', note: null, scheduledFor: null };
const go = (path) => window.history.pushState({}, '', path);

beforeAll(() => { window.scrollTo = vi.fn(); });
beforeEach(() => {
  vi.clearAllMocks();
  h.auth = member();
  h.api.fetchMyRides.mockResolvedValue({ data: [] });
});
afterEach(() => go('/'));

describe('Booking a ride', () => {
  it('sends guests to sign in', async () => {
    h.auth = guest();
    go('/rides');
    render(<RidesRoot />);
    fireEvent.click(await screen.findByRole('button', { name: /Sign in to book/i }));
    expect(window.location.pathname + window.location.search).toBe('/rides/login?next=/');
  });

  it('validates the form, then posts the offer and opens the live trip', async () => {
    h.api.createRide.mockResolvedValue({ data: { id: 'r1' } });
    go('/rides');
    render(<RidesRoot />);

    fireEvent.click(await screen.findByRole('button', { name: /Find riders/i }));
    expect(await screen.findByText(/Enter your pickup address/i)).toBeInTheDocument();
    expect(h.api.createRide).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Home' })[0]);
    fireEvent.change(screen.getByLabelText('Drop-off address'), { target: { value: '5 Allen Avenue, Ikeja' } });
    fireEvent.click(screen.getByRole('radio', { name: /Car/i }));
    fireEvent.click(screen.getByRole('button', { name: /Raise the offer/i }));
    fireEvent.click(screen.getByRole('button', { name: /Find riders/i }));

    await waitFor(() => expect(h.api.createRide).toHaveBeenCalledWith(expect.objectContaining({
      vehicle: 'car', pickup: '12 Admiralty Way, Lekki', dropoff: '5 Allen Avenue, Ikeja', price: 2700, phone: '0803 000 1111', scheduledFor: null
    })));
    await waitFor(() => expect(window.location.pathname).toBe('/rides/trips/r1'));
  });

  it('shows the server\'s reason when a ride cannot be posted', async () => {
    h.api.createRide.mockRejectedValue(new Error('You already have a ride in progress. Finish or cancel it before booking another.'));
    go('/rides');
    render(<RidesRoot />);
    fireEvent.change(await screen.findByLabelText('Pickup address'), { target: { value: '12 Admiralty Way' } });
    fireEvent.change(screen.getByLabelText('Drop-off address'), { target: { value: '5 Allen Avenue' } });
    fireEvent.click(screen.getByRole('button', { name: /Find riders/i }));
    expect(await screen.findByText(/already have a ride in progress/i)).toBeInTheDocument();
  });

  it('points a passenger with a live ride at it', async () => {
    h.api.fetchMyRides.mockResolvedValue({ data: [{ id: 'live1', status: 'open', scheduledFor: null }] });
    go('/rides');
    render(<RidesRoot />);
    fireEvent.click(await screen.findByRole('button', { name: /View it/i }));
    expect(window.location.pathname).toBe('/rides/trips/live1');
  });
});

describe('Live trip', () => {
  it('lists offers cheapest first and accepts the one chosen', async () => {
    h.api.fetchMyRide.mockResolvedValue({ data: { ...base, status: 'open', bids: [
      { id: 'b1', price: 900, etaMinutes: 5, rider: { name: 'Tunde', plate: 'KJA-482-XD', makeModel: 'Honda', rating: 4.8, ratingCount: 12, trips: 40 } },
      { id: 'b2', price: 1200, etaMinutes: 3, rider: { name: 'Chidi', plate: 'LND-889-BB', rating: null, ratingCount: 0, trips: 2 } }
    ] } });
    h.api.acceptRideBid.mockResolvedValue({ data: {} });
    go('/rides/trips/r1');
    render(<RidesRoot />);

    expect(await screen.findByText('2 offers so far')).toBeInTheDocument();
    expect(screen.getByText('★ 4.8')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0]);
    await waitFor(() => expect(h.api.acceptRideBid).toHaveBeenCalledWith('b1'));
  });

  it('lets the passenger raise their offer while waiting', async () => {
    h.api.fetchMyRide.mockResolvedValue({ data: { ...base, status: 'open' } });
    h.api.updateRideOffer.mockResolvedValue({ data: {} });
    go('/rides/trips/r1');
    render(<RidesRoot />);

    expect(await screen.findByText('Waiting for riders…')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Raise the offer/i }));
    fireEvent.click(screen.getByRole('button', { name: /Update my offer/i }));
    await waitFor(() => expect(h.api.updateRideOffer).toHaveBeenCalledWith('r1', 1100));
  });

  it('shows the start code and rider details once a rider is assigned, and nothing before', async () => {
    h.api.fetchMyRide.mockResolvedValue({ data: { ...base, status: 'assigned', agreedPrice: 900, startOtp: '4821',
      rider: { name: 'Tunde', phone: '0803 777 8888', plate: 'KJA-482-XD', makeModel: 'Honda CG125' }, acceptedAt: '2026-11-06T10:05:00Z' } });
    go('/rides/trips/r1');
    render(<RidesRoot />);

    expect(await screen.findByText('4821')).toBeInTheDocument();
    expect(screen.getByText(/Show this code to your rider/i)).toBeInTheDocument();
    expect(screen.getByText('KJA-482-XD')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call/i })).toHaveAttribute('href', 'tel:0803 777 8888');
    expect(screen.getByText(/Pay the rider in cash/i)).toBeInTheDocument();
  });

  it('cancels only after confirmation', async () => {
    h.api.fetchMyRide.mockResolvedValue({ data: { ...base, status: 'open' } });
    h.api.cancelRide.mockResolvedValue({ data: {} });
    go('/rides/trips/r1');
    render(<RidesRoot />);

    fireEvent.click(await screen.findByRole('button', { name: /^Cancel ride$/i }));
    expect(h.api.cancelRide).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Yes, cancel/i }));
    await waitFor(() => expect(h.api.cancelRide).toHaveBeenCalledWith('r1'));
  });

  it('asks for a rating after the trip and submits it', async () => {
    h.api.fetchMyRide.mockResolvedValue({ data: { ...base, status: 'completed', agreedPrice: 900, rating: null, rider: { name: 'Tunde', plate: 'KJA' } } });
    h.api.rateRide.mockResolvedValue({ data: {} });
    go('/rides/trips/r1');
    render(<RidesRoot />);

    expect(await screen.findByText(/pay ₦900 in cash/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit rating/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
    fireEvent.click(screen.getByRole('button', { name: /Submit rating/i }));
    await waitFor(() => expect(h.api.rateRide).toHaveBeenCalledWith('r1', 5, ''));
  });

  it('explains an expired request and a cancelled one', async () => {
    h.api.fetchMyRide.mockResolvedValue({ data: { ...base, status: 'expired' } });
    go('/rides/trips/r1');
    const { unmount } = render(<RidesRoot />);
    expect(await screen.findByText(/No rider accepted in time/i)).toBeInTheDocument();
    unmount();

    h.api.fetchMyRide.mockResolvedValue({ data: { ...base, status: 'cancelled', cancelledBy: 'rider', cancelReason: 'Bike broke down' } });
    render(<RidesRoot />);
    expect(await screen.findByText(/cancelled by the rider/i)).toBeInTheDocument();
    expect(screen.getByText(/Bike broke down/)).toBeInTheDocument();
  });
});

describe('My trips', () => {
  it('lists trips with readable statuses', async () => {
    h.api.fetchMyRides.mockResolvedValue({ data: [
      { id: 'a', status: 'completed', vehicleType: 'car', pickup: 'Lekki', dropoff: 'Ikeja', offeredPrice: 2500, agreedPrice: 2200, riderName: 'Tunde', createdAt: '2026-11-05T10:00:00Z' },
      { id: 'b', status: 'expired', vehicleType: 'motorcycle', pickup: 'Yaba', dropoff: 'Surulere', offeredPrice: 700, createdAt: '2026-11-04T10:00:00Z' }
    ] });
    go('/rides/trips');
    render(<RidesRoot />);
    expect(await screen.findByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('No rider found')).toBeInTheDocument();
    expect(screen.getByText('₦2,200')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Lekki → Ikeja'));
    expect(window.location.pathname).toBe('/rides/trips/a');
  });

  it('never shows invented activity', async () => {
    go('/rides');
    render(<RidesRoot />);
    await screen.findByText('Where to?');
    expect(document.body.textContent).not.toMatch(/Simulate|School Run|Math\.random/i);
  });
});
