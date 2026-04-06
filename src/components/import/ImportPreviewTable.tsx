import { useState } from 'react';
import type { ImportPreviewResponse, FlightPayload, FlightRecord } from '../../types';

interface Props {
  preview: ImportPreviewResponse;
}

function FlightRow({ flight }: { flight: FlightPayload }) {
  return (
    <tr className="text-sm">
      <td className="px-3 py-2 font-medium">{flight.origin_iata} → {flight.destination_iata}</td>
      <td className="px-3 py-2 text-slate-600">{flight.flight_date}</td>
      <td className="px-3 py-2 text-slate-600">{flight.airline_name}{flight.flight_number ? ` · ${flight.flight_number}` : ''}</td>
      <td className="px-3 py-2 text-slate-500">{flight.seat ?? '—'}</td>
      <td className="px-3 py-2 text-slate-500">{flight.class ?? '—'}</td>
    </tr>
  );
}

function MergeRow({ existingFlight }: { existingFlight: FlightRecord }) {
  return (
    <tr className="text-sm">
      <td className="px-3 py-2 font-medium">{existingFlight.origin_iata} → {existingFlight.destination_iata}</td>
      <td className="px-3 py-2 text-slate-600">{existingFlight.flight_date}</td>
      <td className="px-3 py-2 text-slate-600">{existingFlight.airline_name}{existingFlight.flight_number ? ` · ${existingFlight.flight_number}` : ''}</td>
      <td className="px-3 py-2 text-slate-500" colSpan={2}>
        <span className="text-xs text-amber-700">Currently: {existingFlight.passengers.join(', ')}</span>
      </td>
    </tr>
  );
}

const TABLE_HEADER = (
  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
    <tr>
      <th className="px-3 py-2 text-left">Route</th>
      <th className="px-3 py-2 text-left">Date</th>
      <th className="px-3 py-2 text-left">Airline</th>
      <th className="px-3 py-2 text-left">Seat</th>
      <th className="px-3 py-2 text-left">Class</th>
    </tr>
  </thead>
);

export function ImportPreviewTable({ preview }: Props) {
  const [skippedExpanded, setSkippedExpanded] = useState(false);
  const { toCreate, toMerge, skipped } = preview;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-3 text-sm">
        {toCreate.length > 0 && (
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
            {toCreate.length} flight{toCreate.length !== 1 ? 's' : ''} will be created
          </span>
        )}
        {toMerge.length > 0 && (
          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">
            {toMerge.length} will update existing records
          </span>
        )}
        {skipped.length > 0 && (
          <button
            onClick={() => setSkippedExpanded((e) => !e)}
            className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium hover:bg-slate-200 transition-colors"
          >
            {skipped.length} skipped {skippedExpanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* New flights */}
      {toCreate.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-green-200">
          <div className="bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 border-b border-green-200">
            New Flights
          </div>
          <table className="w-full">
            {TABLE_HEADER}
            <tbody className="divide-y divide-slate-100">
              {toCreate.map((f, i) => <FlightRow key={i} flight={f} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Merge into existing */}
      {toMerge.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-amber-200">
          <div className="bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 border-b border-amber-200">
            Merge — passenger will be added to existing flights
          </div>
          <table className="w-full">
            {TABLE_HEADER}
            <tbody className="divide-y divide-slate-100">
              {toMerge.map((m, i) => <MergeRow key={i} existingFlight={m.existingFlight} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Skipped */}
      {skipped.length > 0 && skippedExpanded && (
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 border-b border-slate-200">
            Skipped — already tagged on these flights
          </div>
          <table className="w-full">
            {TABLE_HEADER}
            <tbody className="divide-y divide-slate-100">
              {skipped.map((f, i) => <FlightRow key={i} flight={f} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
