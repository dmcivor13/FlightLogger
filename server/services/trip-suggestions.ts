import airportsData from '../../src/data/airports.json';

export interface AirportInfo {
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export interface SuggestionInputFlight {
  id: number;
  flight_date: string; // 'YYYY-MM-DD'
  origin_iata: string;
  destination_iata: string;
  scheduled_departure?: string | null; // 'HH:MM'
  actual_departure?: string | null;
}

export interface SuggestedGroup {
  name: string;
  start_date: string;
  end_date: string;
  flight_ids: number[];
}

export type AirportLookup = (iata: string) => AirportInfo | null;

const airports = airportsData as Record<string, AirportInfo & { name: string }>;

export function defaultLookup(iata: string): AirportInfo | null {
  return airports[iata?.toUpperCase()] ?? null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Group unassigned flights into suggested trips.
 *
 * Chronological walk with two split rules: a gap of more than `maxGapDays`
 * between legs, or having slept at an inferred "home" airport (the most
 * common origin, if it repeats). Chain connectivity is deliberately not
 * required, so open-jaw trips and surface segments still group together.
 * Groups with fewer than two flights are never suggested.
 */
export function suggestTrips(
  flights: SuggestionInputFlight[],
  lookup: AirportLookup = defaultLookup,
  maxGapDays = 14,
): SuggestedGroup[] {
  if (flights.length < 2) return [];

  const sorted = sortChronologically(flights, lookup);
  const home = inferHomeAirports(sorted, lookup);

  const groups: SuggestionInputFlight[][] = [];
  let current: SuggestionInputFlight[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1];
    const next = sorted[i];
    const gapDays = utcDay(next.flight_date) - utcDay(prev.flight_date);
    // gapDays >= 1 keeps same-day out-and-back day trips together
    const sleptAtHome = home.has(prev.destination_iata) && gapDays >= 1;
    if (gapDays > maxGapDays || sleptAtHome) {
      groups.push(current);
      current = [next];
    } else {
      current.push(next);
    }
  }
  groups.push(current);

  return groups.filter((g) => g.length >= 2).map((g) => toSuggestedGroup(g, lookup));
}

function utcDay(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

function departureTime(f: SuggestionInputFlight): string {
  return f.scheduled_departure ?? f.actual_departure ?? '99:99'; // missing times sort last
}

function sortChronologically(
  flights: SuggestionInputFlight[],
  lookup: AirportLookup,
): SuggestionInputFlight[] {
  const sorted = [...flights].sort(
    (a, b) =>
      a.flight_date.localeCompare(b.flight_date) ||
      departureTime(a).localeCompare(departureTime(b)) ||
      a.id - b.id,
  );

  // Same-day fix: when a day's flights uniquely chain (each origin is the
  // previous destination, or the same city), trust the chain over times —
  // times are often missing on imported flights.
  const result: SuggestionInputFlight[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].flight_date === sorted[i].flight_date) j++;
    const day = sorted.slice(i, j);
    result.push(...(day.length > 1 ? chainOrder(day, lookup) ?? day : day));
    i = j;
  }
  return result;
}

function sameAirport(a: string, b: string, lookup: AirportLookup): boolean {
  if (a === b) return true;
  const infoA = lookup(a);
  const infoB = lookup(b);
  return !!infoA && !!infoB && infoA.city === infoB.city && infoA.country === infoB.country;
}

/** Order a single day's flights into their unique origin→destination chain, or null. */
function chainOrder(
  day: SuggestionInputFlight[],
  lookup: AirportLookup,
): SuggestionInputFlight[] | null {
  const starts = day.filter(
    (f) => !day.some((g) => g !== f && sameAirport(g.destination_iata, f.origin_iata, lookup)),
  );
  if (starts.length !== 1) return null;

  const chain = [starts[0]];
  const remaining = day.filter((f) => f !== starts[0]);
  while (remaining.length > 0) {
    const current = chain[chain.length - 1];
    const nextCandidates = remaining.filter((f) =>
      sameAirport(current.destination_iata, f.origin_iata, lookup),
    );
    if (nextCandidates.length !== 1) return null;
    chain.push(nextCandidates[0]);
    remaining.splice(remaining.indexOf(nextCandidates[0]), 1);
  }
  return chain;
}

/**
 * Home airports: every airport tied for the highest origin count — but only
 * if that count is at least 2, since a lone occurrence is no evidence of home.
 * Expanded to same-city airports (LHR/LGW) so open-jaw returns count as home.
 */
function inferHomeAirports(
  flights: SuggestionInputFlight[],
  lookup: AirportLookup,
): Set<string> {
  const counts = new Map<string, number>();
  for (const f of flights) {
    counts.set(f.origin_iata, (counts.get(f.origin_iata) ?? 0) + 1);
  }
  const max = Math.max(...counts.values());
  if (max < 2) return new Set();

  const homes = [...counts].filter(([, c]) => c === max).map(([iata]) => iata);
  const homeSet = new Set(homes);

  const seen = new Set<string>();
  for (const f of flights) {
    seen.add(f.origin_iata);
    seen.add(f.destination_iata);
  }
  for (const iata of seen) {
    if (!homeSet.has(iata) && homes.some((h) => sameAirport(h, iata, lookup))) {
      homeSet.add(iata);
    }
  }
  return homeSet;
}

function toSuggestedGroup(
  group: SuggestionInputFlight[],
  lookup: AirportLookup,
): SuggestedGroup {
  return {
    name: buildName(group, lookup),
    start_date: group[0].flight_date,
    end_date: group[group.length - 1].flight_date,
    flight_ids: group.map((f) => f.id),
  };
}

function haversineKm(a: AirportInfo, b: AirportInfo): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * "Japan, April 2024": the trip's farthest airport from the starting origin
 * names the trip — its country when abroad, its city when domestic. Falls
 * back to the first destination's raw IATA code when lookups fail.
 */
function buildName(group: SuggestionInputFlight[], lookup: AirportLookup): string {
  const originIata = group[0].origin_iata;
  const origin = lookup(originIata);

  const candidates: string[] = [];
  for (const f of group) {
    for (const iata of [f.origin_iata, f.destination_iata]) {
      if (iata !== originIata && !candidates.includes(iata)) candidates.push(iata);
    }
  }

  let farthest: string | null = null;
  if (origin) {
    let bestDist = -1;
    for (const iata of candidates) {
      const info = lookup(iata);
      if (!info) continue;
      const dist = haversineKm(origin, info);
      if (dist > bestDist) {
        // strict > keeps the first-encountered airport on ties
        bestDist = dist;
        farthest = iata;
      }
    }
  }
  const chosen = farthest ?? group[0].destination_iata;
  const info = lookup(chosen);
  const place = info
    ? origin && info.country === origin.country
      ? info.city
      : info.country
    : chosen;

  const [year, month] = group[0].flight_date.split('-').map(Number);
  return `${place}, ${MONTHS[month - 1]} ${year}`;
}
