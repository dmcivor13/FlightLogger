import { useState, useEffect, useCallback } from 'react';
import { getTrip } from '../api/client';
import type { TripRecord } from '../types';

export function useTrip(id: number | null) {
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [loading, setLoading] = useState(id !== null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (id === null) return;
    setLoading(true);
    setError(null);
    try {
      setTrip(await getTrip(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trip');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { trip, loading, error, reload: load };
}
