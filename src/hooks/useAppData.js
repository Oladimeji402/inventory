import { useCallback, useEffect, useState } from 'react';
import * as store from '../services/store';

const initialState = {
  loading: true,
  products: [],
  employees: [],
  sales: [],
  auditLog: [],
  syncStatus: store.getSyncStatus()
};

export function useAppData(sessionToken = null) {
  const [state, setState] = useState(initialState);

  const loadData = useCallback(async (token) => {
    try {
      const [products, employees, sales, auditLog] = await Promise.all([
        store.getProducts(token),
        store.getEmployees(),
        store.getSales(),
        store.getAuditLog()
      ]);
      setState((current) => ({
        ...current,
        loading: false,
        products,
        employees,
        sales,
        auditLog,
        syncStatus: store.getSyncStatus()
      }));
    } catch (error) {
      console.error('Failed to load till data', error);
      setState((current) => ({ ...current, loading: false, syncStatus: store.getSyncStatus() }));
    }
  }, []);

  useEffect(() => {
    loadData(sessionToken);

    const unsubscribe = store.subscribeSyncStatus((syncStatus) => {
      setState((current) => ({ ...current, syncStatus }));
    });

    const flush = () => {
      store.syncPendingMutations().catch((error) => console.warn('Pending sync flush failed', error));
    };
    window.addEventListener('online', flush);

    return () => {
      unsubscribe();
      window.removeEventListener('online', flush);
    };
  }, [sessionToken, loadData]);

  const setProducts = useCallback((next) => {
    store.saveProducts(next);
    setState((current) => ({ ...current, products: next, syncStatus: store.getSyncStatus() }));
  }, []);

  const setEmployees = useCallback((next) => {
    store.saveEmployees(next);
    setState((current) => ({ ...current, employees: next, syncStatus: store.getSyncStatus() }));
  }, []);

  const recordSale = useCallback(async (sale, tokenOverride = null) => {
    const token = tokenOverride || sessionToken;
    const result = await store.addSale(sale, token);
    setState((current) => ({
      ...current,
      sales: [sale, ...current.sales],
      syncStatus: store.getSyncStatus()
    }));
    return result;
  }, [sessionToken]);

  const removeSale = useCallback((saleId) => {
    store.deleteSale(saleId);
    setState((current) => ({
      ...current,
      sales: current.sales.filter((entry) => entry.id !== saleId),
      syncStatus: store.getSyncStatus()
    }));
  }, []);

  const logActivity = useCallback((text, type) => {
    const entry = { time: new Date().toISOString(), text, type };
    store.addAuditEntry(entry);
    setState((current) => ({
      ...current,
      auditLog: [entry, ...current.auditLog],
      syncStatus: store.getSyncStatus()
    }));
  }, []);

  return { ...state, setProducts, setEmployees, recordSale, removeSale, logActivity };
}
