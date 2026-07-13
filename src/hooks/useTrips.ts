import { useState, useEffect, useCallback } from 'react';
import { getTrips } from '../api/client';
import type { TripRecord } from '../types';

export function useTrips() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTrips(await getTrips());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { trips, loading, error, reload: load };
}
