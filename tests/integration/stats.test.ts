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

async function seedHighlightsFlights(agent: ReturnType<typeof createTestApp>['agent']) {
  // Alice flies G-XLEB three times, G-YYYY twice; Bob flies G-ZZZZ twice (Alice never on those).
  // Durations vary so we can test longestFlight + totalAirMinutes.
  // One flight has no registration and no duration to exercise NULL handling.
  await agent.post('/api/flights').send({
    flight_date: '2024-03-10', origin_iata: 'LHR', destination_iata: 'JFK', airline_name: 'British Airways',
    flight_number: 'BA1', aircraft_registration: 'G-XLEB', duration_minutes: 480,
    passengers: [{ name: 'Alice' }],
  });
  await agent.post('/api/flights').send({
    flight_date: '2024-05-12', origin_iata: 'JFK', destination_iata: 'LHR', airline_name: 'British Airways',
    flight_number: 'BA2', aircraft_registration: 'G-XLEB', duration_minutes: 420,
    passengers: [{ name: 'Alice' }],
  });
  await agent.post('/api/flights').send({
    flight_date: '2024-09-01', origin_iata: 'LHR', destination_iata: 'JFK', airline_name: 'British Airways',
    flight_number: 'BA3', aircraft_registration: 'G-XLEB', duration_minutes: 500,
    passengers: [{ name: 'Alice' }],
  });
  await agent.post('/api/flights').send({
    flight_date: '2025-01-15', origin_iata: 'LHR', destination_iata: 'SIN', airline_name: 'Singapore Airlines',
    flight_number: 'SQ318', aircraft_registration: 'G-YYYY', duration_minutes: 800,
    passengers: [{ name: 'Alice' }],
  });
  await agent.post('/api/flights').send({
    flight_date: '2025-02-20', origin_iata: 'SIN', destination_iata: 'LHR', airline_name: 'Singapore Airlines',
    flight_number: 'SQ317', aircraft_registration: 'G-YYYY', duration_minutes: 820,
    passengers: [{ name: 'Alice' }],
  });
  // Singleton aircraft for Alice — should NOT appear in repeatAircraft.
  await agent.post('/api/flights').send({
    flight_date: '2025-06-10', origin_iata: 'LHR', destination_iata: 'CDG', airline_name: 'Air France',
    flight_number: 'AF1681', aircraft_registration: 'F-ONCE', duration_minutes: 80,
    passengers: [{ name: 'Alice' }],
  });
  // Flight Alice was on with no registration and no duration — NULL handling.
  await agent.post('/api/flights').send({
    flight_date: '2025-07-04', origin_iata: 'LHR', destination_iata: 'AMS', airline_name: 'KLM',
    flight_number: 'KL1006',
    passengers: [{ name: 'Alice' }],
  });
  // Bob-only flights on a different aircraft — should not influence Alice's filtered stats.
  await agent.post('/api/flights').send({
    flight_date: '2024-04-01', origin_iata: 'LHR', destination_iata: 'DUB', airline_name: 'Aer Lingus',
    flight_number: 'EI151', aircraft_registration: 'G-ZZZZ', duration_minutes: 75,
    passengers: [{ name: 'Bob' }],
  });
  await agent.post('/api/flights').send({
    flight_date: '2024-04-15', origin_iata: 'DUB', destination_iata: 'LHR', airline_name: 'Aer Lingus',
    flight_number: 'EI152', aircraft_registration: 'G-ZZZZ', duration_minutes: 80,
    passengers: [{ name: 'Bob' }],
  });
}

