import { render, screen, fireEvent } from '@testing-library/react';
import LandingPage from './LandingPage';

describe('Subtech Ventures Hyperlocal Landing Page', () => {
  it('renders the brand title and key ecosystem value propositions', () => {
    render(<LandingPage onLaunchPOS={() => {}} />);
    expect(screen.getAllByText(/Subtech Ventures/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/From Store Counter to Doorstep/i)).toBeInTheDocument();
    expect(screen.getByText(/1,420\+/i)).toBeInTheDocument();
    expect(screen.getByText(/18.4 min/i)).toBeInTheDocument();
  });

  it('allows checking subdomain availability in the hero bar', () => {
    render(<LandingPage onLaunchPOS={() => {}} />);
    const input = screen.getByPlaceholderText('your-store-name');
    fireEvent.change(input, { target: { value: 'super-mart' } });
    fireEvent.click(screen.getByRole('button', { name: /Claim Store URL/i }));

    expect(screen.getByText(/super-mart.subtech.app/i)).toBeInTheDocument();
    expect(screen.getByText(/is available to reserve today!/i)).toBeInTheDocument();
  });

  it('switches between 3-sided ecosystem tabs (Merchants, Shoppers, Riders)', () => {
    render(<LandingPage onLaunchPOS={() => {}} />);
    
    // By default, merchants tab is active
    expect(screen.getByText(/Turn physical shelves into a live digital storefront/i)).toBeInTheDocument();

    // Switch to Shoppers
    fireEvent.click(screen.getByRole('button', { name: /For Local Shoppers/i }));
    expect(screen.getByText(/Browse live inventory in your neighborhood/i)).toBeInTheDocument();

    // Switch to Riders
    fireEvent.click(screen.getByRole('button', { name: /For On-Demand Riders/i }));
    expect(screen.getByText(/Connect store checkouts to customer doors with zero idle waiting time/i)).toBeInTheDocument();
  });

  it('runs interactive live 3-way demo simulation', async () => {
    render(<LandingPage onLaunchPOS={() => {}} />);
    const triggerBtn = screen.getByRole('button', { name: /Ring Up Sale & Auto-Dispatch Rider/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(await screen.findByText(/TAX INVOICE/i)).toBeInTheDocument();
  });

  it('switches calculator between Store Savings and Rider Earnings modes', () => {
    render(<LandingPage onLaunchPOS={() => {}} />);
    
    // Default: Store Savings
    expect(screen.getByText(/Saved per year with Subtech Ventures/i)).toBeInTheDocument();

    // Switch to Rider Earnings
    fireEvent.click(screen.getByRole('button', { name: /Rider Earnings Calculator/i }));
    expect(screen.getByText(/Take-home earnings per month/i)).toBeInTheDocument();
  });

  it('opens and interacts with the Store Registration modal', () => {
    render(<LandingPage onLaunchPOS={() => {}} />);
    
    const regButtons = screen.getAllByRole('button', { name: /Register Store/i });
    fireEvent.click(regButtons[0]);

    expect(screen.getByText(/Register Your Store on Subtech Ventures/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Apex Supermarket & Wine/i)).toBeInTheDocument();
  });
});
