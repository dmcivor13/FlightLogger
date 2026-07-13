import { Router } from 'express';
import type { Db } from '../db';
import type { TripPayload, TripRecord } from '../types';
import { rowToRecord } from './flights';
import { suggestTrips, SuggestionInputFlight } from '../services/trip-suggestions';

const FLIGHT_ORDER =
  "ORDER BY flight_date ASC, COALESCE(scheduled_departure, actual_departure, '99:99') ASC, id ASC";

function tripToRecord(db: Db, row: Record<string, unknown>): TripRecord {
  const flights = db
    .prepare(`SELECT * FROM flights WHERE trip_id = ? ${FLIGHT_ORDER}`)
    .all(row.id) as Record<string, unknown>[];
  return {
    ...(row as unknown as Omit<TripRecord, 'flights'>),
    flights: flights.map((f) => rowToRecord(db, f)),
  };
}

function getTripRow(db: Db, id: string | number): Record<string, unknown> | undefined {
  return db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
}

/** Returns the ids that do not exist in the flights table. */
function findUnknownFlightIds(db: Db, ids: number[]): number[] {
  const check = db.prepare('SELECT 1 FROM flights WHERE id = ?');
  return ids.filter((id) => !check.get(id));
}

function assignFlights(db: Db, tripId: number | bigint, ids: number[]): void {
  const assign = db.prepare(
    "UPDATE flights SET trip_id = ?, updated_at = datetime('now') WHERE id = ?",
  );
  for (const id of ids) assign.run(tripId, id);
}

export function createTripsRouter(db: Db) {
  const router = Router();

  // GET /api/trips — trips with their flights, newest trip first (by first flight date)
  router.get('/', (_req, res) => {
    const rows = db.prepare(`
      SELECT t.*, (SELECT MIN(flight_date) FROM flights WHERE trip_id = t.id) AS first_date
      FROM trips t
      ORDER BY first_date IS NULL, first_date DESC, t.id DESC
    `).all() as Record<string, unknown>[];
    res.json({
      trips: rows.map(({ first_date: _fd, ...row }) => tripToRecord(db, row)),
    });
  });

  // GET /api/trips/suggestions — must be registered before /:id
  router.get('/suggestions', (_req, res) => {
    const unassigned = db
      .prepare(`SELECT * FROM flights WHERE trip_id IS NULL ${FLIGHT_ORDER}`)
      .all() as Record<string, unknown>[];
    const groups = suggestTrips(unassigned as unknown as SuggestionInputFlight[]);

    const byId = new Map(unassigned.map((f) => [f.id as number, f]));
    res.json({
      suggestions: groups.map((g) => ({
        ...g,
        flights: g.flight_ids.map((id) => rowToRecord(db, byId.get(id)!)),
      })),
    });
  });

  // GET /api/trips/:id
  router.get('/:id', (req, res) => {
    const row = getTripRow(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(tripToRecord(db, row));
  });

  // POST /api/trips
  router.post('/', (req, res) => {
    const { name, notes, flight_ids: flightIds = [] } = (req.body ?? {}) as TripPayload;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (findUnknownFlightIds(db, flightIds).length > 0) {
      return res.status(400).json({ error: 'flight_ids contains unknown flight id(s)' });
    }

    const tripId = db.transaction(() => {
      const result = db
        .prepare('INSERT INTO trips (name, notes) VALUES (?, ?)')
        .run(name.trim(), notes ?? null);
      assignFlights(db, result.lastInsertRowid, flightIds);
      return result.lastInsertRowid;
    })();

    res.status(201).json(tripToRecord(db, getTripRow(db, tripId as number)!));
  });

  // PUT /api/trips/:id — updates name/notes; flight_ids present = full membership replace
  router.put('/:id', (req, res) => {
    const row = getTripRow(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const { name, notes, flight_ids: flightIds } = (req.body ?? {}) as TripPayload;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (flightIds !== undefined && findUnknownFlightIds(db, flightIds).length > 0) {
      return res.status(400).json({ error: 'flight_ids contains unknown flight id(s)' });
    }

    db.transaction(() => {
      db.prepare(
        "UPDATE trips SET name = ?, notes = ?, updated_at = datetime('now') WHERE id = ?",
      ).run(name.trim(), notes ?? row.notes ?? null, row.id);
      if (flightIds !== undefined) {
        db.prepare(
          "UPDATE flights SET trip_id = NULL, updated_at = datetime('now') WHERE trip_id = ?",
        ).run(row.id);
        assignFlights(db, row.id as number, flightIds);
      }
    })();

    res.json(tripToRecord(db, getTripRow(db, row.id as number)!));
  });

  // POST /api/trips/:id/flights — add flights (reassigning from another trip is allowed)
  router.post('/:id/flights', (req, res) => {
    const row = getTripRow(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const { flight_ids: flightIds } = (req.body ?? {}) as { flight_ids?: number[] };
    if (!Array.isArray(flightIds) || flightIds.length === 0) {
      return res.status(400).json({ error: 'flight_ids is required' });
    }
    if (findUnknownFlightIds(db, flightIds).length > 0) {
      return res.status(400).json({ error: 'flight_ids contains unknown flight id(s)' });
    }

    db.transaction(() => assignFlights(db, row.id as number, flightIds))();
    res.json(tripToRecord(db, row));
  });

  // DELETE /api/trips/:id/flights/:flightId — unassign one flight
  router.delete('/:id/flights/:flightId', (req, res) => {
    const row = getTripRow(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const result = db.prepare(
      "UPDATE flights SET trip_id = NULL, updated_at = datetime('now') WHERE id = ? AND trip_id = ?",
    ).run(req.params.flightId, row.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });

    res.json(tripToRecord(db, row));
  });

  // DELETE /api/trips/:id — flights survive via ON DELETE SET NULL
  router.delete('/:id', (req, res) => {
    const row = getTripRow(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM trips WHERE id = ?').run(row.id);
    res.status(204).end();
  });

  return router;
}
