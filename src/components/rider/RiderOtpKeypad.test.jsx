import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RiderOtpKeypad from './RiderOtpKeypad';

function enter(code) {
  for (const digit of code) {
    fireEvent.click(screen.getByRole('button', { name: `Digit ${digit}` }));
  }
}

describe('RiderOtpKeypad', () => {
  it('only reports success when the server accepts the code', async () => {
    const onVerified = vi.fn().mockResolvedValue({ status: 'delivered' });
    render(<RiderOtpKeypad onVerified={onVerified} onCancel={() => {}} />);

    enter('4821');

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('4821'));
  });

  it('shows the server error and does not accept built-in demo codes', async () => {
    const onVerified = vi.fn().mockRejectedValue(new Error('Invalid 4-digit handover OTP.'));
    render(<RiderOtpKeypad onVerified={onVerified} onCancel={() => {}} />);

    enter('1234');

    expect(await screen.findByText(/Invalid 4-digit handover OTP/i)).toBeInTheDocument();
    expect(onVerified).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Demo code/i)).not.toBeInTheDocument();
  });
});
