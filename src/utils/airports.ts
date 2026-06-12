import airportsData from '../data/airports.json';

export interface Airport {
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

const airports = airportsData as Record<string, Airport>;

export function lookupAirport(iata: string | undefined | null): Airport | null {
  if (!iata) return null;
  return airports[iata.toUpperCase()] ?? null;
}
