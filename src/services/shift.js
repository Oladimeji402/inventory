import { isSupabaseConfigured, supabase } from '../lib/supabase';

const SHIFT_STORAGE_KEY = 'counterpoint_active_shift';

let memoryStorage = {};

function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // fallback
  }
  return {
    getItem: (key) => memoryStorage[key] || null,
    setItem: (key, val) => { memoryStorage[key] = String(val); },
    removeItem: (key) => { delete memoryStorage[key]; }
  };
}

export function getLocalShift() {
  try {
    const storage = getStorage();
    const raw = storage?.getItem(SHIFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalShift(shift) {
  try {
    const storage = getStorage();
    if (!shift) {
      storage?.removeItem(SHIFT_STORAGE_KEY);
    } else {
      storage?.setItem(SHIFT_STORAGE_KEY, JSON.stringify(shift));
    }
  } catch (err) {
    console.warn('Failed to save local shift:', err);
  }
}

export async function openStaffShift(token, openingFloat = 10000) {
  const floatVal = Number(openingFloat) || 0;
  const localShift = {
    shiftId: 'local-shift-' + Date.now(),
    openedAt: new Date().toISOString(),
    openingFloat: floatVal,
    cashDrops: 0,
    cashSales: 0,
    cardSales: 0,
    transferSales: 0,
    totalSales: 0,
    status: 'open',
    drops: []
  };

  saveLocalShift(localShift);

  if (!isSupabaseConfigured || !token) {
    return { data: localShift };
  }

  try {
    const { data, error } = await supabase.rpc('staff_open_shift', {
      p_token: token,
      p_opening_float: floatVal
    });
    if (error) throw error;
    if (data) {
      saveLocalShift({ ...localShift, ...data });
      return { data };
    }
    return { data: localShift };
  } catch (err) {
    console.warn('[Shift] openStaffShift fallback:', err.message);
    return { data: localShift };
  }
}

export async function recordCashDrop(token, amount, reason = 'Mid-shift safe transfer', authorizedBy = null) {
  const dropVal = Number(amount) || 0;
  const current = getLocalShift() || {};
  const drops = current.drops || [];
  const updated = {
    ...current,
    cashDrops: (Number(current.cashDrops) || 0) + dropVal,
    drops: [
      ...drops,
      {
        id: 'drop-' + Date.now(),
        amount: dropVal,
        reason,
        authorizedBy,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }
    ]
  };
  saveLocalShift(updated);

  if (!isSupabaseConfigured || !token) {
    return { data: updated };
  }

  try {
    const { data, error } = await supabase.rpc('staff_cash_drop', {
      p_token: token,
      p_amount: dropVal,
      p_reason: reason,
      p_authorized_by: authorizedBy
    });
    if (error) throw error;
    return { data };
  } catch (err) {
    console.warn('[Shift] recordCashDrop fallback:', err.message);
    return { data: updated };
  }
}

export async function getCurrentShiftReport(token, localSales = []) {
  const current = getLocalShift();
  const openedAt = current?.openedAt ? new Date(current.openedAt) : new Date(0);

  // Compute local sales completed since shift opened
  const recentSales = (localSales || []).filter(s => new Date(s.timestamp || s.createdAt || 0) >= openedAt);
  const cashSales = recentSales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const cardSales = recentSales.filter(s => s.paymentMethod === 'Card').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const transferSales = recentSales.filter(s => s.paymentMethod === 'Bank Transfer' || s.paymentMethod === 'Transfer').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalSales = cashSales + cardSales + transferSales;
  const openingFloat = Number(current?.openingFloat) || 0;
  const cashDrops = Number(current?.cashDrops) || 0;
  const expectedCash = openingFloat + cashSales - cashDrops;

  const localReport = {
    hasActiveShift: Boolean(current),
    shiftId: current?.shiftId || 'SHIFT-001',
    openedAt: current?.openedAt || new Date().toISOString(),
    openingFloat,
    cashDrops,
    cashSales,
    cardSales,
    transferSales,
    totalSales,
    expectedCash,
    drops: current?.drops || []
  };

  if (!isSupabaseConfigured || !token) {
    return { data: localReport };
  }

  try {
    const { data, error } = await supabase.rpc('staff_get_current_shift', {
      p_token: token
    });
    if (error) throw error;
    if (data?.hasActiveShift) {
      return { data };
    }
    return { data: localReport };
  } catch (err) {
    console.warn('[Shift] getCurrentShiftReport fallback:', err.message);
    return { data: localReport };
  }
}

export async function closeStaffShift(token, actualCash, notes = '', localSales = []) {
  const actualVal = Number(actualCash) || 0;
  const reportRes = await getCurrentShiftReport(token, localSales);
  const rep = reportRes?.data || {};
  const expected = rep.expectedCash ?? 0;
  const variance = actualVal - expected;

  const zReport = {
    ...rep,
    closedAt: new Date().toISOString(),
    actualCash: actualVal,
    variance,
    notes,
    status: 'closed'
  };

  saveLocalShift(null); // clear local active shift

  if (!isSupabaseConfigured || !token) {
    return { data: zReport };
  }

  try {
    const { data, error } = await supabase.rpc('staff_close_shift', {
      p_token: token,
      p_actual_cash: actualVal,
      p_notes: notes
    });
    if (error) throw error;
    return { data: { ...zReport, ...(data || {}) } };
  } catch (err) {
    console.warn('[Shift] closeStaffShift fallback:', err.message);
    return { data: zReport };
  }
}
