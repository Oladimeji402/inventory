import { render, screen, fireEvent } from '@testing-library/react';
import LandingPage from './LandingPage';

vi.mock('../../lib/slugAvailability', () => ({
  checkStoreSlug: vi.fn(async (raw) => {
    const slug = String(raw || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);
    if (slug.length < 2) return { slug, status: 'invalid' };
    if (slug === 'admin' || slug === 'login') return { slug, status: 'reserved' };
    if (slug === 'taken-shop') return { slug, status: 'taken' };
    return { slug, status: 'available' };
  })
}));

describe('Subtech landing page', () => {
  it('renders the brand and hero value proposition', () => {
    render(<LandingPage />);
    expect(screen.getAllByText(/Subtech/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Every neighborhood/i)).toBeInTheDocument();
    expect(screen.getByText(/Live storefront\. Local delivery/i)).toBeInTheDocument();
  });

  it('allows checking subdomain availability in the hero bar', async () => {
    render(<LandingPage />);
    const input = screen.getByPlaceholderText('your-store');
    fireEvent.change(input, { target: { value: 'super-mart' } });
    fireEvent.click(screen.getByRole('button', { name: /Claim Free URL/i }));

    expect(await screen.findByText(/super-mart.stv.com/i)).toBeInTheDocument();
    expect(screen.getByText(/free right now/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Register now/i }).getAttribute('href')).toContain('/signup');
    expect(screen.getByRole('link', { name: /Register now/i }).getAttribute('href')).toContain('slug=super-mart');
  });

  it('does not fake availability for reserved store names', async () => {
    render(<LandingPage />);
    fireEvent.change(screen.getByPlaceholderText('your-store'), { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: /Claim Free URL/i }));

    expect(await screen.findByText(/reserved/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Register now/i })).not.toBeInTheDocument();
  });

  it('switches between store, shopper, and courier ecosystem tabs', () => {
    render(<LandingPage />);

    expect(screen.getByText(/Launch a neighborhood storefront/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Shoppers$/i }));
    expect(screen.getByText(/Order directly from trusted local stores with 20-minute delivery/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Couriers$/i }));
    expect(screen.getByText(/Consistent local routes with pre-bagged, zero-wait pickups/i)).toBeInTheDocument();
  });

  it('runs the interactive live demo simulation', async () => {
    render(<LandingPage />);
    const triggerBtn = screen.getByRole('button', { name: /Trigger Order Checkout/i });
    fireEvent.click(triggerBtn);
    expect(await screen.findByText(/DIGITAL RECEIPT/i)).toBeInTheDocument();
  });

  it('switches calculator between store savings and courier earnings', () => {
    render(<LandingPage />);

    expect(screen.getByText(/Projected Annual Margin Retained/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Courier Earnings/i }));
    expect(screen.getByText(/Estimated net take-home earnings per month/i)).toBeInTheDocument();
  });

  it('sends Get Started to the merchant/rider picker', () => {
    render(<LandingPage />);
    expect(screen.queryByRole('link', { name: /^Sign in$/i })).not.toBeInTheDocument();
    const start = screen.getAllByRole('link', { name: /Get Started/i })[0];
    expect(start.getAttribute('href')).toContain('/start');
  });

  it('sends store registration CTAs to merchant signup', () => {
    render(<LandingPage />);
    const links = screen.getAllByRole('link', { name: /Register Your Store Free/i });
    expect(links[0].getAttribute('href')).toContain('/signup');
  });
});
