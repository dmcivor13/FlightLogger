import { describe, it, expect } from 'vitest';
import {
  computeAirportStats,
  computeVisitedCountries,
  normaliseCountryName,
} from '../components/map/mapUtils';
import type { FlightRecord } from '../types';

function makeFlight(overrides: Partial<FlightRecord> & { origin_iata: string; destination_iata: string }): FlightRecord {
  return {
    id: 1,
    flight_date: '2024-01-15',
    airline_name: 'Test Air',
    passengers: [],
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

const FLIGHTS: FlightRecord[] = [
  makeFlight({ id: 1, origin_iata: 'LHR', destination_iata: 'JFK', flight_date: '2020-03-10', airline_name: 'British Airways' }),
  makeFlight({ id: 2, origin_iata: 'JFK', destination_iata: 'LHR', flight_date: '2020-03-20', airline_name: 'British Airways' }),
  makeFlight({ id: 3, origin_iata: 'LHR', destination_iata: 'CDG', flight_date: '2021-06-01', airline_name: 'Air France' }),
  makeFlight({ id: 4, origin_iata: 'CDG', destination_iata: 'LHR', flight_date: '2021-06-08', airline_name: 'Air France' }),
  makeFlight({ id: 5, origin_iata: 'LHR', destination_iata: 'DXB', flight_date: '2022-12-20', airline_name: 'Emirates' }),
];

describe('computeAirportStats', () => {
  it('counts arrivals and departures correctly', () => {
    const stats = computeAirportStats('LHR', FLIGHTS);
    expect(stats.departures).toBe(3); // flights 1, 3, 5
    expect(stats.arrivals).toBe(2);   // flights 2, 4
    expect(stats.totalVisits).toBe(5);
  });

  it('calculates first and last visit dates', () => {
    const stats = computeAirportStats('LHR', FLIGHTS);
    expect(stats.firstVisit).toBe('2020-03-10');
    expect(stats.lastVisit).toBe('2022-12-20');
  });

  it('counts unique destinations', () => {
    const stats = computeAirportStats('LHR', FLIGHTS);
    // LHR connects to JFK, CDG, DXB
    expect(stats.uniqueDestinations).toBe(3);
  });

  it('identifies the most common route (bidirectional)', () => {
    const stats = computeAirportStats('LHR', FLIGHTS);
    // JFK-LHR appears twice, CDG-LHR appears twice, LHR-DXB once
    expect(stats.mostCommonRoute).not.toBeNull();
    expect(stats.mostCommonRoute!.count).toBe(2);
  });

  it('identifies the most common airline', () => {
    const stats = computeAirportStats('LHR', FLIGHTS);
    // British Airways: 2, Air France: 2, Emirates: 1
    expect(stats.mostCommonAirline).not.toBeNull();
    expect(stats.mostCommonAirline!.count).toBe(2);
  });

  it('returns zero stats for an airport with no flights', () => {
    const stats = computeAirportStats('SYD', FLIGHTS);
    expect(stats.totalVisits).toBe(0);
    expect(stats.arrivals).toBe(0);
    expect(stats.departures).toBe(0);
    expect(stats.uniqueDestinations).toBe(0);
    expect(stats.firstVisit).toBeNull();
    expect(stats.lastVisit).toBeNull();
    expect(stats.mostCommonRoute).toBeNull();
    expect(stats.mostCommonAirline).toBeNull();
  });
});

describe('computeVisitedCountries', () => {
  it('derives visited countries from origin and destination airports', () => {
    // LHR=UK, JFK=US, CDG=France, DXB=UAE
    const { data, stats } = computeVisitedCountries(FLIGHTS, 2024);
    expect(data.visitedAirportCountries.has('United Kingdom')).toBe(true);
    expect(data.visitedAirportCountries.has('United States')).toBe(true);
    expect(data.visitedAirportCountries.has('France')).toBe(true);
    expect(data.visitedAirportCountries.has('United Arab Emirates')).toBe(true);
  });

  it('counts continents correctly', () => {
    const { stats } = computeVisitedCountries(FLIGHTS, 2024);
    // Europe (UK, France), North America (US), Asia (UAE) = 3 continents
    expect(stats.continents).toBe(3);
  });

  it('finds the most visited country', () => {
    const { stats } = computeVisitedCountries(FLIGHTS, 2024);
    // UK appears in all 5 flights (LHR is origin or destination)
    expect(stats.mostVisited).not.toBeNull();
    expect(stats.mostVisited!.country).toBe('United Kingdom');
  });

  it('counts new countries in the current year', () => {
    // Flight 5 to DXB (UAE) is in 2022. In 2022 context, DXB would be "new".
    // Let's test with year 2020 — only UK and US were first visited then.
    const flights2020 = FLIGHTS.slice(0, 2); // LHR↔JFK in 2020
    const { stats } = computeVisitedCountries(flights2020, 2020);
    expect(stats.newThisYear).toBe(2); // UK and US both first visited in 2020
  });
});

describe('normaliseCountryName', () => {
  it('maps known divergences to world-atlas names', () => {
    expect(normaliseCountryName('United States')).toBe('United States of America');
    expect(normaliseCountryName('South Korea')).toBe('Republic of Korea');
    expect(normaliseCountryName('Ivory Coast')).toBe("Côte d'Ivoire");
  });

  it('passes through unknown country names unchanged', () => {
    expect(normaliseCountryName('France')).toBe('France');
    expect(normaliseCountryName('Germany')).toBe('Germany');
  });
});
