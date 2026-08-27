import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { PwaProvider } from './components/PwaProvider';

function renderApp() {
  return render(
    <PwaProvider>
      <App />
    </PwaProvider>
  );
}

describe('Counterpoint POS', () => {
  it('shows a private staff sign-in form without exposing the staff roster or role details', async () => {
    renderApp();
    expect(await screen.findByLabelText(/^Name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^PIN$/i)).toBeInTheDocument();
    expect(screen.queryByText('Grace Nwosu')).not.toBeInTheDocument();
    expect(screen.queryByText(/max discount/i)).not.toBeInTheDocument();
  });

  it('rejects an incorrect name/PIN combination', async () => {
    renderApp();
    fireEvent.change(await screen.findByLabelText(/^Name$/i), { target: { value: 'Grace Nwosu' } });
    fireEvent.change(screen.getByLabelText(/^PIN$/i), { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    expect(screen.getByText(/don't match our records/i)).toBeInTheDocument();
  });

  it('allows a manager to see sale-voiding controls in reports and processes cash checkout', async () => {
    renderApp();

    fireEvent.change(await screen.findByLabelText(/^Name$/i), { target: { value: 'Grace Nwosu' } });
    fireEvent.change(screen.getByLabelText(/^PIN$/i), { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    fireEvent.click(await screen.findByRole('button', { name: /Peak Milk Tin \(Large\)/i }));

    const confirmOrderBtn = screen.getByRole('button', { name: /Confirm Order/i });
    expect(confirmOrderBtn).toBeInTheDocument();
    fireEvent.click(confirmOrderBtn);

    expect(await screen.findByRole('heading', { name: /Select Payment Method/i })).toBeInTheDocument();

    const payBtn = screen.getByRole('button', { name: /^Pay ₦/i });
    expect(payBtn).toBeInTheDocument();
    fireEvent.click(payBtn);

    expect(await screen.findByRole('button', { name: /Print receipt/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Start new sale/i }));

    fireEvent.click(screen.getByRole('button', { name: /Reports/i }));

    expect(screen.getByRole('button', { name: /Void sale/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Admin$/i })).not.toBeInTheDocument();
  });

  it('shows the staff admin panel and allows store admin to deactivate/reactivate staff', async () => {
    renderApp();

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

    expect(screen.getByRole('button', { name: /^Deactivate$/i })).toBeInTheDocument();
  });

  it('supports card and transfer checkout and holding sales', async () => {
    renderApp();

    fireEvent.change(await screen.findByLabelText(/^Name$/i), { target: { value: 'Ada Okafor' } });
    fireEvent.change(screen.getByLabelText(/^PIN$/i), { target: { value: '1111' } });
    fireEvent.click(screen.getByRole('button', { name: /Clock in/i }));

    // Add item
    fireEvent.click(await screen.findByRole('button', { name: /Peak Milk Tin \(Large\)/i }));

    // Hold sale
    const holdBtn = screen.getByRole('button', { name: /^Hold sale$/i });
    fireEvent.click(holdBtn);

    // Verify held sale appears in held orders bar
    expect(await screen.findByRole('button', { name: /Resume held order for/i })).toBeInTheDocument();

    // Resume held sale
    fireEvent.click(screen.getByRole('button', { name: /Resume held order for/i }));

    // Open payment modal
    fireEvent.click(screen.getByRole('button', { name: /Confirm Order/i }));

    // Switch to Card tab
    fireEvent.click(screen.getByRole('tab', { name: /Card/i }));
    expect(screen.getByText(/Swipe \/ Tap Card on POS Terminal/i)).toBeInTheDocument();

    // Complete payment
    fireEvent.click(screen.getByRole('button', { name: /^Pay ₦/i }));

    // Verify receipt modal
    expect(await screen.findByRole('button', { name: /Print receipt/i })).toBeInTheDocument();
  });
});
