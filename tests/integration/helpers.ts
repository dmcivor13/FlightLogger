import { createDb, Db } from '../../server/db';
import { createApp } from '../../server/app';
import supertest from 'supertest';

export function createTestApp() {
  const db: Db = createDb(':memory:');
  const app = createApp(db);
  const agent = supertest(app);
  return { db, app, agent };
}

/** Minimal valid flight payload for use in tests */
export const baseFlight = {
  flight_date: '2026-01-15',
  origin_iata: 'SFO',
  destination_iata: 'LAX',
  airline_name: 'United',
  flight_number: 'UA123',
  passengers: ['Alice'],
} as const;
