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

export function useAppData() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let cancelled = false;
    Promise.all([store.getProducts(), store.getEmployees(), store.getSales(), store.getAuditLog()])
      .then(([products, employees, sales, auditLog]) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          loading: false,
          products,
          employees,
          sales,
          auditLog,
          syncStatus: store.getSyncStatus()
        }));
      })
      .catch((error) => {
        console.error('Failed to load local till data', error);
        if (!cancelled) {
          setState((current) => ({ ...current, loading: false, syncStatus: store.getSyncStatus() }));
        }
      });

    const unsubscribe = store.subscribeSyncStatus((syncStatus) => {
      if (!cancelled) setState((current) => ({ ...current, syncStatus }));
    });

    const flush = () => {
      store.syncPendingMutations().catch((error) => console.warn('Pending sync flush failed', error));
    };
    window.addEventListener('online', flush);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('online', flush);
    };
  }, []);

  const setProducts = useCallback((next) => {
    store.saveProducts(next);
    setState((current) => ({ ...current, products: next, syncStatus: store.getSyncStatus() }));
  }, []);

  const setEmployees = useCallback((next) => {
    store.saveEmployees(next);
    setState((current) => ({ ...current, employees: next, syncStatus: store.getSyncStatus() }));
  }, []);

  const recordSale = useCallback(async (sale) => {
    const result = await store.addSale(sale);
    setState((current) => ({
      ...current,
      sales: [sale, ...current.sales],
      syncStatus: store.getSyncStatus()
    }));
    return result;
  }, []);

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
