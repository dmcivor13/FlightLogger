import { useState, useEffect, useCallback } from 'react';
import { getTripSuggestions } from '../api/client';
import type { TripSuggestion } from '../types';

export function useTripSuggestions() {
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSuggestions(await getTripSuggestions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { suggestions, loading, error, reload: load };
}
