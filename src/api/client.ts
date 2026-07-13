import type {
  FlightPayload,
  FlightRecord,
  FlightsFilter,
  StatsResponse,
  ImportPreviewResponse,
  ImportCommitResponse,
  FlightLookupResult,
  TripPayload,
  TripRecord,
  TripSuggestion,
} from '../types';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getFlights(filter: FlightsFilter = {}): Promise<FlightRecord[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  const res = await fetch(`/api/flights${qs ? `?${qs}` : ''}`);
  const data = await handleResponse<{ flights: FlightRecord[] }>(res);
  return data.flights;
}

export async function getFlight(id: number): Promise<FlightRecord> {
  const res = await fetch(`/api/flights/${id}`);
  return handleResponse<FlightRecord>(res);
}

export async function createFlight(payload: FlightPayload): Promise<FlightRecord> {
  const res = await fetch('/api/flights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<FlightRecord>(res);
}

export async function updateFlight(id: number, payload: FlightPayload): Promise<FlightRecord> {
  const res = await fetch(`/api/flights/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<FlightRecord>(res);
}

export async function deleteFlight(id: number): Promise<void> {
  const res = await fetch(`/api/flights/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}

export async function getTrips(): Promise<TripRecord[]> {
  const res = await fetch('/api/trips');
  const data = await handleResponse<{ trips: TripRecord[] }>(res);
  return data.trips;
}

export async function getTrip(id: number): Promise<TripRecord> {
  const res = await fetch(`/api/trips/${id}`);
  return handleResponse<TripRecord>(res);
}

export async function createTrip(payload: TripPayload): Promise<TripRecord> {
  const res = await fetch('/api/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<TripRecord>(res);
}

export async function updateTrip(id: number, payload: TripPayload): Promise<TripRecord> {
  const res = await fetch(`/api/trips/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<TripRecord>(res);
}

export async function deleteTrip(id: number): Promise<void> {
  const res = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}

export async function addFlightsToTrip(tripId: number, flightIds: number[]): Promise<TripRecord> {
  const res = await fetch(`/api/trips/${tripId}/flights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flight_ids: flightIds }),
  });
  return handleResponse<TripRecord>(res);
}

export async function removeFlightFromTrip(tripId: number, flightId: number): Promise<TripRecord> {
  const res = await fetch(`/api/trips/${tripId}/flights/${flightId}`, { method: 'DELETE' });
  return handleResponse<TripRecord>(res);
}

export async function getTripSuggestions(): Promise<TripSuggestion[]> {
  const res = await fetch('/api/trips/suggestions');
  const data = await handleResponse<{ suggestions: TripSuggestion[] }>(res);
  return data.suggestions;
}

export async function lookupFlight(flightNumber: string, date: string): Promise<FlightLookupResult> {
  const params = new URLSearchParams({ flightNumber, date });
  const res = await fetch(`/api/lookup?${params}`);
  return handleResponse<FlightLookupResult>(res);
}

export async function getStats(passenger?: string): Promise<StatsResponse> {
  const qs = passenger ? `?passenger=${encodeURIComponent(passenger)}` : '';
  const res = await fetch(`/api/stats${qs}`);
  return handleResponse<StatsResponse>(res);
}

export async function importPreview(file: File, passenger: string): Promise<ImportPreviewResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('passenger', passenger);
  const res = await fetch('/api/import/preview', { method: 'POST', body: form });
  return handleResponse<ImportPreviewResponse>(res);
}

export async function importCommit(token: string): Promise<ImportCommitResponse> {
  const res = await fetch('/api/import/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return handleResponse<ImportCommitResponse>(res);
}
