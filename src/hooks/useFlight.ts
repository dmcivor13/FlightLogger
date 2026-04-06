import { useState, useEffect } from 'react';
import { getFlight } from '../api/client';
import type { FlightRecord } from '../types';

export function useFlight(id: number | null) {
  const [flight, setFlight] = useState<FlightRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    setLoading(true);
    setError(null);
    getFlight(id)
      .then(setFlight)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load flight'))
      .finally(() => setLoading(false));
  }, [id]);

  return { flight, loading, error };
}
