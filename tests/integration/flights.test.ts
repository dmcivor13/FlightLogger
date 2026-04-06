import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, baseFlight } from './helpers';

describe('GET /api/flights', () => {
  it('returns empty list when no flights', async () => {
    const { agent } = createTestApp();
    const res = await agent.get('/api/flights');
    expect(res.status).toBe(200);
    expect(res.body.flights).toEqual([]);
  });

  it('returns all flights', async () => {
    const { agent } = createTestApp();
    await agent.post('/api/flights').send(baseFlight);
    await agent.post('/api/flights').send({ ...baseFlight, flight_number: 'UA456', destination_iata: 'SEA' });
    const res = await agent.get('/api/flights');
    expect(res.status).toBe(200);
    expect(res.body.flights).toHaveLength(2);
  });

  it('filters by passenger name', async () => {
    const { agent } = createTestApp();
    await agent.post('/api/flights').send({ ...baseFlight, passengers: ['Alice'] });
    await agent.post('/api/flights').send({ ...baseFlight, flight_number: 'UA999', passengers: ['Bob'] });
    const res = await agent.get('/api/flights?passenger=Alice');
    expect(res.status).toBe(200);
    expect(res.body.flights).toHaveLength(1);
    expect(res.body.flights[0].passengers).toContain('Alice');
  });

  it('free-text search across origin/destination/airline/notes', async () => {
    const { agent } = createTestApp();
    await agent.post('/api/flights').send({ ...baseFlight, notes: 'bumpy ride' });
    await agent.post('/api/flights').send({ ...baseFlight, flight_number: 'DL1', airline_name: 'Delta', notes: 'smooth' });
    const res = await agent.get('/api/flights?q=bumpy');
    expect(res.status).toBe(200);
    expect(res.body.flights).toHaveLength(1);
  });

  it('filters by date range', async () => {
    const { agent } = createTestApp();
    await agent.post('/api/flights').send({ ...baseFlight, flight_date: '2025-01-01' });
    await agent.post('/api/flights').send({ ...baseFlight, flight_number: 'UA456', flight_date: '2026-06-01' });
    const res = await agent.get('/api/flights?dateFrom=2026-01-01&dateTo=2026-12-31');
    expect(res.status).toBe(200);
    expect(res.body.flights).toHaveLength(1);
    expect(res.body.flights[0].flight_date).toBe('2026-06-01');
  });
});

describe('POST /api/flights', () => {
  it('creates a flight and returns 201 with all fields', async () => {
    const { agent } = createTestApp();
    const payload = {
      ...baseFlight,
      scheduled_departure: '08:30',
      scheduled_arrival: '10:15',
      aircraft_type: 'Boeing 737-800',
      aircraft_registration: 'N12345',
      seat: '14A',
      class: 'Economy',
      reason: 'Leisure',
      notes: 'Great flight',
      passengers: ['Alice', 'Bob'],
    };
    const res = await agent.post('/api/flights').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.flight_date).toBe(payload.flight_date);
    expect(res.body.origin_iata).toBe('SFO');
    expect(res.body.destination_iata).toBe('LAX');
    expect(res.body.airline_name).toBe('United');
    expect(res.body.aircraft_type).toBe('Boeing 737-800');
    expect(res.body.seat).toBe('14A');
    expect(res.body.class).toBe('Economy');
    expect(res.body.reason).toBe('Leisure');
    expect(res.body.passengers).toEqual(expect.arrayContaining(['Alice', 'Bob']));
  });

  it('returns 400 when required fields are missing', async () => {
    const { agent } = createTestApp();
    const res = await agent.post('/api/flights').send({ flight_date: '2026-01-01' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/flights/:id', () => {
  it('returns a single flight by id', async () => {
    const { agent } = createTestApp();
    const created = await agent.post('/api/flights').send(baseFlight);
    const res = await agent.get(`/api/flights/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.passengers).toContain('Alice');
  });

  it('returns 404 for unknown id', async () => {
    const { agent } = createTestApp();
    const res = await agent.get('/api/flights/9999');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/flights/:id', () => {
  it('updates flight fields', async () => {
    const { agent } = createTestApp();
    const created = await agent.post('/api/flights').send(baseFlight);
    const res = await agent.put(`/api/flights/${created.body.id}`).send({
      ...baseFlight,
      notes: 'Updated notes',
      seat: '2A',
      passengers: ['Alice'],
    });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Updated notes');
    expect(res.body.seat).toBe('2A');
  });

  it('replaces passengers on update', async () => {
    const { agent } = createTestApp();
    const created = await agent.post('/api/flights').send({ ...baseFlight, passengers: ['Alice', 'Bob'] });
    const res = await agent.put(`/api/flights/${created.body.id}`).send({
      ...baseFlight,
      passengers: ['Carol'],
    });
    expect(res.status).toBe(200);
    expect(res.body.passengers).toEqual(['Carol']);
  });

  it('returns 404 for unknown id', async () => {
    const { agent } = createTestApp();
    const res = await agent.put('/api/flights/9999').send(baseFlight);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/flights/:id', () => {
  it('deletes a flight and cascades to passengers', async () => {
    const { agent, db } = createTestApp();
    const created = await agent.post('/api/flights').send(baseFlight);
    const deleteRes = await agent.delete(`/api/flights/${created.body.id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await agent.get(`/api/flights/${created.body.id}`);
    expect(getRes.status).toBe(404);

    const passengers = db.prepare('SELECT * FROM flight_passengers WHERE flight_id = ?').all(created.body.id);
    expect(passengers).toHaveLength(0);
  });

  it('returns 404 for unknown id', async () => {
    const { agent } = createTestApp();
    const res = await agent.delete('/api/flights/9999');
    expect(res.status).toBe(404);
  });
});
