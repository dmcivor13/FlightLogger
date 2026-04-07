import { useState, useEffect } from 'react';
import { RouteMap } from '../components/map/RouteMap';
import { getFlights } from '../api/client';

interface Route {
  origin: string;
  destination: string;
  count: number;
}

export function MapPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFlights()
      .then((flights) => {
        const counts = new Map<string, number>();
        for (const f of flights) {
          const key = `${f.origin_iata}|${f.destination_iata}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const r: Route[] = [];
        counts.forEach((count, key) => {
          const [origin, destination] = key.split('|');
          r.push({ origin, destination, count });
        });
        setRoutes(r.sort((a, b) => b.count - a.count));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load flights'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading…</div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Route Map</h1>
        <span className="text-sm text-slate-500">{routes.length} unique routes</span>
      </div>
      {routes.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No flights logged yet.</div>
      ) : (
        <RouteMap routes={routes} />
      )}
      {routes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {routes.slice(0, 20).map((r) => (
            <div key={`${r.origin}-${r.destination}`} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="font-medium">{r.origin} → {r.destination}</span>
              <span className="text-slate-500">{r.count}×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
