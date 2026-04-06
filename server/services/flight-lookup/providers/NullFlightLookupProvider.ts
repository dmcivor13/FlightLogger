import type { IFlightLookupProvider, FlightLookupResult } from '../types.js';

export class NullFlightLookupProvider implements IFlightLookupProvider {
  readonly name = 'null';

  async lookupByFlightNumberAndDate(
    _flightNumber: string,
    _date: string,
  ): Promise<FlightLookupResult> {
    return { status: 'no_match', provider: this.name, matchedFlights: [] };
  }
}
