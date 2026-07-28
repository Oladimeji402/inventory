import seed from '../data/seed.json';

/**
 * Data access layer for Counterpoint.
 *
 * Every export here returns a Promise, even though today it just reads and
 * writes a namespaced blob in localStorage (seeded from src/data/seed.json
 * on first run). Components never touch localStorage directly.
 *
 * To switch to a real backend later:
 *   1. Set VITE_API_BASE_URL in .env (see .env.example).
 *   2. Nothing else changes — every function below already branches on
 *      `isRemote` and calls `request(...)` with the same shape a REST API
 *      would expect. Point it at your endpoints and remove the local
 *      branch once you trust it.
 */

const STORAGE_KEY = 'counterpoint:v2';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const isRemote = Boolean(API_BASE);

let cache = null;

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

function loadState() {
  if (cache) return cache;
  const storage = getLocalStorage();
  const raw = storage?.getItem(STORAGE_KEY);
  if (raw) {
    try {
      cache = JSON.parse(raw);
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
  storage?.setItem(STORAGE_KEY, JSON.stringify(cache));
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

export async function getProducts() {
  if (isRemote) return request('/products');
  return clone(loadState().products);
}

export async function saveProducts(products) {
  if (isRemote) return request('/products', { method: 'PUT', body: JSON.stringify(products) });
  const state = loadState();
  state.products = products;
  persist();
  return clone(products);
}

export async function getEmployees() {
  if (isRemote) return request('/employees');
  return clone(loadState().employees);
}

export async function saveEmployees(employees) {
  if (isRemote) return request('/employees', { method: 'PUT', body: JSON.stringify(employees) });
  const state = loadState();
  state.employees = employees;
  persist();
  return clone(employees);
}

export async function getSales() {
  if (isRemote) return request('/sales');
  return clone(loadState().sales);
}

export async function addSale(sale) {
  if (isRemote) return request('/sales', { method: 'POST', body: JSON.stringify(sale) });
  const state = loadState();
  state.sales = [sale, ...state.sales];
  persist();
  return sale;
}

export async function deleteSale(saleId) {
  if (isRemote) return request(`/sales/${saleId}`, { method: 'DELETE' });
  const state = loadState();
  state.sales = state.sales.filter((entry) => entry.id !== saleId);
  persist();
}

export async function getAuditLog() {
  if (isRemote) return request('/audit-log');
  return clone(loadState().auditLog);
}

export async function addAuditEntry(entry) {
  if (isRemote) return request('/audit-log', { method: 'POST', body: JSON.stringify(entry) });
  const state = loadState();
  state.auditLog = [entry, ...state.auditLog];
  persist();
  return entry;
}

export async function resetDemoData() {
  getLocalStorage()?.removeItem(STORAGE_KEY);
  cache = null;
}

export const dataSource = isRemote ? 'remote' : 'local';
