import { Link } from 'react-router-dom';
import type { TripRecord } from '../../types';
import { summariseTrip } from '../../utils/tripSummary';

export function TripCard({ trip }: { trip: TripRecord }) {
  const { dateRange, routeChain, passengerNames } = summariseTrip(trip.flights);
  const legs = trip.flights.length;

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900 truncate">{trip.name}</div>
          {routeChain && (
            <div className="text-sm text-slate-600 mt-1 truncate">{routeChain}</div>
          )}
          {trip.notes && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-1">{trip.notes}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-slate-700">{dateRange || '—'}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {legs} flight{legs !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {passengerNames.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {passengerNames.map((name) => (
            <span
              key={name}
              className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
