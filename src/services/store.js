import seed from '../data/seed.json';
import { fetchTillProducts, submitTillCheckout } from '../lib/staffAuth';

/**
 * Offline-first data access layer for Counterpoint.
 *
 * Source of truth on the till is always localStorage. Sales, stock, staff and
 * audit entries are written locally first so a network drop cannot interrupt
 * checkout. When VITE_API_BASE_URL or Supabase is configured, mutations are also
 * queued and flushed to the cloud when the browser is back online.
 */

const STORAGE_KEY = 'counterpoint:v2';
const QUEUE_KEY = 'counterpoint:sync-queue:v1';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const isRemote = Boolean(API_BASE);

let cache = null;
const syncListeners = new Set();

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function getLocalStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

function migrateState(state) {
  if (!state || !Array.isArray(state.products)) return { state, changed: false };
  const seedImages = new Map(
    seed.products.filter((product) => product.image).map((product) => [product.id, product.image])
  );
  let changed = false;
  const products = state.products.map((product) => {
    if (product.image || !seedImages.has(product.id)) return product;
    changed = true;
    return { ...product, image: seedImages.get(product.id) };
  });
  return { state: changed ? { ...state, products } : state, changed };
}

function loadState() {
  if (cache) return cache;
  const storage = getLocalStorage();
  const raw = storage?.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const { state, changed } = migrateState(JSON.parse(raw));
      cache = state;
      if (changed) persist();
      return cache;
    } catch {
      // corrupt local state — fall through and reseed
    }
  }
  cache = clone(seed);
  persist();
  return cache;
}

function persist() {
  const storage = getLocalStorage();
  if (!storage) return { ok: false, reason: 'unavailable' };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(cache));
    return { ok: true };
  } catch (error) {
    console.error('Failed to persist Counterpoint data locally', error);
    return { ok: false, reason: 'quota' };
  }
}

function readQueue() {
  const storage = getLocalStorage();
  const raw = storage?.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    if (queue.length === 0) storage.removeItem(QUEUE_KEY);
    else storage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to persist sync queue', error);
  }
  notifySyncListeners();
}

function notifySyncListeners() {
  const status = getSyncStatus();
  syncListeners.forEach((listener) => listener(status));
}

export function getSyncStatus() {
  const pending = readQueue().length;
  return {
    online: isBrowserOnline(),
    pending,
    mode: isRemote ? 'hybrid' : 'local',
    synced: pending === 0
  };
}

