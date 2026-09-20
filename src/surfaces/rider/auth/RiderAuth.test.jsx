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

describe('Rider auth pages', () => {
  beforeEach(() => {
    resetNigeriaLocationCache();
    global.fetch = vi.fn((url) => {
      const href = String(url);
      if (href.endsWith('/ng/state.json')) {
        return jsonOk({
          entities: [{ name_en: 'Lagos', slug: 'lagos-ng025' }]
        });
      }
      if (href.includes('/state/lagos-ng025.json')) {
        return jsonOk({
          children: { entities: [{ name_en: 'Ikeja' }, { name_en: 'Eti-Osa' }] }
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });
  });

  it('collects only identity fields at signup — no DOB, vehicle, or licence yet', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ needsEmailConfirmation: true });
    render(<SignupPage onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/date of birth/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/licence|license/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /NIN|BVN/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Samuel Olawale' } });
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'samuel@example.com' } });
    fireEvent.change(screen.getByLabelText(/WhatsApp/i), { target: { value: '+2348000000000' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password1' } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    expect(await screen.findByText(/Check your email/i)).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Samuel Olawale',
      email: 'samuel@example.com',
      phone: '+2348000000000',
      password: 'password1'
    });
  });

  it('blocks onboarding for a rider under 18', async () => {
    const onComplete = vi.fn();
    render(<OnboardingPage onComplete={onComplete} />);

    const under18 = new Date();
    under18.setFullYear(under18.getFullYear() - 15);
    fireEvent.change(screen.getByLabelText(/Date of birth/i), {
      target: { value: under18.toISOString().slice(0, 10) }
    });
    fireEvent.change(screen.getByLabelText(/Base address/i), { target: { value: 'Opebi, Ikeja' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    expect(await screen.findByText(/at least 18 years old/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not ask for a NIN, BVN, or a licence upload — number only', () => {
    render(<OnboardingPage onComplete={vi.fn()} />);
    expect(screen.queryByLabelText(/\bNIN\b/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/\bBVN\b/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/upload/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/upload a photo/i)).not.toBeInTheDocument();
  });

  it('loads cities for the selected state', async () => {
    render(<OnboardingPage onComplete={vi.fn()} />);

    const cityInput = screen.getByRole('combobox', { name: /City \/ LGA/i });
    await waitFor(() => expect(cityInput).not.toBeDisabled());
    fireEvent.focus(cityInput);

    expect(await screen.findByRole('option', { name: 'Ikeja' })).toBeInTheDocument();
  });
});
