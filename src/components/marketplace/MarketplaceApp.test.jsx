import { render, screen, fireEvent, within } from '@testing-library/react';
import MarketplaceApp from './MarketplaceApp';

describe('Subtech Ventures (STV) Multi-Vendor Marketplace', () => {
  it('renders Subtech Ventures branding, topbar, and search bar', () => {
    render(<MarketplaceApp />);
    expect(screen.getAllByText(/Subtech/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ventures/i).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Search 12,000\+ products/i)).toBeInTheDocument();
  });

  it('renders mega-menu department trigger and trust features', () => {
    render(<MarketplaceApp />);
    expect(screen.getAllByRole('button', { name: /All Departments/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/15–30 Min Courier Dispatch/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Verified Vendors/i)).toBeInTheDocument();
    expect(screen.getByText(/Buyer Protection Escrow/i)).toBeInTheDocument();
  });

  it('renders flash deals countdown section and vendor showcase', () => {
    render(<MarketplaceApp />);
    expect(screen.getByText(/Flash Deals & Daily Rush/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Rated Neighborhood Merchants/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Apex Health Pharmacy/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Volt Tech & Audio Hub/i).length).toBeGreaterThan(0);
  });

  it('opens and manages the cart drawer with coupon support', () => {
    render(<MarketplaceApp />);
    
    // Open cart drawer by clicking cart button in header
    const cartButton = screen.getByTitle('Shopping Cart');
    fireEvent.click(cartButton);

    const drawer = document.querySelector('.mp-drawer-panel');
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByText(/Your Cart/i)).toBeInTheDocument();
    expect(within(drawer).getByPlaceholderText(/Coupon code/i)).toBeInTheDocument();

    // Apply coupon STV20
    const couponInput = within(drawer).getByPlaceholderText(/Coupon code/i);
    fireEvent.change(couponInput, { target: { value: 'STV20' } });
    fireEvent.click(within(drawer).getByRole('button', { name: /^Apply$/i }));

    expect(within(drawer).getByText(/STV20/i)).toBeInTheDocument();
  });

  it('opens quick view modal when clicking quick view on a product card', () => {
    render(<MarketplaceApp />);
    const quickViewButtons = screen.getAllByTitle('Quick View');
    fireEvent.click(quickViewButtons[0]);

    const modal = document.querySelector('.mp-quickview-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/Item Specifications:/i)).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: /Add to Cart/i })).toBeInTheDocument();
  });

  it('opens order tracking modal and tracks sample orders', () => {
    render(<MarketplaceApp />);
    const trackOrderButtons = screen.getAllByRole('button', { name: /Track Order/i });
    fireEvent.click(trackOrderButtons[0]);

    const modal = document.querySelector('.mp-tracking-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/Live Courier Order Tracker/i)).toBeInTheDocument();
    expect(within(modal).getAllByText(/NC-9842/i).length).toBeGreaterThan(0);
    expect(within(modal).getByText(/GPS Radar Connected/i)).toBeInTheDocument();
  });
});
