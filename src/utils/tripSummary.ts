import type { FlightRecord } from '../types';

export interface TripSummary {
  dateRange: string;
  routeChain: string;
  passengerNames: string[];
}

/** Summarise a trip's flights (assumed chronological, as returned by the API). */
export function summariseTrip(flights: FlightRecord[]): TripSummary {
  if (flights.length === 0) {
    return { dateRange: '', routeChain: '', passengerNames: [] };
  }

  const first = flights[0].flight_date;
  const last = flights[flights.length - 1].flight_date;
  const dateRange = first === last ? first : `${first} – ${last}`;

  // Airport sequence with consecutive duplicates collapsed:
  // LHR→NRT, NRT→ITM, ITM→LHR becomes "LHR → NRT → ITM → LHR"
  const chain: string[] = [];
  for (const f of flights) {
    if (chain[chain.length - 1] !== f.origin_iata) chain.push(f.origin_iata);
    chain.push(f.destination_iata);
  }
  const routeChain = chain.join(' → ');

  const passengerNames: string[] = [];
  for (const f of flights) {
    for (const p of f.passengers) {
      if (!passengerNames.includes(p.name)) passengerNames.push(p.name);
    }
  }

  return { dateRange, routeChain, passengerNames };
}
