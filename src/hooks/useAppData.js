import { useCallback, useEffect, useState } from 'react';
import * as store from '../services/store';

const initialState = {
  loading: true,
  products: [],
  employees: [],
  sales: [],
  auditLog: []
};

export function useAppData() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let cancelled = false;
    Promise.all([store.getProducts(), store.getEmployees(), store.getSales(), store.getAuditLog()]).then(
      ([products, employees, sales, auditLog]) => {
        if (cancelled) return;
        setState({ loading: false, products, employees, sales, auditLog });
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const setProducts = useCallback((next) => {
    store.saveProducts(next);
    setState((current) => ({ ...current, products: next }));
  }, []);

  const setEmployees = useCallback((next) => {
    store.saveEmployees(next);
    setState((current) => ({ ...current, employees: next }));
  }, []);

  const recordSale = useCallback((sale) => {
    store.addSale(sale);
    setState((current) => ({ ...current, sales: [sale, ...current.sales] }));
  }, []);

  const removeSale = useCallback((saleId) => {
    store.deleteSale(saleId);
    setState((current) => ({ ...current, sales: current.sales.filter((entry) => entry.id !== saleId) }));
  }, []);

  const logActivity = useCallback((text, type) => {
    const entry = { time: new Date().toISOString(), text, type };
    store.addAuditEntry(entry);
    setState((current) => ({ ...current, auditLog: [entry, ...current.auditLog] }));
  }, []);

  return { ...state, setProducts, setEmployees, recordSale, removeSale, logActivity };
}
