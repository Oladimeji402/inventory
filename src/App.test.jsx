import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

describe('Counterpoint POS', () => {
  it('shows a private staff sign-in form without exposing the staff roster or role details', async () => {
    render(<App />);
    expect(await screen.findByLabelText(/^Name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^PIN$/i)).toBeInTheDocument();
    expect(screen.queryByText('Grace Nwosu')).not.toBeInTheDocument();
    expect(screen.queryByText(/max discount/i)).not.toBeInTheDocument();
  });

  it('rejects an incorrect name/PIN combination', async () => {
    render(<App />);
    fireEvent.change(await screen.findByLabelText(/^Name$/i), { target: { value: 'Grace Nwosu' } });
    fireEvent.change(screen.getByLabelText(/^PIN$/i), { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    expect(screen.getByText(/don't match our records/i)).toBeInTheDocument();
  });

  it('allows a manager to see sale-voiding controls in reports', async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText(/^Name$/i), { target: { value: 'Grace Nwosu' } });
    fireEvent.change(screen.getByLabelText(/^PIN$/i), { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    fireEvent.click(await screen.findByRole('button', { name: /Peak Milk Tin \(Large\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Complete sale/i }));

    fireEvent.click(screen.getByRole('button', { name: /Reports/i }));

    expect(screen.getByRole('button', { name: /Void sale/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Admin$/i })).not.toBeInTheDocument();
  });

  it('shows the staff admin panel only for store admin', async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText(/^Name$/i), { target: { value: 'Kemi Yusuf' } });
    fireEvent.change(screen.getByLabelText(/^PIN$/i), { target: { value: '4444' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    fireEvent.click(await screen.findByRole('button', { name: /^Admin$/i }));

    expect(screen.getAllByText(/Staff directory/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Search staff/i)).toBeInTheDocument();
    expect(screen.getByText('Ada Okafor')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ada Okafor'));
    expect(screen.getByRole('button', { name: /Show PIN/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Show PIN/i }));
    expect(screen.getByText('1111')).toBeInTheDocument();
  });
});
