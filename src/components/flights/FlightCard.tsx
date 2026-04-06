import { Link } from 'react-router-dom';
import type { FlightRecord } from '../../types';

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
  return (
    <Link
      to={`/flights/${flight.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span>{flight.origin_iata}</span>
            <span className="text-slate-400">→</span>
            <span>{flight.destination_iata}</span>
          </div>
          <div className="text-sm text-slate-600 mt-0.5">
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
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {flight.class && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLASS_COLOURS[flight.class] ?? 'bg-slate-100 text-slate-700'}`}>
            {flight.class}
          </span>
        )}
        {flight.reason && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REASON_COLOURS[flight.reason] ?? 'bg-slate-100 text-slate-700'}`}>
            {flight.reason}
          </span>
        )}
        {flight.seat && (
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
            Seat {flight.seat}
          </span>
        )}
        {flight.passengers.map((p) => (
          <span key={p} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {p}
          </span>
        ))}
      </div>
      {flight.notes && (
        <p className="text-sm text-slate-500 mt-2 line-clamp-1">{flight.notes}</p>
      )}
    </Link>
  );
}
