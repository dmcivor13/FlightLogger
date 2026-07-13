import { useState } from 'react';
import type { TripSuggestion } from '../../types';
import { createTrip } from '../../api/client';
import { summariseTrip } from '../../utils/tripSummary';

interface Props {
  suggestion: TripSuggestion;
  onAccepted: () => void;
}

export function SuggestedTripCard({ suggestion, onAccepted }: Props) {
  const [name, setName] = useState(suggestion.name);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { routeChain } = summariseTrip(suggestion.flights);

  if (dismissed) return null;

  async function handleAccept() {
    setSaving(true);
    setError(null);
    try {
      await createTrip({ name: name.trim() || suggestion.name, flight_ids: suggestion.flight_ids });
      onAccepted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create trip');
      setSaving(false);
    }
  }

  return (
    <div className="bg-blue-50/50 border border-blue-200 border-dashed rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Trip name"
            className="w-full sm:max-w-sm rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-sm text-slate-600 mt-2 truncate">{routeChain}</div>
          <div className="mt-2 space-y-0.5">
            {suggestion.flights.map((f) => (
              <div key={f.id} className="text-xs text-slate-500">
                {f.flight_date} · {f.origin_iata} → {f.destination_iata}
                {f.flight_number && ` · ${f.flight_number}`}
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handleAccept} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Creating…' : 'Create trip'}
          </button>
          <button onClick={() => setDismissed(true)} className="btn-secondary text-sm">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