describe('GET /api/stats with passenger filter', () => {
  it('scopes totals to a single passenger', async () => {
    const { agent } = createTestApp();
    await seedHighlightsFlights(agent);
    const res = await agent.get('/api/stats?passenger=Alice');
    expect(res.status).toBe(200);
    expect(res.body.totals.flights).toBe(7); // Alice is on 7 flights, Bob on 2
  });

  it('scopes byAirline to a single passenger', async () => {
    const { agent } = createTestApp();
    await seedHighlightsFlights(agent);
    const res = await agent.get('/api/stats?passenger=Bob');
    const airlines = res.body.byAirline as Array<{ airline: string; count: number }>;
    expect(airlines).toHaveLength(1);
    expect(airlines[0].airline).toBe('Aer Lingus');
    expect(airlines[0].count).toBe(2);
  });

  it('returns zeroed results for an unknown passenger', async () => {
    const { agent } = createTestApp();
    await seedHighlightsFlights(agent);
    const res = await agent.get('/api/stats?passenger=Nobody');
    expect(res.status).toBe(200);
    expect(res.body.totals.flights).toBe(0);
    expect(res.body.highlights.repeatAircraft).toEqual([]);
    expect(res.body.highlights.mostFlownRoute).toBeNull();
    expect(res.body.highlights.totalAirMinutes).toBe(0);
    expect(res.body.highlights.longestFlight).toBeNull();
  });

  it('treats empty passenger param as no filter', async () => {
    const { agent } = createTestApp();
    await seedHighlightsFlights(agent);
    const res = await agent.get('/api/stats?passenger=');
    expect(res.body.totals.flights).toBe(9);
  });
});

describe('GET /api/stats highlights', () => {
  it('repeatAircraft lists tail numbers flown >=2 times, sorted desc', async () => {
    const { agent } = createTestApp();
    await seedHighlightsFlights(agent);
    const res = await agent.get('/api/stats');
    const repeats = res.body.highlights.repeatAircraft as Array<{ registration: string; count: number }>;
    // G-XLEB (3), G-YYYY (2), G-ZZZZ (2); F-ONCE excluded.
    expect(repeats.map((r) => r.registration)).toEqual(['G-XLEB', 'G-YYYY', 'G-ZZZZ']);
    expect(repeats[0].count).toBe(3);
    expect(repeats.some((r) => r.registration === 'F-ONCE')).toBe(false);
  });

  it('repeatAircraft is scoped to the filtered passenger', async () => {
    const { agent } = createTestApp();
    await seedHighlightsFlights(agent);
    const res = await agent.get('/api/stats?passenger=Alice');
    const regs = (res.body.highlights.repeatAircraft as Array<{ registration: string }>).map((r) => r.registration);
    expect(regs).toContain('G-XLEB');
    expect(regs).toContain('G-YYYY');
    // G-ZZZZ is Bob-only — Alice should not see it.
    expect(regs).not.toContain('G-ZZZZ');
  });

  it('mostFlownRoute and mostFlownAirline pick the top entry', async () => {
    const { agent } = createTestApp();
    await seedHighlightsFlights(agent);
    const res = await agent.get('/api/stats?passenger=Alice');
    expect(res.body.highlights.mostFlownRoute.origin).toBe('LHR');
    expect(res.body.highlights.mostFlownRoute.destination).toBe('JFK');
    expect(res.body.highlights.mostFlownAirline.airline).toBe('British Airways');
  });

  it('totalAirMinutes sums durations and treats NULL as 0', async () => {
    const { agent } = createTestApp();
    await seedHighlightsFlights(agent);
    const res = await agent.get('/api/stats?passenger=Alice');
    // Alice durations: 480+420+500+800+820+80 = 3100; one NULL ignored.
    expect(res.body.highlights.totalAirMinutes).toBe(3100);
  });

  it('longestFlight returns the largest duration with route + date', async () => {
    const { agent } = createTestApp();
    await seedHighlightsFlights(agent);
    const res = await agent.get('/api/stats?passenger=Alice');
    expect(res.body.highlights.longestFlight.durationMinutes).toBe(820);
    expect(res.body.highlights.longestFlight.origin).toBe('SIN');
    expect(res.body.highlights.longestFlight.destination).toBe('LHR');
    expect(res.body.highlights.longestFlight.date).toBe('2025-02-20');
    expect(res.body.highlights.longestFlight.flightNumber).toBe('SQ317');
  });
});
