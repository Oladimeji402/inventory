import { useEffect, useMemo, useState } from 'react';
import { NIGERIA_STATES } from '../lib/merchantConstants';
import { getNigeriaCities, getNigeriaStates } from '../lib/nigeriaLocations';

const fallbackStates = NIGERIA_STATES.map((name) => ({ name, slug: null }));

export function useNigeriaLocations(selectedState) {
  const [states, setStates] = useState(fallbackStates);
  const [cities, setCities] = useState([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getNigeriaStates()
      .then((list) => {
        if (!cancelled && list.length) setStates(list);
      })
      .catch(() => {
        if (!cancelled) setStates(fallbackStates);
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => states.find((item) => item.name === selectedState),
    [states, selectedState]
  );

  useEffect(() => {
    if (!selected?.slug) {
      setCities([]);
      setCitiesLoading(false);
      setCitiesError(false);
      return undefined;
    }

    let cancelled = false;
    setCitiesLoading(true);
    setCitiesError(false);
    getNigeriaCities(selected.slug)
      .then((list) => {
        if (!cancelled) setCities(list);
      })
      .catch(() => {
        if (!cancelled) {
          setCities([]);
          setCitiesError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.slug]);

  return {
    states: states.map((item) => item.name),
    cities,
    statesLoading,
    citiesLoading,
    citiesError
  };
}
