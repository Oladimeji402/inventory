import { render, screen, fireEvent, within } from '@testing-library/react';
import HomePage from './HomePage';

// jsdom has no layout, and scroll tracking would fire after the test unmounts the page.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useScroll: () => ({ scrollYProgress: actual.motionValue(0), scrollY: actual.motionValue(0) }) };
});

vi.mock('../../lib/slugAvailability', () => ({
  checkStoreSlug: vi.fn(async (raw) => {
    const slug = String(raw || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
    if (slug.length < 2) return { slug, status: 'invalid' };
    if (slug === 'admin') return { slug, status: 'reserved' };
    if (slug === 'taken-shop') return { slug, status: 'taken' };
    return { slug, status: 'available' };
  })
}));

const hero = () => document.querySelector('.hm-hero');

describe('Home page', () => {
  it('renders the headline, nav anchors and honest early-access pricing note', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/commerce network for your neighbourhood/i);
    const nav = screen.getAllByRole('link', { name: /^Pricing$/ })[0];
    expect(nav.getAttribute('href')).toBe('#pricing');
    expect(screen.getByText(/early access/i, { selector: '.hm-early' })).toBeInTheDocument();
  });

  it('shows the claim result and a register link for an available name', async () => {
    render(<HomePage />);
    const form = within(hero());
    fireEvent.change(form.getByPlaceholderText('your-store'), { target: { value: 'super-mart' } });
    fireEvent.click(form.getByRole('button', { name: /Claim Free URL/i }));
    expect(await form.findByText(/free right now/i)).toBeInTheDocument();
    const link = form.getByRole('link', { name: /Register now/i });
    expect(link.getAttribute('href')).toContain('/signup');
    expect(link.getAttribute('href')).toContain('slug=super-mart');
  });

  it('does not offer registration for reserved or taken names', async () => {
    render(<HomePage />);
    const form = within(hero());
    for (const [name, text] of [['admin', /reserved/i], ['taken-shop', /already in use/i]]) {
      fireEvent.change(form.getByPlaceholderText('your-store'), { target: { value: name } });
      fireEvent.click(form.getByRole('button', { name: /Claim Free URL/i }));
      expect(await form.findByText(text)).toBeInTheDocument();
      expect(form.queryByRole('link', { name: /Register now/i })).not.toBeInTheDocument();
    }
  });

  it('opens one FAQ answer at a time', () => {
    render(<HomePage />);
    const faq = document.querySelector('#faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(buttons[1]);
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
  });
});
