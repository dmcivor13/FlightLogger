import { Link } from 'react-router-dom';
import type { FlightRecord } from '../../types';
import { lookupAirport } from '../../utils/airports';

const CLASS_COLOURS: Record<string, string> = {
  Economy: 'bg-slate-100 text-slate-700',
  'Premium Economy': 'bg-indigo-100 text-indigo-700',
  Business: 'bg-blue-100 text-blue-700',
  First: 'bg-amber-100 text-amber-700',
};

const REASON_COLOURS: Record<string, string> = {
  Business: 'bg-violet-100 text-violet-700',
  Leisure: 'bg-green-100 text-green-700',
};

export function FlightCard({ flight }: { flight: FlightRecord }) {
  const origin = lookupAirport(flight.origin_iata);
  const destination = lookupAirport(flight.destination_iata);
  return (
    <Link
      to={`/flights/${flight.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span>{flight.origin_iata}</span>
            <span className="text-slate-400">→</span>
            <span>{flight.destination_iata}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
            {origin && (
              <div className="truncate">
                <span className="font-mono text-slate-400">{flight.origin_iata}</span>{' '}
                {origin.name} · {origin.city}, {origin.country}
              </div>
            )}
            {destination && (
              <div className="truncate">
                <span className="font-mono text-slate-400">{flight.destination_iata}</span>{' '}
                {destination.name} · {destination.city}, {destination.country}
              </div>
            )}
          </div>
          <div className="text-sm text-slate-600 mt-1">
            {flight.airline_name}
            {flight.flight_number && ` · ${flight.flight_number}`}
            {flight.aircraft_type && ` · ${flight.aircraft_type}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-slate-700">{flight.flight_date}</div>
          {flight.scheduled_departure && (
            <div className="text-xs text-slate-500">
              {flight.scheduled_departure}
              {flight.scheduled_arrival && ` – ${flight.scheduled_arrival}`}
            </div>
          )}
        </div>
      </div>

      {flight.passengers.length > 0 && (
        <div className="mt-3 space-y-1">
          {flight.passengers.map((p) => (
            <div key={p.name} className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {p.name}
              </span>
              {p.seat && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  Seat {p.seat}
                </span>
              )}
              {p.class && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLASS_COLOURS[p.class] ?? 'bg-slate-100 text-slate-700'}`}>
                  {p.class}
                </span>
              )}
              {p.reason && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REASON_COLOURS[p.reason] ?? 'bg-slate-100 text-slate-700'}`}>
                  {p.reason}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {flight.passengers.some((p) => p.notes) && (
        <p className="text-sm text-slate-500 mt-2 line-clamp-1">
          {flight.passengers.find((p) => p.notes)?.notes}
        </p>
      )}
    </Link>
  );
}
