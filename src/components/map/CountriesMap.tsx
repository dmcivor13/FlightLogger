import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import type { CountryStats } from './mapUtils';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface Props {
  visitedGeoNames: Set<string>;
  stats: CountryStats;
}

export function CountriesMap({ visitedGeoNames, stats }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <ComposableMap
          projection="geoNaturalEarth1"
          projectionConfig={{ scale: 160 }}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => {
                const visited = visitedGeoNames.has(geo.properties.name);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={visited ? '#3b82f6' : '#e2e8f0'}
                    stroke={visited ? '#2563eb' : '#cbd5e1'}
                    strokeWidth={0.5}
                    style={{ outline: 'none' }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Countries visited" value={stats.total} />
        <StatCard label="Continents" value={stats.continents} />
        <StatCard
          label="Most visited"
          value={stats.mostVisited ? stats.mostVisited.country : '—'}
          sub={stats.mostVisited ? `${stats.mostVisited.visits} flights` : undefined}
        />
        <StatCard
          label="New this year"
          value={stats.newThisYear}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-xl font-bold text-slate-900 truncate">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
