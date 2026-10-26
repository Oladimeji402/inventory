import { describe, it, expect } from 'vitest';
import { 
  fetchAvailableDispatches, 
  acceptDispatch, 
  verifyDelivery, 
  fetchRiderWallet, 
  cashoutRiderWallet 
} from './rider';

describe('Courier Rider Dispatch & Wallet Service', () => {
  it('fetches nearby neighborhood store dispatches', async () => {
    const res = await fetchAvailableDispatches();
    expect(res.data).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0]).toHaveProperty('orderId');
    expect(res.data[0]).toHaveProperty('fare');
  });

  it('accepts an incoming order offer', async () => {
    const res = await acceptDispatch('ORD-9821');
    expect(res.data).toBeDefined();
    expect(res.data.orderId).toBe('ORD-9821');
  });

  it('verifies doorstep handover OTP and completes delivery', async () => {
    const res = await verifyDelivery('ORD-9821', '3819');
    expect(res.data).toBeDefined();
    expect(res.data.status).toBe('delivered');
  });

  it('fetches rider wallet balance and processes instant cashout', async () => {
    const walletRes = await fetchRiderWallet();
    expect(walletRes.data).toBeDefined();
    expect(walletRes.data.balance).toBeGreaterThan(0);

    const cashoutRes = await cashoutRiderWallet('Guaranty Trust Bank', '0192837465');
    expect(cashoutRes.data).toBeDefined();
    expect(cashoutRes.data.success).toBe(true);
  });
});
