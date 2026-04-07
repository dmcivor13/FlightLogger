import { describe, it, expect } from 'vitest';
import { createTestApp } from './helpers';

async function seedKnownFlights(agent: ReturnType<typeof createTestApp>['agent']) {
  // Flights and passengers:
  // UA100: Alice(Economy) + Bob(Economy) — 2024
  // UA200: Alice(Economy)               — 2024
  // UA300: Alice(Economy) + Bob(Economy) — 2026
  // DL400: Alice(Business)              — 2026
  //
  // byClass counts (per passenger-flight): Economy=5, Business=1
  // byYear: 2024=2 flights, 2026=2 flights
  // byAirline: United=3, Delta=1
  // byPassenger: Alice=4, Bob=2
  await agent.post('/api/flights').send({
    flight_date: '2024-03-10', origin_iata: 'SFO', destination_iata: 'LAX', airline_name: 'United',
    flight_number: 'UA100',
    passengers: [{ name: 'Alice', class: 'Economy' }, { name: 'Bob', class: 'Economy' }],
  });
  await agent.post('/api/flights').send({
    flight_date: '2024-07-20', origin_iata: 'SFO', destination_iata: 'SEA', airline_name: 'United',
    flight_number: 'UA200',
    passengers: [{ name: 'Alice', class: 'Economy' }],
  });
  await agent.post('/api/flights').send({
    flight_date: '2026-01-05', origin_iata: 'SFO', destination_iata: 'LAX', airline_name: 'United',
    flight_number: 'UA300',
    passengers: [{ name: 'Alice', class: 'Economy' }, { name: 'Bob', class: 'Economy' }],
  });
  await agent.post('/api/flights').send({
    flight_date: '2026-04-01', origin_iata: 'SFO', destination_iata: 'ORD', airline_name: 'Delta',
    flight_number: 'DL400',
    passengers: [{ name: 'Alice', class: 'Business' }],
  });
}

describe('GET /api/stats', () => {
  it('returns zero totals when no flights', async () => {
    const { agent } = createTestApp();
    const res = await agent.get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.totals.flights).toBe(0);
  });

  it('returns correct totals', async () => {
    const { agent } = createTestApp();
    await seedKnownFlights(agent);
    const res = await agent.get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.totals.flights).toBe(4);
    expect(res.body.totals.uniqueAirlines).toBe(2);
  });

  it('returns correct byYear breakdown', async () => {
    const { agent } = createTestApp();
    await seedKnownFlights(agent);
    const res = await agent.get('/api/stats');
    const years = res.body.byYear as Array<{ year: string; count: number }>;
    const y2024 = years.find((y) => y.year === '2024');
    const y2026 = years.find((y) => y.year === '2026');
    expect(y2024?.count).toBe(2);
    expect(y2026?.count).toBe(2);
  });

  it('returns correct byAirline breakdown', async () => {
    const { agent } = createTestApp();
    await seedKnownFlights(agent);
    const res = await agent.get('/api/stats');
    const airlines = res.body.byAirline as Array<{ airline: string; count: number }>;
    const united = airlines.find((a) => a.airline === 'United');
    expect(united?.count).toBe(3);
  });

  it('returns correct byClass breakdown (counts per passenger-flight)', async () => {
    const { agent } = createTestApp();
    await seedKnownFlights(agent);
    const res = await agent.get('/api/stats');
    const classes = res.body.byClass as Array<{ class: string; count: number }>;
    const economy = classes.find((c) => c.class === 'Economy');
    const business = classes.find((c) => c.class === 'Business');
    // Economy: Alice×3 + Bob×2 = 5 passenger-flights
    expect(economy?.count).toBe(5);
    expect(business?.count).toBe(1);
  });

  it('returns topRoutes with most-flown first', async () => {
    const { agent } = createTestApp();
    await seedKnownFlights(agent);
    const res = await agent.get('/api/stats');
    const top = res.body.topRoutes[0];
    expect(top.origin).toBe('SFO');
    expect(top.destination).toBe('LAX');
    expect(top.count).toBe(2);
  });

  it('returns correct byPassenger breakdown', async () => {
    const { agent } = createTestApp();
    await seedKnownFlights(agent);
    const res = await agent.get('/api/stats');
    const passengers = res.body.byPassenger as Array<{ passenger: string; count: number }>;
    const alice = passengers.find((p) => p.passenger === 'Alice');
    const bob = passengers.find((p) => p.passenger === 'Bob');
    expect(alice?.count).toBe(4);
    expect(bob?.count).toBe(2);
  });
});
