import type { FlightRecord } from '../../types';
import { computeAirportStats } from './mapUtils';

interface Props {
  iata: string;
  flights: FlightRecord[];
  onClose: () => void;
}

function fmt(date: string | null): string {
  if (!date) return '—';
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
}

export function AirportPanel({ iata, flights, onClose }: Props) {
  const s = computeAirportStats(iata, flights);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-md">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wide">{s.iata}</div>
          <h2 className="text-base font-semibold text-slate-900 leading-tight">{s.name}</h2>
          {s.city && <div className="text-xs text-slate-500">{s.city}{s.country ? `, ${s.country}` : ''}</div>}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none shrink-0 mt-0.5"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        <Stat label="Total visits" value={s.totalVisits} />
        <Stat label="Departures" value={s.departures} />
        <Stat label="Arrivals" value={s.arrivals} />
        <Stat label="Destinations" value={s.uniqueDestinations} />
      </div>

      <div className="border-t border-slate-100 pt-2 space-y-1.5 text-sm">
        <Row label="First visit" value={fmt(s.firstVisit)} />
        <Row label="Last visit" value={fmt(s.lastVisit)} />
        {s.mostCommonRoute && (
          <Row
            label="Top route"
            value={`${s.mostCommonRoute.origin} ↔ ${s.mostCommonRoute.destination} (${s.mostCommonRoute.count}×)`}
          />
        )}
        {s.mostCommonAirline && (
          <Row
            label="Top airline"
            value={`${s.mostCommonAirline.airline} (${s.mostCommonAirline.count}×)`}
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-slate-500 text-xs">{label}</div>
      <div className="font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 text-right">{value}</span>
    </div>
  );
}
