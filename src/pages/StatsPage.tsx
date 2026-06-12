import { useEffect, useState } from 'react';
import { useStats } from '../hooks/useStats';
import { StatCard } from '../components/stats/StatCard';
import { BarChartCard } from '../components/stats/BarChartCard';
import { PieChartCard } from '../components/stats/PieChartCard';
import { formatDuration } from '../utils/format';
import type { StatsHighlights } from '../types';

export function StatsPage() {
  const [passenger, setPassenger] = useState<string>('');
  const { stats, loading, error } = useStats(passenger || undefined);

  // Cache the passenger list from the first unfiltered load so the dropdown
  // options stay stable when a single-passenger view is selected.
  const [passengerOptions, setPassengerOptions] = useState<string[] | null>(null);
  useEffect(() => {
    if (passengerOptions === null && passenger === '' && stats) {
      setPassengerOptions(stats.byPassenger.map((p) => p.passenger));
    }
  }, [stats, passenger, passengerOptions]);

  if (loading && !stats) return <div className="text-center py-12 text-slate-400">Loading…</div>;
  if (error || !stats) return <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error ?? 'Failed to load stats'}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Stats</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span>Passenger:</span>
          <select
            value={passenger}
            onChange={(e) => setPassenger(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Everyone</option>
            {(passengerOptions ?? stats.byPassenger.map((p) => p.passenger)).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      <HighlightsRow highlights={stats.highlights} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Flights" value={stats.totals.flights} />
        <StatCard label="Unique Routes" value={stats.totals.uniqueRoutes} />
        <StatCard label="Airlines" value={stats.totals.uniqueAirlines} />
        <StatCard label="Aircraft Types" value={stats.totals.uniqueAircraft} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BarChartCard
          title="Flights by Year"
          data={stats.byYear.map((d) => ({ name: d.year, count: d.count }))}
          colour="#3b82f6"
        />
        <PieChartCard
          title="Class of Service"
          data={stats.byClass.map((d) => ({ name: d.class, value: d.count }))}
        />
        <BarChartCard
          title="Flights by Airline"
          data={stats.byAirline.map((d) => ({ name: d.airline, count: d.count }))}
          colour="#6366f1"
        />
        <BarChartCard
          title="Flights by Passenger"
          data={stats.byPassenger.map((d) => ({ name: d.passenger, count: d.count }))}
          colour="#10b981"
        />
        <BarChartCard
          title="Top Routes"
          data={stats.topRoutes.map((d) => ({ name: `${d.origin}→${d.destination}`, count: d.count }))}
          colour="#f59e0b"
        />
        {stats.byAircraft.length > 0 && (
          <BarChartCard
            title="Aircraft Types"
            data={stats.byAircraft.map((d) => ({ name: d.aircraft, count: d.count }))}
            colour="#ef4444"
          />
        )}
      </div>
    </div>
  );
}

function HighlightsRow({ highlights }: { highlights: StatsHighlights }) {
  const { repeatAircraft, mostFlownRoute, mostFlownAirline, totalAirMinutes, longestFlight } = highlights;
  const hasAny =
    repeatAircraft.length > 0 ||
    mostFlownRoute ||
    mostFlownAirline ||
    totalAirMinutes > 0 ||
    longestFlight;

  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {mostFlownRoute && (
        <HighlightCard
          label="Most-flown route"
          value={`${mostFlownRoute.origin} → ${mostFlownRoute.destination}`}
          sub={`${mostFlownRoute.count} flights`}
        />
      )}
      {mostFlownAirline && (
        <HighlightCard
          label="Most-flown airline"
          value={mostFlownAirline.airline}
          sub={`${mostFlownAirline.count} flights`}
        />
      )}
      {totalAirMinutes > 0 && (
        <HighlightCard
          label="Total time in air"
          value={formatDuration(totalAirMinutes)}
        />
      )}
      {longestFlight && (
        <HighlightCard
          label="Longest flight"
          value={`${longestFlight.origin} → ${longestFlight.destination}`}
          sub={`${formatDuration(longestFlight.durationMinutes)} · ${longestFlight.date}`}
        />
      )}
      {repeatAircraft.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:col-span-2 lg:col-span-4">
          <div className="text-sm text-slate-500 mb-2">Repeat aircraft</div>
          <div className="flex flex-wrap gap-2">
            {repeatAircraft.map((a) => (
              <span
                key={a.registration}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-sm font-medium"
              >
                <span className="font-mono">{a.registration}</span>
                <span className="text-blue-500">×{a.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
