import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RiderApp from './RiderApp';

describe('RiderApp Mobile Production Interface', () => {
  const mockProfile = {
    full_name: 'Samuel Olawale',
    email: 'samuel@subtech.ng'
  };

  it('renders driver status bar with 5 bottom navigation tabs', () => {
    render(<RiderApp profile={mockProfile} />);

    // Header & Brand
    expect(screen.getByText(/Mobility/i)).toBeInTheDocument();
    expect(screen.getByText(/Ikeja Node/i)).toBeInTheDocument();

    // 5 Bottom Tabs
    expect(screen.getByRole('tab', { name: /Radar/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Contracts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Active Trip/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Earnings/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Profile/i })).toBeInTheDocument();
  });

  it('toggles Sunlight High-Contrast mode for outdoor glare accessibility', () => {
    const { container } = render(<RiderApp profile={mockProfile} />);

    const sunlightBtn = screen.getByRole('button', { name: /Toggle Sunlight High-Contrast Mode/i });
    expect(sunlightBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(sunlightBtn);
    expect(sunlightBtn).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.rider-root')).toHaveClass('sunlight-mode');
  });

  it('navigates to Contracts tab and displays school run requests', () => {
    render(<RiderApp profile={mockProfile} />);

    const contractsTab = screen.getByRole('tab', { name: /Contracts/i });
    fireEvent.click(contractsTab);

    expect(screen.getByText(/Daily School Run Contracts Hub/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /The Balogun Family/i })).toBeInTheDocument();
  });

  it('navigates to Earnings tab and displays wallet breakdown with cashout button', () => {
    render(<RiderApp profile={mockProfile} />);

    const earningsTab = screen.getByRole('tab', { name: /Earnings/i });
    fireEvent.click(earningsTab);

    expect(screen.getByText(/Available For Instant Cashout/i)).toBeInTheDocument();
    expect(screen.getByText(/Withdraw/i)).toBeInTheDocument();
  });

  it('navigates to Profile tab and switches active vehicle persona', () => {
    render(<RiderApp profile={mockProfile} />);

    const profileTab = screen.getByRole('tab', { name: /Profile/i });
    fireEvent.click(profileTab);

    expect(screen.getByText(/Samuel Olawale/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Operating Vehicle/i)).toBeInTheDocument();
    expect(screen.getByText(/Lagos State Riders Permit/i)).toBeInTheDocument();
  });
});
