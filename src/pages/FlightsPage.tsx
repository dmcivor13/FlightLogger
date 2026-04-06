import { Link, useSearchParams } from 'react-router-dom';
import { FilterBar } from '../components/flights/FilterBar';
import { FlightCard } from '../components/flights/FlightCard';
import { useFlights } from '../hooks/useFlights';
import type { FlightsFilter } from '../types';

export function FlightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: FlightsFilter = {
    q:           searchParams.get('q')           ?? undefined,
    dateFrom:    searchParams.get('dateFrom')    ?? undefined,
    dateTo:      searchParams.get('dateTo')      ?? undefined,
    origin:      searchParams.get('origin')      ?? undefined,
    destination: searchParams.get('destination') ?? undefined,
    airline:     searchParams.get('airline')     ?? undefined,
    aircraft:    searchParams.get('aircraft')    ?? undefined,
    class:       searchParams.get('class')       ?? undefined,
    passenger:   searchParams.get('passenger')   ?? undefined,
  };

  // Remove undefined keys
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined),
  ) as FlightsFilter;

  function handleFilterChange(next: FlightsFilter) {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(next)) {
      if (v) params[k] = v;
    }
    setSearchParams(params);
  }

  const { flights, loading, error } = useFlights(activeFilters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Flights</h1>
        <Link to="/flights/new" className="btn-primary text-sm">
          + Add Flight
        </Link>
      </div>

      <FilterBar filters={activeFilters} onChange={handleFilterChange} />

      {loading && (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
      )}
      {!loading && !error && flights.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No flights found.{' '}
          <Link to="/flights/new" className="text-blue-600 underline">Add your first flight</Link>
        </div>
      )}
      <div className="space-y-3">
        {flights.map((f) => (
          <FlightCard key={f.id} flight={f} />
        ))}
      </div>
    </div>
  );
}
