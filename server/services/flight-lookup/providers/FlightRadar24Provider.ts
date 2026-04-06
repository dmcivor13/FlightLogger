import type { IFlightLookupProvider, FlightLookupResult, NormalizedFlightCandidate } from '../types.js';
import { mapFr24Flight } from '../mappers/flightRadar24Mapper.js';

// FlightRadar24 unofficial public API.
// No API key required for basic queries but subject to rate-limiting and change.
// Treat all responses as best-effort; any network or parse error degrades to no_match.

const BASE = 'https://api.flightradar24.com/common/v1/flight/list.json';
const USER_AGENT = 'Mozilla/5.0 (compatible; FlightLogger/1.0)';

export class FlightRadar24Provider implements IFlightLookupProvider {
  readonly name = 'flightradar24';

  async lookupByFlightNumberAndDate(
    flightNumber: string,
    date: string,
  ): Promise<FlightLookupResult> {
    const normalizedNumber = flightNumber.replace(/\s+/g, '').toUpperCase();

    const url = new URL(BASE);
    url.searchParams.set('fetchBy', 'flight');
    url.searchParams.set('query', normalizedNumber);
    url.searchParams.set('limit', '10');

    let raw: unknown;
    try {
      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        return { status: 'no_match', provider: this.name, matchedFlights: [] };
      }

      raw = await res.json();
    } catch {
      return { status: 'no_match', provider: this.name, matchedFlights: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = raw as any;
    const entries: unknown[] = data?.result?.response?.data ?? [];

    if (!Array.isArray(entries) || entries.length === 0) {
      return { status: 'no_match', provider: this.name, matchedFlights: [] };
    }

    // Filter by date: FR24 returns the most recent flights for this number.
    // Match on the scheduled departure date (UTC date from Unix timestamp).
    const filtered = entries.filter((e: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const schedDep = (e as any)?.time?.scheduled?.departure;
      if (!schedDep) return true; // can't filter — include optimistically
      const depDate = new Date(schedDep * 1000).toISOString().slice(0, 10);
      return depDate === date;
    });

    const candidates: NormalizedFlightCandidate[] = filtered.map((e) =>
      mapFr24Flight(e, date),
    );

    if (candidates.length === 0) {
      return { status: 'no_match', provider: this.name, matchedFlights: [] };
    }

    const status = candidates.length === 1 ? 'success' : 'multiple_matches';
    return { status, provider: this.name, matchedFlights: candidates };
  }
}
