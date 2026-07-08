import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

describe('POS demo', () => {
  it('shows the role-based access overview for the demo', () => {
    render(<App />);
    expect(screen.getByText(/Sales Representative/i)).toBeInTheDocument();
    expect(screen.getByText(/Manager/i)).toBeInTheDocument();
  });

  it('allows a manager to see sale-voiding controls in reports', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Grace Nwosu/i }));
    fireEvent.change(screen.getByLabelText(/PIN for Grace Nwosu/i), {
      target: { value: '9999' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    fireEvent.click(screen.getByRole('button', { name: /Peak Milk Tin \(Large\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Complete sale/i }));

    fireEvent.click(screen.getByRole('button', { name: /Reports/i }));

    expect(screen.getByRole('button', { name: /Void sale/i })).toBeInTheDocument();
  });
});
