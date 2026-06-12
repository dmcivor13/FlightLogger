import type { FlightRecord } from '../../types';
import airports from '../../data/airports.json';
import { countryContinent } from '../../data/continents';

interface AirportData {
  lat: number;
  lon: number;
  name: string;
  city?: string;
  country?: string;
}

const airportData = airports as Record<string, AirportData>;

export interface AirportStats {
  iata: string;
  name: string;
  city: string;
  country: string;
  totalVisits: number;
  arrivals: number;
  departures: number;
  firstVisit: string | null;
  lastVisit: string | null;
  uniqueDestinations: number;
  mostCommonRoute: { origin: string; destination: string; count: number } | null;
  mostCommonAirline: { airline: string; count: number } | null;
}

export function computeAirportStats(iata: string, flights: FlightRecord[]): AirportStats {
  const info = airportData[iata];
  const relevant = flights.filter(
    (f) => f.origin_iata === iata || f.destination_iata === iata,
  );

  const arrivals = relevant.filter((f) => f.destination_iata === iata).length;
  const departures = relevant.filter((f) => f.origin_iata === iata).length;

  const dates = relevant.map((f) => f.flight_date).sort();
  const firstVisit = dates[0] ?? null;
  const lastVisit = dates[dates.length - 1] ?? null;

  const destinations = new Set<string>();
  for (const f of relevant) {
    const other = f.origin_iata === iata ? f.destination_iata : f.origin_iata;
    destinations.add(other);
  }

  const routeCounts = new Map<string, number>();
  for (const f of relevant) {
    const [a, b] = [f.origin_iata, f.destination_iata].sort();
    const key = `${a}|${b}`;
    routeCounts.set(key, (routeCounts.get(key) ?? 0) + 1);
  }
  let mostCommonRoute: AirportStats['mostCommonRoute'] = null;
  for (const [key, count] of routeCounts) {
    if (!mostCommonRoute || count > mostCommonRoute.count) {
      const [origin, destination] = key.split('|');
      mostCommonRoute = { origin, destination, count };
    }
  }

  const airlineCounts = new Map<string, number>();
  for (const f of relevant) {
    airlineCounts.set(f.airline_name, (airlineCounts.get(f.airline_name) ?? 0) + 1);
  }
  let mostCommonAirline: AirportStats['mostCommonAirline'] = null;
  for (const [airline, count] of airlineCounts) {
    if (!mostCommonAirline || count > mostCommonAirline.count) {
      mostCommonAirline = { airline, count };
    }
  }

  return {
    iata,
    name: info?.name ?? iata,
    city: info?.city ?? '',
    country: info?.country ?? '',
    totalVisits: relevant.length,
    arrivals,
    departures,
    firstVisit,
    lastVisit,
    uniqueDestinations: destinations.size,
    mostCommonRoute,
    mostCommonAirline,
  };
}

export interface CountryStats {
  total: number;
  continents: number;
  mostVisited: { country: string; visits: number } | null;
  newThisYear: number;
}

// World-atlas geography names differ from airports.json in a few cases.
const COUNTRY_NAME_OVERRIDES: Record<string, string> = {
  'United States': 'United States of America',
  'South Korea': 'Republic of Korea',
  'North Korea': "Dem. Rep. Korea",
  'Czech Republic': 'Czechia',
  'Republic of the Congo': 'Congo',
  'Democratic Republic of the Congo': 'Dem. Rep. Congo',
  'Ivory Coast': "Côte d'Ivoire",
  'Tanzania': 'Tanzania',
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  'North Macedonia': 'Macedonia',
  'Swaziland': 'eSwatini',
  'East Timor': 'Timor-Leste',
  'Turkiye': 'Turkey',
};

export function normaliseCountryName(name: string): string {
  return COUNTRY_NAME_OVERRIDES[name] ?? name;
}

export interface VisitedCountryData {
  visitedGeoNames: Set<string>;
  visitedAirportCountries: Set<string>;
  countryCounts: Map<string, number>;
}

export function computeVisitedCountries(
  flights: FlightRecord[],
  currentYear: number,
): { data: VisitedCountryData; stats: CountryStats } {
  const countryCounts = new Map<string, number>();
  const firstVisitYear = new Map<string, number>();

  for (const f of flights) {
    const year = parseInt(f.flight_date.slice(0, 4), 10);
    for (const iata of [f.origin_iata, f.destination_iata]) {
      const country = airportData[iata]?.country;
      if (!country) continue;
      countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
      const existing = firstVisitYear.get(country);
      if (existing === undefined || year < existing) {
        firstVisitYear.set(country, year);
      }
    }
  }

  const visitedAirportCountries = new Set(countryCounts.keys());
  const visitedGeoNames = new Set(
    Array.from(visitedAirportCountries).map(normaliseCountryName),
  );

  const continents = new Set<string>();
  for (const country of visitedAirportCountries) {
    const continent = countryContinent[country];
    if (continent) continents.add(continent);
  }

  let mostVisited: CountryStats['mostVisited'] = null;
  for (const [country, visits] of countryCounts) {
    if (!mostVisited || visits > mostVisited.visits) {
      mostVisited = { country, visits };
    }
  }

  const newThisYear = Array.from(firstVisitYear.entries()).filter(
    ([, year]) => year === currentYear,
  ).length;

  return {
    data: { visitedGeoNames, visitedAirportCountries, countryCounts },
    stats: {
      total: visitedAirportCountries.size,
      continents: continents.size,
      mostVisited,
      newThisYear,
    },
  };
}
