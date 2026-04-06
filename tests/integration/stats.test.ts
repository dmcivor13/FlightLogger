import { describe, it, expect } from 'vitest';
import { createTestApp } from './helpers';

async function seedKnownFlights(agent: ReturnType<typeof createTestApp>['agent']) {
  // 3 x Economy, 1 x Business
  // 2 airlines: United (3), Delta (1)
  // 2 years: 2024 (2), 2026 (2)
  // 2 passengers: Alice (all 4), Bob (2)
  // Top route: SFO→LAX (2 times), SFO→SEA (1), SFO→ORD (1)
  await agent.post('/api/flights').send({
    flight_date: '2024-03-10', origin_iata: 'SFO', destination_iata: 'LAX', airline_name: 'United',
    flight_number: 'UA100', class: 'Economy', passengers: ['Alice', 'Bob'],
  });
  await agent.post('/api/flights').send({
    flight_date: '2024-07-20', origin_iata: 'SFO', destination_iata: 'SEA', airline_name: 'United',
    flight_number: 'UA200', class: 'Economy', passengers: ['Alice'],
  });
  await agent.post('/api/flights').send({
    flight_date: '2026-01-05', origin_iata: 'SFO', destination_iata: 'LAX', airline_name: 'United',
    flight_number: 'UA300', class: 'Economy', passengers: ['Alice', 'Bob'],
  });
  await agent.post('/api/flights').send({
    flight_date: '2026-04-01', origin_iata: 'SFO', destination_iata: 'ORD', airline_name: 'Delta',
    flight_number: 'DL400', class: 'Business', passengers: ['Alice'],
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

  it('returns correct byClass breakdown', async () => {
    const { agent } = createTestApp();
    await seedKnownFlights(agent);
    const res = await agent.get('/api/stats');
    const classes = res.body.byClass as Array<{ class: string; count: number }>;
    const economy = classes.find((c) => c.class === 'Economy');
    const business = classes.find((c) => c.class === 'Business');
    expect(economy?.count).toBe(3);
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
