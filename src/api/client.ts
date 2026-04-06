import type {
  FlightPayload,
  FlightRecord,
  FlightsFilter,
  StatsResponse,
  ImportPreviewResponse,
  ImportCommitResponse,
  FlightLookupResult,
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

export async function lookupFlight(flightNumber: string, date: string): Promise<FlightLookupResult> {
  const params = new URLSearchParams({ flightNumber, date });
  const res = await fetch(`/api/lookup?${params}`);
  return handleResponse<FlightLookupResult>(res);
}

export async function getStats(): Promise<StatsResponse> {
  const res = await fetch('/api/stats');
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
