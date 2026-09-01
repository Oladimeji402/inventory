import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SignupPage from './SignupPage';
import OnboardingPage from './OnboardingPage';
import { resetNigeriaLocationCache } from '../../../lib/nigeriaLocations';

function jsonOk(body) {
  return Promise.resolve({
    ok: true,
    json: async () => body
  });
}

describe('Merchant auth pages', () => {
  beforeEach(() => {
    resetNigeriaLocationCache();
    global.fetch = vi.fn((url) => {
      const href = String(url);
      if (href.endsWith('/ng/state.json')) {
        return jsonOk({
          entities: [
            { name_en: 'Kano', slug: 'kano-ng020' },
            { name_en: 'Lagos', slug: 'lagos-ng025' }
          ]
        });
      }
      if (href.includes('/state/kano-ng020.json')) {
        return jsonOk({
          children: { entities: [{ name_en: 'Kano Municipal' }, { name_en: 'Nassarawa' }] }
        });
      }
      if (href.includes('/state/lagos-ng025.json')) {
        return jsonOk({
          children: { entities: [{ name_en: 'Eti-Osa' }, { name_en: 'Ibeju/Lekki' }, { name_en: 'Ikeja' }] }
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });
  });

  it('collects account data at signup without legal checkboxes', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ needsEmailConfirmation: true });
    render(<SignupPage onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Work email/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Adeola Balogun' } });
    fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: 'adeola@store.com' } });
    fireEvent.change(screen.getByLabelText(/WhatsApp/i), { target: { value: '+2348000000000' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password1' } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    expect(await screen.findByText(/Check your email/i)).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Adeola Balogun',
      email: 'adeola@store.com',
      phone: '+2348000000000',
      password: 'password1',
      intendedSlug: ''
    });
  });

  it('asks for CAC number only for registered businesses', () => {
    const onComplete = vi.fn();
    render(<OnboardingPage onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText(/Trading \/ store name/i), { target: { value: 'Apex Pharmacy' } });
    fireEvent.click(screen.getByRole('radio', { name: /Limited liability company/i }));

    expect(screen.getByLabelText(/CAC BN or RC number/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /BVN|NIN/i })).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('lets merchants search Nigerian states without asking for a POS till', () => {
    render(<OnboardingPage onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Trading \/ store name/i), { target: { value: 'Apex Pharmacy' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    const stateInput = screen.getByRole('combobox', { name: /State/i });
    fireEvent.focus(stateInput);
    fireEvent.change(stateInput, { target: { value: 'kan' } });
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Kano' }));

    expect(stateInput).toHaveValue('Kano');
    expect(screen.queryByText(/POS till/i)).not.toBeInTheDocument();
    expect(screen.getByText(/physical shop/i)).toBeInTheDocument();
  });

  it('loads cities for the selected state', async () => {
    render(<OnboardingPage onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Trading \/ store name/i), { target: { value: 'Apex Pharmacy' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    const cityInput = screen.getByRole('combobox', { name: /City \/ LGA/i });
    await waitFor(() => expect(cityInput).not.toBeDisabled());
    fireEvent.focus(cityInput);

    expect(await screen.findByRole('option', { name: 'Ikeja' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ibeju/Lekki' })).toBeInTheDocument();
  });
});
