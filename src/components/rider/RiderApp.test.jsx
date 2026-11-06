import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  setRiderOnline: vi.fn(),
  fetchAvailableDispatches: vi.fn(),
  acceptDispatch: vi.fn(),
  fetchActiveOrder: vi.fn(),
  pickUpOrder: vi.fn(),
  verifyDelivery: vi.fn(),
  fetchHistory: vi.fn(),
  fetchRiderWallet: vi.fn(),
  savePayoutAccount: vi.fn(),
  cashoutRiderWallet: vi.fn(),
  fetchOpenRides: vi.fn(),
  bidOnRide: vi.fn(),
  withdrawRideBid: vi.fn(),
  fetchActiveRide: vi.fn(),
  rideArrived: vi.fn(),
  startRide: vi.fn(),
  completeRide: vi.fn(),
  handBackRide: vi.fn(),
  fetchRideHistory: vi.fn()
}));
vi.mock('../../services/rider', () => api);

import RiderApp from './RiderApp';

const rider = {
  id: 'abc12345-0000-0000-0000-000000000000', kyc_status: 'verified', vehicle_type: 'motorcycle', vehicle_make_model: 'Honda CG125',
  vehicle_plate_number: 'KJA-482-XD', drivers_license_number: 'FRSC-998877', drivers_license_expiry: '2030-01-01',
  corridor: 'Ikeja GRA & Maryland', city: 'Ikeja', state: 'Lagos', base_address: 'Allen Avenue',
  guarantor_name: 'Bisi Bakare', guarantor_phone: '0803 222 3333', is_online: false
};
const profile = { full_name: 'Tunde Bakare', phone: '0803 000 1111' };
const request = {
  orderId: 'order-1', storeName: 'Apex Pharmacy', storeAddress: '14 Oba Akinjobi Way', storePhone: '0802 000 1111',
  customerName: 'Amara', customerAddress: '12 Admiralty Way, Lekki', itemsSummary: '2x Paracetamol', fare: 1850, tip: 150, createdAt: new Date().toISOString()
};

const renderApp = (props = {}) => render(<RiderApp rider={rider} profile={profile} onSwitchToShop={vi.fn()} onExitToLanding={vi.fn()} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchActiveOrder.mockResolvedValue({ data: null });
  api.fetchActiveRide.mockResolvedValue({ data: null });
  api.fetchOpenRides.mockResolvedValue({ data: [] });
  api.fetchRideHistory.mockResolvedValue({ data: [] });
  api.setRiderOnline.mockResolvedValue({ data: { online: true } });
  api.fetchAvailableDispatches.mockResolvedValue({ data: [] });
  api.fetchHistory.mockResolvedValue({ data: [] });
  api.fetchRiderWallet.mockResolvedValue({ data: { balance: 0, totalEarned: 0, todayTrips: 0, payouts: [], bankName: null, accountNumber: null } });
});