export function subscribeSyncStatus(listener) {
  syncListeners.add(listener);
  listener(getSyncStatus());
  return () => syncListeners.delete(listener);
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error(`Request to ${path} failed with ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

function enqueue(mutation) {
  const queue = readQueue();
  queue.push({ ...mutation, queuedAt: new Date().toISOString() });
  writeQueue(queue);
}

async function flushQueue() {
  if (!isRemote || !isBrowserOnline()) {
    notifySyncListeners();
    return getSyncStatus();
  }

  let queue = readQueue();
  if (queue.length === 0) {
    notifySyncListeners();
    return getSyncStatus();
  }

  const remaining = [];
  for (const mutation of queue) {
    try {
      if (mutation.token && mutation.path === '/sales' && mutation.method === 'POST') {
        await submitTillCheckout(mutation.token, mutation.body);
      } else {
        await request(mutation.path, {
          method: mutation.method,
          body: mutation.body ? JSON.stringify(mutation.body) : undefined
        });
      }
    } catch (error) {
      console.warn('Sync mutation failed; will retry later', mutation, error);
      remaining.push(mutation);
      // Keep order — stop on first failure so later mutations stay queued behind it
      remaining.push(...queue.slice(queue.indexOf(mutation) + 1));
      break;
    }
  }

  writeQueue(remaining);
  return getSyncStatus();
}

async function syncMutation(path, method, body) {
  if (!isRemote) return { savedLocally: true, synced: true };

  if (!isBrowserOnline()) {
    enqueue({ path, method, body });
    return { savedLocally: true, synced: false, queued: true };
  }

  try {
    await request(path, { method, body: body !== undefined ? JSON.stringify(body) : undefined });
    return { savedLocally: true, synced: true };
  } catch (error) {
    console.warn('Remote write failed; queued for later sync', path, error);
    enqueue({ path, method, body });
    return { savedLocally: true, synced: false, queued: true };
  }
}

function ensureOnlineFlush() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    flushQueue().catch((error) => console.warn('Queue flush failed', error));
    notifySyncListeners();
  });
  window.addEventListener('offline', () => notifySyncListeners());
}

ensureOnlineFlush();

export async function getProducts(token) {
  if (token && isBrowserOnline()) {
    try {
      const cloudProducts = await fetchTillProducts(token);
      if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
        const state = loadState();
        state.products = cloudProducts;
        persist();
        return clone(cloudProducts);
      }
    } catch (err) {
      console.warn('Could not fetch products for till from Supabase, using cache', err);
    }
  }

  const local = clone(loadState().products);
  if (!isRemote || !isBrowserOnline()) return local;
  try {
    const remote = await request('/products');
    const state = loadState();
    state.products = remote;
    persist();
    return clone(remote);
  } catch {
    return local;
  }
}

export async function saveProducts(products) {
  const state = loadState();
  state.products = products;
  const localResult = persist();
  const sync = await syncMutation('/products', 'PUT', products);
  return { products: clone(products), localResult, sync };
}

export async function getEmployees() {
  const local = clone(loadState().employees);
  if (!isRemote || !isBrowserOnline()) return local;
  try {
    const remote = await request('/employees');
    const state = loadState();
    state.employees = remote;
    persist();
    return clone(remote);
  } catch {
    return local;
  }
}

export async function saveEmployees(employees) {
  const state = loadState();
  state.employees = employees;
  const localResult = persist();
  const sync = await syncMutation('/employees', 'PUT', employees);
  return { employees: clone(employees), localResult, sync };
}

export async function getSales() {
  const local = clone(loadState().sales);
  if (!isRemote || !isBrowserOnline()) return local;
  try {
    const remote = await request('/sales');
    const state = loadState();
    state.sales = remote;
    persist();
    return clone(remote);
  } catch {
    return local;
  }
}

export async function addSale(sale, token) {
  const state = loadState();
  state.sales = [sale, ...state.sales];
  const localResult = persist();

  if (token) {
    if (isBrowserOnline()) {
      try {
        const cloudResult = await submitTillCheckout(token, sale);
        return { sale, localResult, sync: { savedLocally: true, synced: true, cloudResult } };
      } catch (err) {
        console.warn('Remote till sale sync failed, queued for later:', err);
        enqueue({ path: '/sales', method: 'POST', body: sale, token });
        return { sale, localResult, sync: { savedLocally: true, synced: false, queued: true } };
      }
    } else {
      enqueue({ path: '/sales', method: 'POST', body: sale, token });
      return { sale, localResult, sync: { savedLocally: true, synced: false, queued: true } };
    }
  }

  const sync = await syncMutation('/sales', 'POST', sale);
  return { sale, localResult, sync };
}

export async function deleteSale(saleId) {
  const state = loadState();
  state.sales = state.sales.filter((entry) => entry.id !== saleId);
  const localResult = persist();
  const sync = await syncMutation(`/sales/${saleId}`, 'DELETE');
  return { localResult, sync };
}

export async function getAuditLog() {
  const local = clone(loadState().auditLog);
  if (!isRemote || !isBrowserOnline()) return local;
  try {
    const remote = await request('/audit-log');
    const state = loadState();
    state.auditLog = remote;
    persist();
    return clone(remote);
  } catch {
    return local;
  }
}

export async function addAuditEntry(entry) {
  const state = loadState();
  state.auditLog = [entry, ...state.auditLog];
  const localResult = persist();
  const sync = await syncMutation('/audit-log', 'POST', entry);
  return { entry, localResult, sync };
}

export async function syncPendingMutations() {
  return flushQueue();
}

export const dataSource = isRemote ? 'hybrid' : 'local';
