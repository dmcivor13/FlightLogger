import { Router } from 'express';
import type { Db } from '../db';
import type { FlightPayload, FlightRecord } from '../types';

function getPassengers(db: Db, flightId: number): string[] {
  return (db.prepare('SELECT name FROM flight_passengers WHERE flight_id = ? ORDER BY id').all(flightId) as { name: string }[]).map((r) => r.name);
}

function rowToRecord(db: Db, row: Record<string, unknown>): FlightRecord {
  return {
    ...(row as Omit<FlightRecord, 'passengers'>),
    passengers: getPassengers(db, row.id as number),
  };
}

export function createFlightsRouter(db: Db) {
  const router = Router();

  // GET /api/flights
  router.get('/', (req, res) => {
    const {
      dateFrom, dateTo, origin, destination, airline, aircraft, class: cls, reason, passenger, q,
    } = req.query as Record<string, string>;

    let sql = 'SELECT DISTINCT f.* FROM flights f';
    const params: unknown[] = [];

    if (passenger) {
      sql += ' INNER JOIN flight_passengers fp ON fp.flight_id = f.id AND fp.name = ?';
      params.push(passenger);
    }

    const conditions: string[] = [];

    if (dateFrom)    { conditions.push('f.flight_date >= ?');       params.push(dateFrom); }
    if (dateTo)      { conditions.push('f.flight_date <= ?');       params.push(dateTo); }
    if (origin)      { conditions.push('f.origin_iata = ?');        params.push(origin.toUpperCase()); }
    if (destination) { conditions.push('f.destination_iata = ?');   params.push(destination.toUpperCase()); }
    if (airline)     { conditions.push('f.airline_name LIKE ?');    params.push(`%${airline}%`); }
    if (aircraft)    { conditions.push('f.aircraft_type LIKE ?');   params.push(`%${aircraft}%`); }
    if (cls)         { conditions.push('f.class = ?');              params.push(cls); }
    if (reason)      { conditions.push('f.reason = ?');             params.push(reason); }
    if (q) {
      conditions.push('(f.airline_name LIKE ? OR f.flight_number LIKE ? OR f.aircraft_type LIKE ? OR f.origin_iata LIKE ? OR f.destination_iata LIKE ? OR f.notes LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY f.flight_date DESC, f.id DESC';

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    res.json({ flights: rows.map((r) => rowToRecord(db, r)) });
  });

  // GET /api/flights/:id
  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM flights WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(rowToRecord(db, row));
  });

  // POST /api/flights
  router.post('/', (req, res) => {
    const body = req.body as FlightPayload;
    if (!body.flight_date || !body.origin_iata || !body.destination_iata || !body.airline_name) {
      return res.status(400).json({ error: 'flight_date, origin_iata, destination_iata, and airline_name are required' });
    }

    const insert = db.transaction((payload: FlightPayload) => {
      const result = db.prepare(`
        INSERT INTO flights (
          flight_date, airline_iata, airline_name, flight_number,
          origin_iata, destination_iata,
          scheduled_departure, actual_departure,
          scheduled_arrival, actual_arrival,
          aircraft_type, aircraft_registration,
          seat, class, reason, duration_minutes, data_source, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        payload.flight_date, payload.airline_iata ?? null, payload.airline_name,
        payload.flight_number ?? null,
        payload.origin_iata, payload.destination_iata,
        payload.scheduled_departure ?? null, payload.actual_departure ?? null,
        payload.scheduled_arrival ?? null, payload.actual_arrival ?? null,
        payload.aircraft_type ?? null, payload.aircraft_registration ?? null,
        payload.seat ?? null, payload.class ?? null, payload.reason ?? null,
        payload.duration_minutes ?? null, payload.data_source ?? null,
        payload.notes ?? null,
      );
      const id = result.lastInsertRowid as number;
      for (const name of (payload.passengers ?? [])) {
        db.prepare('INSERT OR IGNORE INTO flight_passengers (flight_id, name) VALUES (?, ?)').run(id, name);
      }
      return id;
    });

    const id = insert(body);
    const row = db.prepare('SELECT * FROM flights WHERE id = ?').get(id) as Record<string, unknown>;
    res.status(201).json(rowToRecord(db, row));
  });

  // PUT /api/flights/:id
  router.put('/:id', (req, res) => {
    const existing = db.prepare('SELECT id FROM flights WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const body = req.body as FlightPayload;

    const update = db.transaction((payload: FlightPayload, id: string) => {
      db.prepare(`
        UPDATE flights SET
          flight_date = ?, airline_iata = ?, airline_name = ?, flight_number = ?,
          origin_iata = ?, destination_iata = ?,
          scheduled_departure = ?, actual_departure = ?,
          scheduled_arrival = ?, actual_arrival = ?,
          aircraft_type = ?, aircraft_registration = ?,
          seat = ?, class = ?, reason = ?,
          duration_minutes = ?, data_source = ?, notes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        payload.flight_date, payload.airline_iata ?? null, payload.airline_name,
        payload.flight_number ?? null,
        payload.origin_iata, payload.destination_iata,
        payload.scheduled_departure ?? null, payload.actual_departure ?? null,
        payload.scheduled_arrival ?? null, payload.actual_arrival ?? null,
        payload.aircraft_type ?? null, payload.aircraft_registration ?? null,
        payload.seat ?? null, payload.class ?? null, payload.reason ?? null,
        payload.duration_minutes ?? null, payload.data_source ?? null,
        payload.notes ?? null,
        id,
      );
      db.prepare('DELETE FROM flight_passengers WHERE flight_id = ?').run(id);
      for (const name of (payload.passengers ?? [])) {
        db.prepare('INSERT OR IGNORE INTO flight_passengers (flight_id, name) VALUES (?, ?)').run(id, name);
      }
    });

    update(body, req.params.id);
    const row = db.prepare('SELECT * FROM flights WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json(rowToRecord(db, row));
  });

  // DELETE /api/flights/:id
  router.delete('/:id', (req, res) => {
    const existing = db.prepare('SELECT id FROM flights WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM flights WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });

  return router;
}
