import { render, screen, fireEvent, within } from '@testing-library/react';
import RidesApp from './RidesApp';

describe('Subtech Mobility (STV Rides & Errands)', () => {
  it('renders Subtech Mobility branding and fleet options (Okada, Maruwa, Cars)', () => {
    render(<RidesApp />);
    expect(screen.getAllByText(/Subtech/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mobility/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Okada/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Maruwa/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Taxi/i).length).toBeGreaterThan(0);
  });

  it('toggles service modes between Ride Now, Scheduled, and School Run', () => {
    render(<RidesApp />);
    
    // Switch to Schedule for Later ("Come and pick me by 4pm")
    const scheduleTab = screen.getByRole('button', { name: /Schedule for Later/i });
    fireEvent.click(scheduleTab);
    expect(screen.getByText(/Schedule Advance Pickup Time/i)).toBeInTheDocument();

    // Switch to Daily School Run Contract
    const schoolTab = screen.getByRole('button', { name: /Daily School Run Contract/i });
    fireEvent.click(schoolTab);
    expect(screen.getByText(/Monday–Friday Recurring School Commute/i)).toBeInTheDocument();
  });

  it('adjusts proposed price using bargain buttons', () => {
    render(<RidesApp />);
    const plusBtn = screen.getByTitle('Increase proposed price');
    const priceInput = screen.getByRole('spinbutton');
    const initialPrice = Number(priceInput.value);

    fireEvent.click(plusBtn);
    expect(Number(priceInput.value)).toBeGreaterThan(initialPrice);
  });

  it('opens live rider bidding modal when submitting a trip request', () => {
    render(<RidesApp />);
    const submitBtn = screen.getByRole('button', { name: /Find Nearby Riders & Receive Bids/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/LIVE RIDER BIDDING RADAR/i)).toBeInTheDocument();
    expect(screen.getByText(/Nearby Driver Offers/i)).toBeInTheDocument();
  });

  it('opens school run modal when clicking School Runs button in header', () => {
    render(<RidesApp />);
    const schoolRunBtn = screen.getByTitle('School Run Contracts');
    fireEvent.click(schoolRunBtn);

    expect(screen.getByText(/DEDICATED SCHOOL RUN SUBSCRIPTION/i)).toBeInTheDocument();
    expect(screen.getByText(/Recurring Kids Commute Contract/i)).toBeInTheDocument();
  });
});
