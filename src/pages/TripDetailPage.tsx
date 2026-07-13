import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrip } from '../hooks/useTrip';
import { useFlights } from '../hooks/useFlights';
import { FlightCard } from '../components/flights/FlightCard';
import { updateTrip, deleteTrip, addFlightsToTrip, removeFlightFromTrip } from '../api/client';
import { summariseTrip } from '../utils/tripSummary';

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tripId = id ? parseInt(id, 10) : null;
  const { trip, loading, error, reload } = useTrip(tripId);
  const { flights: allFlights, reload: reloadFlights } = useFlights();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading && !trip) return <div className="text-center py-12 text-slate-400">Loading…</div>;
  if (error || !trip) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
        {error ?? 'Not found'}
      </div>
    );
  }

  const { dateRange, routeChain } = summariseTrip(trip.flights);
  const unassigned = allFlights.filter((f) => f.trip_id == null);

  function startEditing() {
    setName(trip!.name);
    setNotes(trip!.notes ?? '');
    setEditing(true);
  }

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      reload();
      reloadFlights();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  async function handleSave() {
    await run(async () => {
      await updateTrip(trip!.id, { name, notes: notes.trim() || undefined });
      setEditing(false);
    });
  }

  async function handleDelete() {
    try {
      await deleteTrip(trip!.id);
      navigate('/trips');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete trip');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        {editing ? (
          <div className="flex-1 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Trip name"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              rows={2}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={!name.trim()} className="btn-primary text-sm">
                Save
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{trip.name}</h1>
            <p className="text-slate-500 mt-1">
              {dateRange || 'No flights yet'}
              {routeChain && ` · ${routeChain}`}
            </p>
            {trip.notes && <p className="text-sm text-slate-600 mt-2">{trip.notes}</p>}
          </div>
        )}
        {!editing && (
          <div className="flex gap-2 shrink-0">
            <button onClick={startEditing} className="btn-secondary text-sm">Edit</button>
            <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm">Delete</button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="rounded-xl bg-red-50 border border-red-300 p-4">
          <p className="text-red-800 font-medium mb-3">
            Delete this trip? Its flights are kept and simply become unassigned.
          </p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="btn-danger text-sm">Yes, delete</button>
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{actionError}</div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Flights ({trip.flights.length})
        </h2>
        {trip.flights.length === 0 && (
          <div className="text-slate-400 text-sm">No flights in this trip yet.</div>
        )}
        {trip.flights.map((f) => (
          <div key={f.id} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <FlightCard flight={f} />
            </div>
            <button
              onClick={() => run(() => removeFlightFromTrip(trip.id, f.id))}
              title="Remove from trip"
              className="btn-secondary text-sm shrink-0 mt-1"
            >
              Remove
            </button>
          </div>
        ))}
      </section>

      {unassigned.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Add flights
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {unassigned.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-4 py-2 text-sm gap-3">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{f.origin_iata} → {f.destination_iata}</span>
                  <span className="text-slate-500"> · {f.flight_date}</span>
                  {f.flight_number && <span className="text-slate-500"> · {f.flight_number}</span>}
                </span>
                <button
                  onClick={() => run(() => addFlightsToTrip(trip.id, [f.id]))}
                  className="text-blue-600 hover:underline shrink-0"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
