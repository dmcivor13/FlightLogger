import type { IFlightLookupProvider, FlightLookupResult } from './types.js';
import { FlightRadar24Provider } from './providers/FlightRadar24Provider.js';
import { NullFlightLookupProvider } from './providers/NullFlightLookupProvider.js';

// Normalise flight numbers so BA287 and BA0287 both match.
// Strips spaces, uppercases, removes leading zeros from the numeric suffix.
export function normalizeFlightNumber(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '').toUpperCase();
  return cleaned.replace(/^([A-Z]{1,3})0+(\d+)$/, '$1$2');
}

export class FlightLookupService {
  private providers: IFlightLookupProvider[];

  constructor(providers?: IFlightLookupProvider[]) {
    this.providers = providers ?? [
      new FlightRadar24Provider(),
      new NullFlightLookupProvider(),
    ];
  }

  async lookup(flightNumber: string, date: string): Promise<FlightLookupResult> {
    const normalized = normalizeFlightNumber(flightNumber);

    for (const provider of this.providers) {
      let result: FlightLookupResult;
      try {
        result = await provider.lookupByFlightNumberAndDate(normalized, date);
      } catch {
        continue;
      }
      if (result.status !== 'no_match' && result.status !== 'error') {
        return result;
      }
    }

    return { status: 'no_match', provider: 'none', matchedFlights: [] };
  }
}
