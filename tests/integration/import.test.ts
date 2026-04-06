import { describe, it, expect } from 'vitest';
import path from 'path';
import { createTestApp } from './helpers';

const FIXTURE_CSV = path.join(__dirname, '../fixtures/sample-fr24.csv');

describe('POST /api/import/preview', () => {
  it('categorises all rows as toCreate on first upload', async () => {
    const { agent } = createTestApp();
    const res = await agent
      .post('/api/import/preview')
      .field('passenger', 'Alice')
      .attach('file', FIXTURE_CSV);

    expect(res.status).toBe(200);
    expect(res.body.passenger).toBe('Alice');
    expect(res.body.toCreate).toHaveLength(3);
    expect(res.body.toMerge).toHaveLength(0);
    expect(res.body.skipped).toHaveLength(0);
    expect(res.body.token).toBeTruthy();
  });

  it('categorises all rows as skipped when same passenger uploads same CSV again', async () => {
    const { agent } = createTestApp();

    // First upload + commit
    const preview1 = await agent
      .post('/api/import/preview')
      .field('passenger', 'Alice')
      .attach('file', FIXTURE_CSV);
    await agent.post('/api/import/commit').send({ token: preview1.body.token });

    // Second upload for same passenger
    const preview2 = await agent
      .post('/api/import/preview')
      .field('passenger', 'Alice')
      .attach('file', FIXTURE_CSV);

    expect(preview2.status).toBe(200);
    expect(preview2.body.toCreate).toHaveLength(0);
    expect(preview2.body.toMerge).toHaveLength(0);
    expect(preview2.body.skipped).toHaveLength(3);
  });

  it('categorises all rows as toMerge when a different passenger uploads the same CSV', async () => {
    const { agent } = createTestApp();

    // Alice uploads first
    const preview1 = await agent
      .post('/api/import/preview')
      .field('passenger', 'Alice')
      .attach('file', FIXTURE_CSV);
    await agent.post('/api/import/commit').send({ token: preview1.body.token });

    // Bob uploads the same CSV
    const preview2 = await agent
      .post('/api/import/preview')
      .field('passenger', 'Bob')
      .attach('file', FIXTURE_CSV);

    expect(preview2.status).toBe(200);
    expect(preview2.body.toCreate).toHaveLength(0);
    expect(preview2.body.toMerge).toHaveLength(3);
    expect(preview2.body.skipped).toHaveLength(0);
    expect(preview2.body.toMerge[0].existingFlight).toBeDefined();
  });

  it('returns 400 with descriptive error for missing required columns', async () => {
    const { agent } = createTestApp();
    const badCsv = Buffer.from('Date,Airline,From,To\n2026-01-01,United,SFO,LAX');
    const res = await agent
      .post('/api/import/preview')
      .field('passenger', 'Alice')
      .attach('file', badCsv, { filename: 'bad.csv', contentType: 'text/csv' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('returns 400 when passenger field is missing', async () => {
    const { agent } = createTestApp();
    const res = await agent
      .post('/api/import/preview')
      .attach('file', FIXTURE_CSV);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/import/commit', () => {
  it('creates flights and tags passenger, returns new summary shape', async () => {
    const { agent } = createTestApp();
    const preview = await agent
      .post('/api/import/preview')
      .field('passenger', 'Alice')
      .attach('file', FIXTURE_CSV);

    const commit = await agent.post('/api/import/commit').send({ token: preview.body.token });
    expect(commit.status).toBe(200);
    expect(commit.body.flights_created).toBe(3);
    expect(commit.body.flights_matched).toBe(0);
    expect(commit.body.passengers_added).toBe(3);
    expect(commit.body.rows_skipped).toBe(0);
    expect(commit.body.rows_processed).toBe(3);
    expect(Array.isArray(commit.body.warnings)).toBe(true);

    // Verify flights exist in DB
    const list = await agent.get('/api/flights?passenger=Alice');
    expect(list.body.flights).toHaveLength(3);
  });

  it('tags new passenger on existing flights without creating duplicates', async () => {
    const { agent } = createTestApp();

    // Alice commits first
    const p1 = await agent.post('/api/import/preview').field('passenger', 'Alice').attach('file', FIXTURE_CSV);
    await agent.post('/api/import/commit').send({ token: p1.body.token });

    // Bob commits
    const p2 = await agent.post('/api/import/preview').field('passenger', 'Bob').attach('file', FIXTURE_CSV);
    const commit = await agent.post('/api/import/commit').send({ token: p2.body.token });

    expect(commit.body.flights_created).toBe(0);
    expect(commit.body.flights_matched).toBe(3);

    // Total flights should still be 3 (no duplicates)
    const allFlights = await agent.get('/api/flights');
    expect(allFlights.body.flights).toHaveLength(3);

    // Bob should now be tagged on all 3
    const bobFlights = await agent.get('/api/flights?passenger=Bob');
    expect(bobFlights.body.flights).toHaveLength(3);
  });

  it('returns 400 for unknown or expired token', async () => {
    const { agent } = createTestApp();
    const res = await agent.post('/api/import/commit').send({ token: 'does-not-exist' });
    expect(res.status).toBe(400);
  });
});

describe('import pure functions', () => {
  it('normaliseHeaders trims and lowercases', async () => {
    const { normaliseHeaders } = await import('../../server/routes/import');
    expect(normaliseHeaders(['  Date ', 'Flight Number'])).toEqual(['date', 'flight number']);
  });

  it('parseIata extracts IATA code from FR24 location string', async () => {
    const { parseIata } = await import('../../server/routes/import');
    expect(parseIata('London / Heathrow (LHR/EGLL)')).toBe('LHR');
    expect(parseIata('San Francisco / San Francisco International (SFO/KSFO)')).toBe('SFO');
  });

  it('parseAirline parses airline name and IATA code', async () => {
    const { parseAirline } = await import('../../server/routes/import');
    const result = parseAirline('British Airways (BA/BAW)');
    expect(result.name).toBe('British Airways');
    expect(result.iata).toBe('BA');
  });

  it('parseAircraftType strips ICAO code from aircraft string', async () => {
    const { parseAircraftType } = await import('../../server/routes/import');
    expect(parseAircraftType('Airbus A380-800 (A388)')).toBe('Airbus A380-800');
    expect(parseAircraftType('Boeing 737-800 (B738)')).toBe('Boeing 737-800');
  });

  it('parseDurationMinutes converts HH:MM:SS to minutes', async () => {
    const { parseDurationMinutes } = await import('../../server/routes/import');
    expect(parseDurationMinutes('10:20:00')).toBe(620);
    expect(parseDurationMinutes('01:45:00')).toBe(105);
  });

  it('mapFr24Row maps FR24 row to FlightPayload fields', async () => {
    const { mapFr24Row } = await import('../../server/routes/import');
    const row = {
      'date': '2026-01-15',
      'flight number': 'UA123',
      'from': 'San Francisco / San Francisco International (SFO/KSFO)',
      'to': 'Los Angeles / Los Angeles International (LAX/KLAX)',
      'dep time': '08:30:00',
      'arr time': '10:15:00',
      'duration': '01:45:00',
      'airline': 'United Airlines (UA/UAL)',
      'aircraft': 'Boeing 737-800 (B738)',
      'registration': 'N12345',
      'seat number': '14A',
      'flight class': '1',
      'flight reason': '1',
      'note': 'Great flight',
    };
    const result = mapFr24Row(row);
    expect(result?.flight_date).toBe('2026-01-15');
    expect(result?.flight_number).toBe('UA123');
    expect(result?.origin_iata).toBe('SFO');
    expect(result?.destination_iata).toBe('LAX');
    expect(result?.airline_name).toBe('United Airlines');
    expect(result?.airline_iata).toBe('UA');
    expect(result?.aircraft_type).toBe('Boeing 737-800');
    expect(result?.aircraft_registration).toBe('N12345');
    expect(result?.scheduled_departure).toBe('08:30');
    expect(result?.scheduled_arrival).toBe('10:15');
    expect(result?.class).toBe('Economy');
    expect(result?.reason).toBe('Leisure');
    expect(result?.duration_minutes).toBe(105);
    expect(result?.notes).toBe('Great flight');
    expect(result?.data_source).toBe('flightradar24_csv');
  });
});
