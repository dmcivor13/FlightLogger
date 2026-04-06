import { useStats } from '../hooks/useStats';
import { StatCard } from '../components/stats/StatCard';
import { BarChartCard } from '../components/stats/BarChartCard';
import { PieChartCard } from '../components/stats/PieChartCard';

export function StatsPage() {
  const { stats, loading, error } = useStats();

  if (loading) return <div className="text-center py-12 text-slate-400">Loading…</div>;
  if (error || !stats) return <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error ?? 'Failed to load stats'}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Stats</h1>

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
