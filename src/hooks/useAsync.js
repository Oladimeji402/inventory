import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs `loader` on mount (and whenever deps change). Resolves `{data}` shapes or raw values. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const alive = useRef(true);

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const result = await loaderRef.current();
      if (alive.current) setState({ data: result?.data ?? result, error: '', loading: false });
    } catch (err) {
      if (alive.current) setState((s) => ({ ...s, error: err.message || 'Something went wrong.', loading: false }));
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload };
}
