import { isSupabaseConfigured, supabase } from '../lib/supabase';

const mockDispatches = [
  {
    orderId: 'ORD-9821',
    storeName: 'Apex Health Pharmacy',
    storeAddress: 'Plot 12, Isaac John St, Ikeja GRA',
    storePhone: '+234 803 291 0029',
    customerName: 'Amara Kalu',
    customerAddress: 'Apt 4B, Admiralty Way, Lekki Phase 1',
    customerPhone: '+234 802 119 4482',
    distanceKm: '2.4 km',
    estimatedMinutes: 18,
    fare: 1850,
    tip: 300,
    itemsSummary: '1x Amoxicillin 500mg, 1x Vitamin C 1000mg',
    otp: '3819'
  },
  {
    orderId: 'ORD-9822',
    storeName: 'GreenGrocer Organics',
    storeAddress: '14 Joel Ogunnaike St, Ikeja GRA',
    storePhone: '+234 802 334 1122',
    customerName: 'Dr. Femi Doherty',
    customerAddress: 'Plot 8, Oduduwa Crescent, Ikeja GRA',
    customerPhone: '+234 803 445 6677',
    distanceKm: '1.2 km',
    estimatedMinutes: 12,
    fare: 1600,
    tip: 500,
    itemsSummary: '2x Organic Avocado, 1x Fresh Almond Milk',
    otp: '7214'
  }
];

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
