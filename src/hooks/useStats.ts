import { useState, useEffect } from 'react';
import { getStats } from '../api/client';
import type { StatsResponse } from '../types';

export function useStats(passenger?: string) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getStats(passenger)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, [passenger]);

  return { stats, loading, error };
}
