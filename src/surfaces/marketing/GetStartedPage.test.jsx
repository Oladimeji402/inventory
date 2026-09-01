import { render, screen } from '@testing-library/react';
import GetStartedPage from './GetStartedPage';

describe('Get started picker', () => {
  it('sends merchants and riders to their own auth surfaces', () => {
    render(<GetStartedPage />);

    expect(screen.getByRole('link', { name: /Continue to merchant signup/i }).getAttribute('href')).toContain('/signup');
    expect(screen.getByRole('link', { name: /Continue to rider portal/i }).getAttribute('href')).toMatch(/rider/);
    expect(screen.getByRole('link', { name: /Merchant sign in/i }).getAttribute('href')).toContain('/login');
  });
});
