export type ClassOfService = 'Economy' | 'Premium Economy' | 'Business' | 'US Domestic First' | 'First';
export type FlightReason = 'Business' | 'Leisure';

export interface PassengerDetail {
  name: string;
  seat?: string;
  class?: ClassOfService;
  reason?: FlightReason;
  notes?: string;
}

export interface FlightPayload {
  flight_date: string;          // ISO date: "2026-04-06"

  airline_iata?: string;        // e.g. "BA"
  airline_name: string;         // e.g. "British Airways"

  flight_number?: string;       // e.g. "BA268"

  origin_iata: string;          // e.g. "LHR"
  destination_iata: string;     // e.g. "JFK"

  scheduled_departure?: string; // "HH:MM"
  actual_departure?: string;    // "HH:MM"

  scheduled_arrival?: string;   // "HH:MM"
  actual_arrival?: string;      // "HH:MM"

  aircraft_type?: string;       // e.g. "Boeing 737-800"
  aircraft_registration?: string; // e.g. "G-XLEB"

  duration_minutes?: number;
  data_source?: string;

  passengers: PassengerDetail[];
}

export interface FlightRecord extends FlightPayload {
  id: number;
  trip_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface TripPayload {
  name: string;
  notes?: string;
  flight_ids?: number[]; // on PUT: omitted = membership unchanged, present = full replace
}

export interface TripRecord {
  id: number;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  flights: FlightRecord[]; // chronological
}

export interface TripSuggestion {
  name: string;
  start_date: string;
  end_date: string;
  flight_ids: number[];
  flights: FlightRecord[];
}

export interface StatsHighlights {
  repeatAircraft: Array<{ registration: string; count: number }>;
  mostFlownRoute: { origin: string; destination: string; count: number } | null;
  mostFlownAirline: { airline: string; count: number } | null;
  totalAirMinutes: number;
  longestFlight: {
    origin: string;
    destination: string;
    durationMinutes: number;
    date: string;
    flightNumber: string | null;
  } | null;
}

export interface StatsResponse {
  totals: {
    flights: number;
    uniqueRoutes: number;
    uniqueAirlines: number;
    uniqueAircraft: number;
  };
  byYear: Array<{ year: string; count: number }>;
  byAirline: Array<{ airline: string; count: number }>;
  byAircraft: Array<{ aircraft: string; count: number }>;
  byClass: Array<{ class: string; count: number }>;
  byReason: Array<{ reason: string; count: number }>;
  byPassenger: Array<{ passenger: string; count: number }>;
  topRoutes: Array<{ origin: string; destination: string; count: number }>;
  highlights: StatsHighlights;
}

export interface FlightsFilter {
  dateFrom?: string;
  dateTo?: string;
  origin?: string;
  destination?: string;
  airline?: string;
  aircraft?: string;
  registration?: string;
  class?: string;
  reason?: string;
  passenger?: string;
  q?: string;
}

// ─── Lookup service types (mirrored from server) ──────────────────────────────

export type LookupStatus = 'success' | 'partial' | 'no_match' | 'multiple_matches' | 'error';

export interface NormalizedFlightCandidate {
  airlineName?: string;
  airlineIata?: string;
  flightNumber?: string;
  flightDate?: string;
  originIata?: string;
  destinationIata?: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
  actualDeparture?: string;
  actualArrival?: string;
  aircraftType?: string;
  aircraftRegistration?: string;
}

export interface FlightLookupResult {
  status: LookupStatus;
  provider: string;
  matchedFlights: NormalizedFlightCandidate[];
  errorMessage?: string;
}

export interface ImportPreviewResponse {
  passenger: string;
  toCreate: FlightPayload[];
  toMerge: Array<{ existingId: number; existingFlight: FlightRecord; incomingFlight: FlightPayload }>;
  skipped: FlightPayload[];
  token: string;
}

export interface ImportCommitResponse {
  rows_processed: number;
  flights_created: number;
  flights_matched: number;
  passengers_added: number;
  rows_skipped: number;
  warnings: string[];
}
