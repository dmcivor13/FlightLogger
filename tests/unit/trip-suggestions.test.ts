import { describe, it, expect } from 'vitest';
import { suggestTrips } from '../../server/services/trip-suggestions';
import type { AirportInfo, SuggestionInputFlight } from '../../server/services/trip-suggestions';

// Deterministic fake lookup — tests never depend on the real airports.json
const AIRPORTS: Record<string, AirportInfo> = {
  LHR: { city: 'London', country: 'United Kingdom', lat: 51.47, lon: -0.46 },
  LGW: { city: 'London', country: 'United Kingdom', lat: 51.15, lon: -0.19 },
  EDI: { city: 'Edinburgh', country: 'United Kingdom', lat: 55.95, lon: -3.37 },
  CDG: { city: 'Paris', country: 'France', lat: 49.01, lon: 2.55 },
  AMS: { city: 'Amsterdam', country: 'Netherlands', lat: 52.31, lon: 4.76 },
  FRA: { city: 'Frankfurt', country: 'Germany', lat: 50.03, lon: 8.56 },
  VIE: { city: 'Vienna', country: 'Austria', lat: 48.11, lon: 16.57 },
  NRT: { city: 'Tokyo', country: 'Japan', lat: 35.76, lon: 140.39 },
  ITM: { city: 'Osaka', country: 'Japan', lat: 34.79, lon: 135.44 },
  KIX: { city: 'Osaka', country: 'Japan', lat: 34.43, lon: 135.24 },
  JFK: { city: 'New York', country: 'United States', lat: 40.64, lon: -73.78 },
};
const lookup = (iata: string) => AIRPORTS[iata] ?? null;

let nextId = 1;
function flight(
  date: string,
  origin: string,
  destination: string,
  extra: Partial<SuggestionInputFlight> = {},
): SuggestionInputFlight {
  return { id: nextId++, flight_date: date, origin_iata: origin, destination_iata: destination, ...extra };
}

describe('suggestTrips', () => {
  it('returns [] for empty input and single flights', () => {
    expect(suggestTrips([], lookup)).toEqual([]);
    expect(suggestTrips([flight('2024-04-05', 'LHR', 'NRT')], lookup)).toEqual([]);
  });

  it('groups a classic out–hop–back trip and names it after the destination country', () => {
    const f1 = flight('2024-04-05', 'LHR', 'NRT');
    const f2 = flight('2024-04-10', 'NRT', 'ITM');
    const f3 = flight('2024-04-15', 'ITM', 'LHR');
    const groups = suggestTrips([f1, f2, f3], lookup);
    expect(groups).toHaveLength(1);
    expect(groups[0].flight_ids).toEqual([f1.id, f2.id, f3.id]);
    expect(groups[0].name).toBe('Japan, April 2024');
    expect(groups[0].start_date).toBe('2024-04-05');
    expect(groups[0].end_date).toBe('2024-04-15');
  });

  it('splits back-to-back trips when sleeping at the inferred home airport', () => {
    // LHR appears as origin twice → home; both trips fit inside 14-day gaps
    const a1 = flight('2024-06-01', 'LHR', 'CDG');
    const a2 = flight('2024-06-05', 'CDG', 'LHR');
    const b1 = flight('2024-06-10', 'LHR', 'AMS');
    const b2 = flight('2024-06-14', 'AMS', 'LHR');
    const groups = suggestTrips([a1, a2, b1, b2], lookup);
    expect(groups).toHaveLength(2);
    expect(groups[0].flight_ids).toEqual([a1.id, a2.id]);
    expect(groups[1].flight_ids).toEqual([b1.id, b2.id]);
    expect(groups[0].name).toBe('France, June 2024');
    expect(groups[1].name).toBe('Netherlands, June 2024');
  });

  it('does not infer a home airport when no origin repeats', () => {
    // All origins distinct — without the min-count guard everything would be
    // "home" and this 3-leg trip would shatter into singletons
    const f1 = flight('2024-04-05', 'LHR', 'NRT');
    const f2 = flight('2024-04-10', 'NRT', 'ITM');
    const f3 = flight('2024-04-15', 'ITM', 'LHR');
    expect(suggestTrips([f1, f2, f3], lookup)).toHaveLength(1);
  });

  it('splits on gaps larger than maxGapDays even without a home airport', () => {
    const a1 = flight('2024-01-01', 'LHR', 'CDG');
    const a2 = flight('2024-01-05', 'CDG', 'AMS');
    const b1 = flight('2024-03-01', 'FRA', 'VIE');
    const b2 = flight('2024-03-05', 'VIE', 'JFK');
    const groups = suggestTrips([a1, a2, b1, b2], lookup);
    expect(groups).toHaveLength(2);
    expect(groups[0].flight_ids).toEqual([a1.id, a2.id]);
    expect(groups[1].flight_ids).toEqual([b1.id, b2.id]);
  });

  it('keeps a same-day out-and-back day trip together despite returning home', () => {
    const other1 = flight('2024-02-01', 'LHR', 'CDG');
    const other2 = flight('2024-02-04', 'CDG', 'LHR');
    const day1 = flight('2024-05-01', 'LHR', 'EDI', { scheduled_departure: '07:00' });
    const day2 = flight('2024-05-01', 'EDI', 'LHR', { scheduled_departure: '19:00' });
    const groups = suggestTrips([other1, other2, day1, day2], lookup);
    expect(groups).toHaveLength(2);
    expect(groups[1].flight_ids).toEqual([day1.id, day2.id]);
  });

  it('orders same-day legs with missing times by chaining origins to destinations', () => {
    // Input order (by id) is the reverse of the physical chain; no times given
    const leg2 = flight('2024-05-01', 'FRA', 'VIE');
    const leg1 = flight('2024-05-01', 'LHR', 'FRA');
    const groups = suggestTrips([leg2, leg1], lookup);
    expect(groups).toHaveLength(1);
    expect(groups[0].flight_ids).toEqual([leg1.id, leg2.id]);
  });

  it('groups open-jaw trips and treats same-city airports as home', () => {
    // LHR is home (origin twice); the open-jaw returns into LGW (also London)
    const prior1 = flight('2024-01-10', 'LHR', 'CDG');
    const prior2 = flight('2024-01-13', 'CDG', 'LHR');
    const oj1 = flight('2024-04-05', 'LHR', 'NRT');
    const oj2 = flight('2024-04-15', 'KIX', 'LGW'); // surface segment NRT→KIX in between
    const later1 = flight('2024-04-20', 'LGW', 'AMS');
    const later2 = flight('2024-04-23', 'AMS', 'LHR');
    const groups = suggestTrips([prior1, prior2, oj1, oj2, later1, later2], lookup);
    expect(groups).toHaveLength(3);
    expect(groups[1].flight_ids).toEqual([oj1.id, oj2.id]);
    expect(groups[1].name).toBe('Japan, April 2024');
    // the LGW arrival counts as sleeping at home, so the Amsterdam trip is separate
    expect(groups[2].flight_ids).toEqual([later1.id, later2.id]);
  });

  it('handles unknown IATA codes without crashing, falling back to the raw code', () => {
    const f1 = flight('2024-04-05', 'XXX', 'YYY');
    const f2 = flight('2024-04-10', 'YYY', 'XXX');
    const groups = suggestTrips([f1, f2], lookup);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('YYY, April 2024');
  });

  it('names domestic trips after the city instead of the country', () => {
    const f1 = flight('2024-08-01', 'LHR', 'EDI');
    const f2 = flight('2024-08-04', 'EDI', 'LHR');
    const groups = suggestTrips([f1, f2], lookup);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Edinburgh, August 2024');
  });
});
