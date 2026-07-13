import { describe, it, expect } from 'vitest';
import { createTestApp, baseFlight } from './helpers';

type Agent = ReturnType<typeof createTestApp>['agent'];

async function createFlight(agent: Agent, overrides: Record<string, unknown> = {}): Promise<number> {
  const res = await agent.post('/api/flights').send({ ...baseFlight, ...overrides });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

describe('GET /api/trips', () => {
  it('returns empty list when no trips', async () => {
    const { agent } = createTestApp();
    const res = await agent.get('/api/trips');
    expect(res.status).toBe(200);
    expect(res.body.trips).toEqual([]);
  });

  it('orders trips by first flight date descending', async () => {
    const { agent } = createTestApp();
    const oldId = await createFlight(agent, { flight_date: '2023-05-01' });
    const newId = await createFlight(agent, { flight_date: '2025-05-01' });
    await agent.post('/api/trips').send({ name: 'Old trip', flight_ids: [oldId] });
    await agent.post('/api/trips').send({ name: 'New trip', flight_ids: [newId] });
    const res = await agent.get('/api/trips');
    expect(res.body.trips.map((t: { name: string }) => t.name)).toEqual(['New trip', 'Old trip']);
  });
});

describe('POST /api/trips', () => {
  it('creates a trip and assigns the given flights', async () => {
    const { agent } = createTestApp();
    const id1 = await createFlight(agent, { flight_date: '2024-04-15', origin_iata: 'NRT', destination_iata: 'LHR' });
    const id2 = await createFlight(agent, { flight_date: '2024-04-05', origin_iata: 'LHR', destination_iata: 'NRT' });

    const res = await agent.post('/api/trips').send({ name: 'Japan, April 2024', flight_ids: [id1, id2] });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Japan, April 2024');
    expect(res.body.id).toBeTypeOf('number');
    // flights come back in chronological order regardless of input order
    expect(res.body.flights.map((f: { id: number }) => f.id)).toEqual([id2, id1]);

    const flight = await agent.get(`/api/flights/${id1}`);
    expect(flight.body.trip_id).toBe(res.body.id);
  });

  it('rejects a missing or blank name', async () => {
    const { agent } = createTestApp();
    const noName = await agent.post('/api/trips').send({ flight_ids: [] });
    expect(noName.status).toBe(400);
    expect(noName.body.error).toBe('name is required');

    const blank = await agent.post('/api/trips').send({ name: '   ' });
    expect(blank.status).toBe(400);
  });

  it('rejects unknown flight ids', async () => {
    const { agent } = createTestApp();
    const res = await agent.post('/api/trips').send({ name: 'Ghost trip', flight_ids: [999] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unknown flight/);
  });
});

describe('GET /api/trips/:id', () => {
  it('returns the trip with its flights', async () => {
    const { agent } = createTestApp();
    const id = await createFlight(agent);
    const created = await agent.post('/api/trips').send({ name: 'Weekend away', notes: 'fun', flight_ids: [id] });
    const res = await agent.get(`/api/trips/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Weekend away');
    expect(res.body.notes).toBe('fun');
    expect(res.body.flights).toHaveLength(1);
  });

  it('404s for an unknown id', async () => {
    const { agent } = createTestApp();
    const res = await agent.get('/api/trips/42');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});

describe('PUT /api/trips/:id', () => {
  it('renames without touching membership when flight_ids is omitted', async () => {
    const { agent } = createTestApp();
    const id = await createFlight(agent);
    const created = await agent.post('/api/trips').send({ name: 'Before', flight_ids: [id] });
    const res = await agent.put(`/api/trips/${created.body.id}`).send({ name: 'After' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('After');
    expect(res.body.flights).toHaveLength(1);
  });

  it('fully replaces membership when flight_ids is present', async () => {
    const { agent } = createTestApp();
    const keep = await createFlight(agent, { flight_number: 'UA1' });
    const drop = await createFlight(agent, { flight_number: 'UA2' });
    const created = await agent.post('/api/trips').send({ name: 'Trip', flight_ids: [keep, drop] });

    const res = await agent.put(`/api/trips/${created.body.id}`).send({ name: 'Trip', flight_ids: [keep] });
    expect(res.status).toBe(200);
    expect(res.body.flights.map((f: { id: number }) => f.id)).toEqual([keep]);

    const dropped = await agent.get(`/api/flights/${drop}`);
    expect(dropped.body.trip_id).toBeNull();
  });

  it('validates name and 404s on unknown trip', async () => {
    const { agent } = createTestApp();
    const id = await createFlight(agent);
    const created = await agent.post('/api/trips').send({ name: 'Trip', flight_ids: [id] });
    const bad = await agent.put(`/api/trips/${created.body.id}`).send({ name: '' });
    expect(bad.status).toBe(400);
    const missing = await agent.put('/api/trips/999').send({ name: 'X' });
    expect(missing.status).toBe(404);
  });
});

describe('POST /api/trips/:id/flights', () => {
  it('adds flights, including stealing from another trip', async () => {
    const { agent } = createTestApp();
    const f1 = await createFlight(agent, { flight_number: 'UA1' });
    const f2 = await createFlight(agent, { flight_number: 'UA2' });
    const tripA = (await agent.post('/api/trips').send({ name: 'A', flight_ids: [f1] })).body;
    const tripB = (await agent.post('/api/trips').send({ name: 'B', flight_ids: [f2] })).body;

    const res = await agent.post(`/api/trips/${tripB.id}/flights`).send({ flight_ids: [f1] });
    expect(res.status).toBe(200);
    expect(res.body.flights).toHaveLength(2);

    const emptied = await agent.get(`/api/trips/${tripA.id}`);
    expect(emptied.body.flights).toHaveLength(0);
  });

  it('400s on empty or unknown flight_ids and 404s on unknown trip', async () => {
    const { agent } = createTestApp();
    const f1 = await createFlight(agent);
    const trip = (await agent.post('/api/trips').send({ name: 'A', flight_ids: [f1] })).body;
    expect((await agent.post(`/api/trips/${trip.id}/flights`).send({ flight_ids: [] })).status).toBe(400);
    expect((await agent.post(`/api/trips/${trip.id}/flights`).send({ flight_ids: [999] })).status).toBe(400);
    expect((await agent.post('/api/trips/999/flights').send({ flight_ids: [f1] })).status).toBe(404);
  });
});

describe('DELETE /api/trips/:id/flights/:flightId', () => {
  it('unassigns the flight and returns the updated trip', async () => {
    const { agent } = createTestApp();
    const f1 = await createFlight(agent, { flight_number: 'UA1' });
    const f2 = await createFlight(agent, { flight_number: 'UA2' });
    const trip = (await agent.post('/api/trips').send({ name: 'A', flight_ids: [f1, f2] })).body;

    const res = await agent.delete(`/api/trips/${trip.id}/flights/${f1}`);
    expect(res.status).toBe(200);
    expect(res.body.flights.map((f: { id: number }) => f.id)).toEqual([f2]);

    const unassigned = await agent.get(`/api/flights/${f1}`);
    expect(unassigned.body.trip_id).toBeNull();
  });

  it('404s when the flight is not in the trip', async () => {
    const { agent } = createTestApp();
    const f1 = await createFlight(agent);
    const loose = await createFlight(agent, { flight_number: 'UA9' });
    const trip = (await agent.post('/api/trips').send({ name: 'A', flight_ids: [f1] })).body;
    expect((await agent.delete(`/api/trips/${trip.id}/flights/${loose}`)).status).toBe(404);
    expect((await agent.delete(`/api/trips/999/flights/${f1}`)).status).toBe(404);
  });
});

describe('DELETE /api/trips/:id', () => {
  it('deletes the trip but leaves flights intact with trip_id null', async () => {
    const { agent } = createTestApp();
    const f1 = await createFlight(agent);
    const trip = (await agent.post('/api/trips').send({ name: 'A', flight_ids: [f1] })).body;

    const res = await agent.delete(`/api/trips/${trip.id}`);
    expect(res.status).toBe(204);

    const flight = await agent.get(`/api/flights/${f1}`);
    expect(flight.status).toBe(200);
    expect(flight.body.trip_id).toBeNull();
  });

  it('404s on unknown trip', async () => {
    const { agent } = createTestApp();
    expect((await agent.delete('/api/trips/999')).status).toBe(404);
  });
});

describe('flight deletion inside a trip', () => {
  it('deleting a member flight leaves the trip in place', async () => {
    const { agent } = createTestApp();
    const f1 = await createFlight(agent, { flight_number: 'UA1' });
    const f2 = await createFlight(agent, { flight_number: 'UA2' });
    const trip = (await agent.post('/api/trips').send({ name: 'A', flight_ids: [f1, f2] })).body;

    expect((await agent.delete(`/api/flights/${f1}`)).status).toBe(204);

    const res = await agent.get(`/api/trips/${trip.id}`);
    expect(res.status).toBe(200);
    expect(res.body.flights.map((f: { id: number }) => f.id)).toEqual([f2]);
  });
});

describe('GET /api/trips/suggestions', () => {
  // A realistic history: several LHR round trips make LHR the home airport,
  // then a 3-leg Japan trip should be suggested as one group.
  async function seedHistory(agent: Agent) {
    // Two prior LHR round trips (establish LHR as home, and are suggestions themselves)
    await createFlight(agent, { flight_date: '2023-06-01', origin_iata: 'LHR', destination_iata: 'CDG', flight_number: 'BA1' });
    await createFlight(agent, { flight_date: '2023-06-05', origin_iata: 'CDG', destination_iata: 'LHR', flight_number: 'BA2' });
    await createFlight(agent, { flight_date: '2023-09-01', origin_iata: 'LHR', destination_iata: 'AMS', flight_number: 'BA3' });
    await createFlight(agent, { flight_date: '2023-09-04', origin_iata: 'AMS', destination_iata: 'LHR', flight_number: 'BA4' });
    // The Japan trip
    const j1 = await createFlight(agent, { flight_date: '2024-04-05', origin_iata: 'LHR', destination_iata: 'NRT', flight_number: 'JL42' });
    const j2 = await createFlight(agent, { flight_date: '2024-04-10', origin_iata: 'NRT', destination_iata: 'ITM', flight_number: 'JL105' });
    const j3 = await createFlight(agent, { flight_date: '2024-04-15', origin_iata: 'ITM', destination_iata: 'LHR', flight_number: 'JL41' });
    // A lone one-way flight far from everything else — never suggested
    const lone = await createFlight(agent, { flight_date: '2022-01-01', origin_iata: 'SFO', destination_iata: 'LAX', flight_number: 'UA1' });
    return { japan: [j1, j2, j3], lone };
  }

  it('suggests multi-leg groupings of unassigned flights with a generated name', async () => {
    const { agent } = createTestApp();
    const { japan, lone } = await seedHistory(agent);

    const res = await agent.get('/api/trips/suggestions');
    expect(res.status).toBe(200);

    const suggestions = res.body.suggestions as Array<{ name: string; flight_ids: number[]; flights: unknown[] }>;
    const japanSuggestion = suggestions.find((s) => s.flight_ids.includes(japan[0]));
    expect(japanSuggestion).toBeDefined();
    expect(japanSuggestion!.flight_ids).toEqual(japan);
    expect(japanSuggestion!.name).toMatch(/Japan/);
    expect(japanSuggestion!.flights).toHaveLength(3);

    // The lone flight never appears in any suggestion
    expect(suggestions.some((s) => s.flight_ids.includes(lone))).toBe(false);
  });

  it('excludes flights already assigned to a trip, so accepting removes the suggestion', async () => {
    const { agent } = createTestApp();
    const { japan } = await seedHistory(agent);

    const before = await agent.get('/api/trips/suggestions');
    const suggestion = (before.body.suggestions as Array<{ name: string; flight_ids: number[] }>)
      .find((s) => s.flight_ids.includes(japan[0]))!;

    const created = await agent.post('/api/trips').send({ name: suggestion.name, flight_ids: suggestion.flight_ids });
    expect(created.status).toBe(201);

    const after = await agent.get('/api/trips/suggestions');
    const remaining = after.body.suggestions as Array<{ flight_ids: number[] }>;
    expect(remaining.some((s) => s.flight_ids.some((id) => japan.includes(id)))).toBe(false);
  });
});
