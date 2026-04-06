import { useState, useEffect, useCallback } from 'react';
import { getFlights } from '../api/client';
import type { FlightRecord, FlightsFilter } from '../types';

export function useFlights(filter: FlightsFilter = {}) {
  const [flights, setFlights] = useState<FlightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFlights(filter);
      setFlights(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load flights');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filter)]);

  useEffect(() => { load(); }, [load]);

  return { flights, loading, error, reload: load };
}
