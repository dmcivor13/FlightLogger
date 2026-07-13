import { describe, it, expect } from 'vitest';
import { summariseTrip } from '../utils/tripSummary';
import type { FlightRecord } from '../types';

function flight(overrides: Partial<FlightRecord>): FlightRecord {
  return {
    id: 1,
    flight_date: '2024-04-05',
    airline_name: 'JAL',
    origin_iata: 'LHR',
    destination_iata: 'NRT',
    passengers: [],
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('summariseTrip', () => {
  it('returns empty summary for no flights', () => {
    expect(summariseTrip([])).toEqual({ dateRange: '', routeChain: '', passengerNames: [] });
  });

  it('collapses consecutive duplicate airports in the route chain', () => {
    const summary = summariseTrip([
      flight({ id: 1, flight_date: '2024-04-05', origin_iata: 'LHR', destination_iata: 'NRT' }),
      flight({ id: 2, flight_date: '2024-04-10', origin_iata: 'NRT', destination_iata: 'ITM' }),
      flight({ id: 3, flight_date: '2024-04-15', origin_iata: 'ITM', destination_iata: 'LHR' }),
    ]);
    expect(summary.routeChain).toBe('LHR → NRT → ITM → LHR');
    expect(summary.dateRange).toBe('2024-04-05 – 2024-04-15');
  });

  it('keeps open-jaw surface segments visible in the chain', () => {
    const summary = summariseTrip([
      flight({ id: 1, origin_iata: 'LHR', destination_iata: 'NRT' }),
      flight({ id: 2, flight_date: '2024-04-15', origin_iata: 'KIX', destination_iata: 'LGW' }),
    ]);
    expect(summary.routeChain).toBe('LHR → NRT → KIX → LGW');
  });

  it('uses a single date when the trip is one day', () => {
    const summary = summariseTrip([
      flight({ id: 1, origin_iata: 'LHR', destination_iata: 'EDI' }),
      flight({ id: 2, origin_iata: 'EDI', destination_iata: 'LHR' }),
    ]);
    expect(summary.dateRange).toBe('2024-04-05');
  });

  it('collects unique passenger names in first-seen order', () => {
    const summary = summariseTrip([
      flight({ id: 1, passengers: [{ name: 'Alice' }, { name: 'Bob' }] }),
      flight({ id: 2, passengers: [{ name: 'Bob' }, { name: 'Carol' }] }),
    ]);
    expect(summary.passengerNames).toEqual(['Alice', 'Bob', 'Carol']);
  });
});
