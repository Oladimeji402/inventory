/**
 * Persists in-progress till state so a refresh or brief power blip during an
 * outage does not wipe the open cart, held sales, or signed-in cashier.
 */

const DRAFT_KEY = 'counterpoint:till-draft:v1';

function getStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadTillDraft() {
  const storage = getStorage();
  const raw = storage?.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveTillDraft(draft) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to persist till draft', error);
  }
}

export function clearTillDraft() {
  getStorage()?.removeItem(DRAFT_KEY);
}
