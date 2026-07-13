import { useTrips } from '../hooks/useTrips';
import { useTripSuggestions } from '../hooks/useTripSuggestions';
import { TripCard } from '../components/trips/TripCard';
import { SuggestedTripCard } from '../components/trips/SuggestedTripCard';

export function TripsPage() {
  const { trips, loading, error, reload } = useTrips();
  const { suggestions, reload: reloadSuggestions } = useTripSuggestions();

  function handleAccepted() {
    reload();
    reloadSuggestions();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Trips</h1>

      {suggestions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Suggested trips
          </h2>
          {suggestions.map((s) => (
            <SuggestedTripCard
              key={s.flight_ids.join('-')}
              suggestion={s}
              onAccepted={handleAccepted}
            />
          ))}
        </section>
      )}

      {loading && <div className="text-center py-12 text-slate-400">Loading…</div>}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
      )}
      {!loading && !error && trips.length === 0 && suggestions.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No trips yet. Trips group your flights into journeys — suggestions appear here once you
          have unassigned flights, or assign flights to a trip from a flight's detail page.
        </div>
      )}

      <div className="space-y-3">
        {trips.map((t) => (
          <TripCard key={t.id} trip={t} />
        ))}
      </div>
    </div>
  );
}
