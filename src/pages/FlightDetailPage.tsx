import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFlight } from '../hooks/useFlight';
import { FlightForm } from '../components/flights/FlightForm';
import { updateFlight, deleteFlight } from '../api/client';
import type { FlightPayload } from '../types';

const CLASS_COLOURS: Record<string, string> = {
  Economy: 'bg-slate-100 text-slate-700',
  'Premium Economy': 'bg-indigo-100 text-indigo-700',
  Business: 'bg-blue-100 text-blue-700',
  'US Domestic First': 'bg-cyan-100 text-cyan-700',
  First: 'bg-amber-100 text-amber-700',
};

const REASON_COLOURS: Record<string, string> = {
  Business: 'bg-violet-100 text-violet-700',
  Leisure: 'bg-green-100 text-green-700',
};

export function FlightDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { flight, loading, error } = useFlight(id ? parseInt(id, 10) : null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading…</div>;
  if (error || !flight) return <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error ?? 'Not found'}</div>;

  async function handleUpdate(data: FlightPayload) {
    await updateFlight(flight!.id, data);
    setEditing(false);
    navigate(0); // reload
  }

  async function handleDelete() {
    await deleteFlight(flight!.id);
    navigate('/flights');
  }

  if (editing) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Flight</h1>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <FlightForm initialValues={flight} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {flight.origin_iata} → {flight.destination_iata}
          </h1>
          <p className="text-slate-500 mt-1">
            {flight.airline_name}
            {flight.flight_number && ` · ${flight.flight_number}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Edit</button>
          <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm">Delete</button>
        </div>
      </div>

      {confirmDelete && (
        <div className="rounded-xl bg-red-50 border border-red-300 p-4">
          <p className="text-red-800 font-medium mb-3">Delete this flight? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="btn-danger text-sm">Yes, delete</button>
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        <DetailRow label="Date">{flight.flight_date}</DetailRow>
        <DetailRow label="Route">{flight.origin_iata} → {flight.destination_iata}</DetailRow>
        {(flight.scheduled_departure || flight.scheduled_arrival) && (
          <DetailRow label="Scheduled">
            {flight.scheduled_departure ?? '—'}{flight.scheduled_arrival ? ` – ${flight.scheduled_arrival}` : ''}
          </DetailRow>
        )}
        {(flight.actual_departure || flight.actual_arrival) && (
          <DetailRow label="Actual">
            {flight.actual_departure ?? '—'}{flight.actual_arrival ? ` – ${flight.actual_arrival}` : ''}
          </DetailRow>
        )}
        {flight.aircraft_type && <DetailRow label="Aircraft">{flight.aircraft_type}</DetailRow>}
        {flight.aircraft_registration && <DetailRow label="Registration">{flight.aircraft_registration}</DetailRow>}
        {flight.duration_minutes && (
          <DetailRow label="Duration">
            {Math.floor(flight.duration_minutes / 60)}h {flight.duration_minutes % 60}m
          </DetailRow>
        )}
        {flight.passengers.length > 0 && (
          <DetailRow label="Passengers">
            <div className="space-y-2 w-full">
              {flight.passengers.map((p) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-800">{p.name}</span>
                    {p.seat && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        Seat {p.seat}
                      </span>
                    )}
                    {p.class && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLASS_COLOURS[p.class] ?? ''}`}>
                        {p.class}
                      </span>
                    )}
                    {p.reason && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REASON_COLOURS[p.reason] ?? ''}`}>
                        {p.reason}
                      </span>
                    )}
                  </div>
                  {p.notes && (
                    <p className="text-xs text-slate-500 ml-0.5">{p.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </DetailRow>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex px-4 py-3 gap-4">
      <span className="text-sm text-slate-500 w-28 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 flex-1">{children}</span>
    </div>
  );
}
