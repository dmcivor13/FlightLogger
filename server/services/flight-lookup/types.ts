export interface NormalizedFlightCandidate {
  airlineName?: string;
  airlineIata?: string;
  flightNumber?: string;
  flightDate?: string;
  originIata?: string;
  destinationIata?: string;
  scheduledDeparture?: string;  // "HH:MM"
  scheduledArrival?: string;    // "HH:MM"
  actualDeparture?: string;     // "HH:MM"
  actualArrival?: string;       // "HH:MM"
  aircraftType?: string;
  aircraftRegistration?: string;
}

export type LookupStatus = 'success' | 'partial' | 'no_match' | 'multiple_matches' | 'error';

export interface FlightLookupResult {
  status: LookupStatus;
  provider: string;
  matchedFlights: NormalizedFlightCandidate[];
  errorMessage?: string;
}

export interface IFlightLookupProvider {
  readonly name: string;
  lookupByFlightNumberAndDate(
    flightNumber: string,
    date: string,
  ): Promise<FlightLookupResult>;
}
