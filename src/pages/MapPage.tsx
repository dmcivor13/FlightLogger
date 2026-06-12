import { useState, useEffect, useMemo } from 'react';
import { RouteMap } from '../components/map/RouteMap';
import { AirportPanel } from '../components/map/AirportPanel';
import { CountriesMap } from '../components/map/CountriesMap';
import { computeVisitedCountries } from '../components/map/mapUtils';
import { getFlights } from '../api/client';
import type { FlightRecord } from '../types';

type View = 'routes' | 'countries';

interface Route {
  origin: string;
  destination: string;
  count: number;
}

export function MapPage() {
  const [flights, setFlights] = useState<FlightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>('routes');
  const [passenger, setPassenger] = useState('');
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);

  useEffect(() => {
    getFlights()
      .then(setFlights)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load flights'))
      .finally(() => setLoading(false));
  }, []);

  const passengerOptions = useMemo(() => {
    const names = new Set<string>();
    for (const f of flights) {
      for (const p of f.passengers) names.add(p.name);
    }
    return Array.from(names).sort();
  }, [flights]);

  const filteredFlights = useMemo(
    () =>
      passenger
        ? flights.filter((f) => f.passengers.some((p) => p.name === passenger))
        : flights,
    [flights, passenger],
  );

  const routes = useMemo<Route[]>(() => {
    const counts = new Map<string, number>();
    for (const f of filteredFlights) {
      const key = `${f.origin_iata}|${f.destination_iata}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const r: Route[] = [];
    counts.forEach((count, key) => {
      const [origin, destination] = key.split('|');
      r.push({ origin, destination, count });
    });
    return r.sort((a, b) => b.count - a.count);
  }, [filteredFlights]);

  const { data: countriesData, stats: countryStats } = useMemo(
    () => computeVisitedCountries(filteredFlights, new Date().getFullYear()),
    [filteredFlights],
  );

  const handleAirportClick = (iata: string) => {
    setSelectedAirport((prev) => (prev === iata ? null : iata));
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading…</div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Map</h1>

        <div className="flex items-center gap-3 flex-wrap">
          {passengerOptions.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span>Passenger:</span>
              <select
                value={passenger}
                onChange={(e) => {
                  setPassenger(e.target.value);
                  setSelectedAirport(null);
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Everyone</option>
                {passengerOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
          )}

          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <button
              onClick={() => setView('routes')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                view === 'routes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Routes
            </button>
            <button
              onClick={() => setView('countries')}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-200 ${
                view === 'countries'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Countries
            </button>
          </div>
        </div>
      </div>

      {filteredFlights.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No flights logged yet.</div>
      ) : view === 'countries' ? (
        <CountriesMap visitedGeoNames={countriesData.visitedGeoNames} stats={countryStats} />
      ) : (
        <>
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <RouteMap
                routes={routes}
                selectedAirport={selectedAirport}
                onAirportClick={handleAirportClick}
              />
            </div>
            {selectedAirport && (
              <div className="w-64 shrink-0">
                <AirportPanel
                  iata={selectedAirport}
                  flights={filteredFlights}
                  onClose={() => setSelectedAirport(null)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-slate-500 px-1">
            <span>{routes.length} unique route{routes.length !== 1 ? 's' : ''}</span>
            {selectedAirport && (
              <button
                onClick={() => setSelectedAirport(null)}
                className="text-blue-600 hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>

          {routes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {routes.slice(0, 20).map((r) => (
                <button
                  key={`${r.origin}-${r.destination}`}
                  onClick={() => {
                    // clicking a route row selects the origin airport
                    handleAirportClick(r.origin);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="font-medium">{r.origin} → {r.destination}</span>
                  <span className="text-slate-500">{r.count}×</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