describe('Rider app', () => {
  it('shows the rider\'s real name, vehicle and area with the five tabs', async () => {
    renderApp();
    expect(await screen.findByText(/Tunde · Motorcycle/i)).toBeInTheDocument();
    for (const name of ['Requests', 'Trip', 'History', 'Earnings', 'Profile']) {
      expect(screen.getByRole('tab', { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('tab', { name: /Contracts/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/RDR-284|Ikeja Node/);
  });

  it('starts offline and goes online through the server', async () => {
    renderApp();
    expect(await screen.findByText(/You are offline/i)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: /^Go online$/i }));
    await waitFor(() => expect(api.setRiderOnline).toHaveBeenCalledWith(true));
    expect(await screen.findByText(/No requests right now/i)).toBeInTheDocument();
  });

  it('keeps the rider offline and shows the reason if the server refuses', async () => {
    api.setRiderOnline.mockRejectedValue(new Error('Your documents must be verified before you can take deliveries'));
    renderApp();
    fireEvent.click(within(await screen.findByRole('main')).getByRole('button', { name: /^Go online$/i }));
    expect(await screen.findByText(/documents must be verified/i)).toBeInTheDocument();
    expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
  });

  it('lists real requests and walks a delivery from accept to pickup', async () => {
    api.fetchAvailableDispatches.mockResolvedValue({ data: [request] });
    api.acceptDispatch.mockResolvedValue({ data: { orderId: 'order-1', customerPhone: '0803 100 2000' } });
    api.pickUpOrder.mockResolvedValue({ data: { pickedUp: true } });
    renderApp({ rider: { ...rider, is_online: true } });

    expect(await screen.findByText('Apex Pharmacy')).toBeInTheDocument();
    expect(screen.getByText('₦2,000')).toBeInTheDocument(); // fare + tip
    fireEvent.click(screen.getByRole('button', { name: /Accept delivery/i }));

    expect(await screen.findByText('Current delivery')).toBeInTheDocument();
    expect(screen.getByText('14 Oba Akinjobi Way')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /picked up the order/i }));
    await waitFor(() => expect(api.pickUpOrder).toHaveBeenCalledWith('order-1'));
    expect(await screen.findByRole('button', { name: /Enter the customer.s code/i })).toBeInTheDocument();
  });

  it('shows an error and stays on requests when the delivery was already taken', async () => {
    api.fetchAvailableDispatches.mockResolvedValue({ data: [request] });
    api.acceptDispatch.mockRejectedValue(new Error('This order has already been claimed by another rider'));
    renderApp({ rider: { ...rider, is_online: true } });

    fireEvent.click(await screen.findByRole('button', { name: /Accept delivery/i }));
    expect(await screen.findByText(/already been claimed/i)).toBeInTheDocument();
    expect(screen.queryByText('Current delivery')).not.toBeInTheDocument();
  });

  it('resumes a delivery in progress after a refresh', async () => {
    api.fetchActiveOrder.mockResolvedValue({ data: { ...request, pickedUp: true } });
    renderApp({ rider: { ...rider, is_online: true } });
    expect(await screen.findByRole('button', { name: /Enter the customer.s code/i })).toBeInTheDocument();
  });

  it('shows the earnings, requires a payout account, and saves one', async () => {
    api.fetchRiderWallet.mockResolvedValue({ data: { balance: 5500, totalEarned: 9000, todayTrips: 2, payouts: [{ id: 'p1', amount: 3500, status: 'pending', createdAt: '2026-11-01T10:00:00Z' }], bankName: null, accountNumber: null } });
    api.savePayoutAccount.mockResolvedValue({ data: {} });
    renderApp();
    fireEvent.click(screen.getByRole('tab', { name: /Earnings/i }));

    expect(await screen.findByText('₦5,500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Withdraw to my bank/i })).toBeDisabled();
    expect(screen.getByText(/Waiting for our team/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Bank'), { target: { value: 'Zenith Bank' } });
    fireEvent.change(screen.getByLabelText('Account number'), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Tunde Bakare' } });
    fireEvent.click(screen.getByRole('button', { name: /Save account/i }));
    await waitFor(() => expect(api.savePayoutAccount).toHaveBeenCalledWith('Zenith Bank', '0123456789', 'Tunde Bakare'));
  });

  it('withdraws to the saved account and reports the pending payout', async () => {
    api.fetchRiderWallet.mockResolvedValue({ data: { balance: 5500, totalEarned: 9000, todayTrips: 0, payouts: [], bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Tunde Bakare', accountVerified: false } });
    api.cashoutRiderWallet.mockResolvedValue({ data: { amount: 5500, status: 'pending' } });
    renderApp();
    fireEvent.click(screen.getByRole('tab', { name: /Earnings/i }));

    fireEvent.click(await screen.findByRole('button', { name: /Withdraw to my bank/i }));
    expect(await screen.findByText(/Payout of ₦5,500 requested/i)).toBeInTheDocument();
  });

  it('lists past deliveries in the history tab', async () => {
    api.fetchHistory.mockResolvedValue({ data: [{ id: 'h1', storeName: 'GreenGrocer', customerName: 'Blessing', address: 'VI Close', fare: 1850, tip: 0, deliveredAt: '2026-11-02T12:00:00Z' }] });
    renderApp();
    fireEvent.click(screen.getByRole('tab', { name: /History/i }));
    expect(await screen.findByText('GreenGrocer')).toBeInTheDocument();
    expect(screen.getByText(/To Blessing/)).toBeInTheDocument();
  });

  it('shows the rider\'s real licence details and can switch to shopping', async () => {
    const onSwitchToShop = vi.fn();
    renderApp({ onSwitchToShop });
    fireEvent.click(screen.getByRole('tab', { name: /Profile/i }));

    expect(await screen.findByText(/FRSC-998877/)).toBeInTheDocument();
    expect(screen.getByText('Bisi Bakare · 0803 222 3333')).toBeInTheDocument();
    expect(screen.getByText('Ikeja GRA & Maryland')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/LAS-991829-R/);

    fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: /Switch to shopping/i }));
    expect(onSwitchToShop).toHaveBeenCalled();
  });

  it('switches to shopping from the header too', async () => {
    const onSwitchToShop = vi.fn();
    renderApp({ onSwitchToShop });
    fireEvent.click(within(await screen.findByRole('banner')).getByRole('button', { name: /^Switch to shopping$/i }));
    expect(onSwitchToShop).toHaveBeenCalled();
  });

  it('toggles high-contrast sunlight mode', async () => {
    const { container } = renderApp();
    fireEvent.click(await screen.findByRole('button', { name: /Toggle high-contrast sunlight mode/i }));
    expect(container.querySelector('.rider-root')).toHaveClass('sunlight-mode');
  });
});

const openRide = { id: 'ride-1', passengerName: 'Amara', pickup: '12 Admiralty Way', dropoff: '5 Allen Avenue', note: 'Blue gate', offeredPrice: 1000, minPrice: 300, bidCount: 1, createdAt: new Date().toISOString(), myBid: null };
const activeRide = { id: 'ride-1', status: 'assigned', passengerName: 'Amara Kalu', passengerPhone: '0803 100 2000', pickup: '12 Admiralty Way', dropoff: '5 Allen Avenue', agreedPrice: 1000, note: null };

describe('Rider app: passenger rides', () => {
  const online = { ...rider, is_online: true };
  const openRidesTab = async () => {
    renderApp({ rider: online });
    fireEvent.click(await screen.findByRole('tab', { name: 'Rides' }));
  };

  it('lists open rides and accepts the offered price', async () => {
    api.fetchOpenRides.mockResolvedValue({ data: [openRide] });
    api.bidOnRide.mockResolvedValue({ data: {} });
    await openRidesTab();

    expect(await screen.findByText('Amara')).toBeInTheDocument();
    expect(screen.getByText(/Note: Blue gate/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Accept ₦1,000/ }));
    await waitFor(() => expect(api.bidOnRide).toHaveBeenCalledWith('ride-1', 1000, 10));
  });

  it('sends a counter-offer with an arrival time', async () => {
    api.fetchOpenRides.mockResolvedValue({ data: [openRide] });
    api.bidOnRide.mockResolvedValue({ data: {} });
    await openRidesTab();

    fireEvent.click(await screen.findByRole('button', { name: /Counter-offer/i }));
    fireEvent.click(screen.getByRole('button', { name: /Raise price/i }));
    fireEvent.change(screen.getByLabelText(/How soon can you reach/i), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Send ₦1,100/ }));
    await waitFor(() => expect(api.bidOnRide).toHaveBeenCalledWith('ride-1', 1100, 20));
  });

  it('shows a pending offer and lets the rider withdraw it', async () => {
    api.fetchOpenRides.mockResolvedValue({ data: [{ ...openRide, myBid: { price: 1200, etaMinutes: 5, status: 'pending' } }] });
    api.withdrawRideBid.mockResolvedValue({ data: {} });
    await openRidesTab();

    expect(await screen.findByText(/Your offer of ₦1,200/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Withdraw/i }));
    await waitFor(() => expect(api.withdrawRideBid).toHaveBeenCalledWith('ride-1'));
  });

  it('shows the server\'s reason when an offer is refused', async () => {
    api.fetchOpenRides.mockResolvedValue({ data: [openRide] });
    api.bidOnRide.mockRejectedValue(new Error('This ride is no longer open'));
    await openRidesTab();
    fireEvent.click(await screen.findByRole('button', { name: /Accept ₦1,000/ }));
    expect(await screen.findByText(/no longer open/i)).toBeInTheDocument();
  });

  it('resumes the ride after a refresh and walks it through arrive, start and complete', async () => {
    api.fetchActiveRide.mockResolvedValue({ data: activeRide });
    api.rideArrived.mockResolvedValue({ data: {} });
    api.completeRide.mockResolvedValue({ data: {} });
    renderApp({ rider: online });

    expect(await screen.findByText('Current ride')).toBeInTheDocument();
    expect(screen.getByText('₦1,000 cash')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /arrived at the pickup/i }));
    await waitFor(() => expect(api.rideArrived).toHaveBeenCalledWith('ride-1'));
    expect(await screen.findByRole('button', { name: /Enter the passenger.s code/i })).toBeInTheDocument();
  });

  it('starts the trip only when the passenger\'s code is accepted', async () => {
    api.fetchActiveRide.mockResolvedValue({ data: { ...activeRide, status: 'arrived' } });
    api.startRide.mockRejectedValueOnce(new Error('That code is not right.')).mockResolvedValueOnce({ data: {} });
    renderApp({ rider: online });

    fireEvent.click(await screen.findByRole('button', { name: /Enter the passenger.s code/i }));
    for (const d of '1234') fireEvent.click(screen.getByRole('button', { name: `Digit ${d}` }));
    expect(await screen.findByText(/code is not right/i)).toBeInTheDocument();
    for (const d of '4821') fireEvent.click(screen.getByRole('button', { name: `Digit ${d}` }));
    await waitFor(() => expect(api.startRide).toHaveBeenLastCalledWith('ride-1', '4821'));
    expect(await screen.findByRole('button', { name: /Complete trip · collect ₦1,000/ })).toBeInTheDocument();
  });

  it('tells the rider to collect cash when the trip is completed', async () => {
    api.fetchActiveRide.mockResolvedValue({ data: { ...activeRide, status: 'in_progress' } });
    api.completeRide.mockResolvedValue({ data: {} });
    renderApp({ rider: online });

    fireEvent.click(await screen.findByRole('button', { name: /Complete trip/i }));
    expect(await screen.findByText('Collect ₦1,000')).toBeInTheDocument();
  });

  it('lets the rider hand a ride back after confirming', async () => {
    api.fetchActiveRide.mockResolvedValue({ data: activeRide });
    api.handBackRide.mockResolvedValue({ data: {} });
    renderApp({ rider: online });

    fireEvent.click(await screen.findByRole('button', { name: /can.t make this ride/i }));
    expect(api.handBackRide).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Yes, hand back/i }));
    await waitFor(() => expect(api.handBackRide).toHaveBeenCalledWith('ride-1', 'Rider could not make it'));
  });

  it('lists completed rides in the history tab', async () => {
    api.fetchRideHistory.mockResolvedValue({ data: [{ id: 'h1', passengerName: 'Blessing', pickup: 'VI', dropoff: 'Ikoyi', price: 1500, rating: 5, completedAt: '2026-11-02T12:00:00Z' }] });
    renderApp({ rider: online });
    fireEvent.click(screen.getByRole('tab', { name: /History/i }));
    fireEvent.click(await screen.findByRole('tab', { name: 'Rides' }));
    expect(await screen.findByText('Blessing')).toBeInTheDocument();
    expect(screen.getAllByText('₦1,500').length).toBeGreaterThan(0);
  });
});
