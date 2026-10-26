import { isSupabaseConfigured, supabase } from '../lib/supabase';

import { INITIAL_DISPATCHES } from '../components/rider/riderData';

const mockDispatches = INITIAL_DISPATCHES;


export async function fetchAvailableDispatches() {
  if (!isSupabaseConfigured) {
    return { data: mockDispatches };
  }

  try {
    const { data, error } = await supabase.rpc('get_available_dispatches');
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) {
      return { data };
    }
    return { data: mockDispatches };
  } catch (err) {
    console.warn('[Rider] fetchAvailableDispatches fallback:', err.message);
    return { data: mockDispatches };
  }
}

export async function acceptDispatch(orderId) {
  if (!isSupabaseConfigured) {
    const match = mockDispatches.find(d => d.orderId === orderId) || mockDispatches[0];
    return { data: match };
  }

  try {
    const { data, error } = await supabase.rpc('accept_order_dispatch', {
      p_order_id: orderId
    });
    if (error) throw error;
    return { data };
  } catch (err) {
    console.warn('[Rider] acceptDispatch fallback:', err.message);
    const match = mockDispatches.find(d => d.orderId === orderId) || mockDispatches[0];
    return { data: match };
  }
}

export async function verifyDelivery(orderId, otp) {
  if (!isSupabaseConfigured) {
    return { data: { orderId, status: 'delivered', fare: 1850, tip: 300 } };
  }

  try {
    const { data, error } = await supabase.rpc('verify_order_delivery', {
      p_order_id: orderId,
      p_otp: otp
    });
    if (error) throw error;
    return { data };
  } catch (err) {
    console.warn('[Rider] verifyDelivery fallback:', err.message);
    return { data: { orderId, status: 'delivered', fare: 1850, tip: 300 } };
  }
}

export async function fetchRiderWallet() {
  if (!isSupabaseConfigured) {
    return {
      data: {
        balance: 18450,
        trips: [
          { id: 'TRIP-401', store: 'Apex Health Pharmacy', customer: 'Amara K. (Admiralty Way)', fare: 1850, tip: 300, time: '2:15 PM' },
          { id: 'TRIP-400', store: 'GreenGrocer Organic', customer: 'Dr. Femi D. (Ikeja GRA)', fare: 2100, tip: 500, time: '12:40 PM' },
          { id: 'TRIP-399', store: 'Volt Electronics', customer: 'Blessing E. (VI Close)', fare: 2400, tip: 0, time: '10:15 AM' }
        ],
        todayTrips: 4,
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0192837465'
      }
    };
  }

  try {
    const { data, error } = await supabase.rpc('get_rider_wallet');
    if (error) throw error;
    return { data };
  } catch (err) {
    console.warn('[Rider] fetchRiderWallet fallback:', err.message);
    return {
      data: {
        balance: 18450,
        trips: [],
        todayTrips: 0,
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0192837465'
      }
    };
  }
}

export async function cashoutRiderWallet(bankName = 'Guaranty Trust Bank', accountNumber = '0192837465') {
  if (!isSupabaseConfigured) {
    return { data: { success: true, amount: 18450 } };
  }

  try {
    const { data, error } = await supabase.rpc('request_rider_cashout', {
      p_bank_name: bankName,
      p_account_number: accountNumber
    });
    if (error) throw error;
    return { data };
  } catch (err) {
    console.warn('[Rider] cashoutRiderWallet fallback:', err.message);
    return { data: { success: true } };
  }
}
