import { Router } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { Db } from '../db';
import type { FlightPayload, FlightRecord, ImportPreviewResponse, ImportCommitResponse, ClassOfService, FlightReason } from '../types';
import { normalizeFlightNumber } from '../services/flight-lookup/FlightLookupService.js';

// ─── FR24 CSV column names (after trim+lowercase) ────────────────────────────

export const FR24_REQUIRED_COLUMNS = [
  'date', 'flight number', 'from', 'to', 'airline',
] as const;

// Flight class numeric mapping from FR24
const CLASS_MAP: Record<string, ClassOfService> = {
  '1': 'Economy',
  '2': 'Business',
  '3': 'First',
  '4': 'Premium Economy',
};

// Flight reason mapping from FR24
const REASON_MAP: Record<string, FlightReason> = {
  '1': 'Leisure',
  '2': 'Business',
};

// ─── Pure helper: parse IATA code from FR24 location string ──────────────────
// e.g. "London / Heathrow (LHR/EGLL)" → "LHR"
export function parseIata(location: string): string {
  const match = location.match(/\(([A-Z]{3,4})(?:\/[A-Z]{4})?\)/);
  return match ? match[1] : location.trim().toUpperCase();
}

// e.g. "British Airways (BA/BAW)" → { name: "British Airways", iata: "BA" }
export function parseAirline(raw: string): { name: string; iata?: string } {
  const match = raw.match(/^(.+?)\s*\(([A-Z]{2})\/[A-Z]{2,3}\)$/);
  if (match) return { name: match[1].trim(), iata: match[2] };
  // Fallback: strip parenthetical entirely
  return { name: raw.replace(/\s*\(.*\)$/, '').trim() };
}

// e.g. "Airbus A380-800 (A388)" → "Airbus A380-800"
export function parseAircraftType(raw: string): string {
  return raw.replace(/\s*\([^)]+\)$/, '').trim();
}

// e.g. "21:00:00" → "21:00"
export function parseTime(raw: string): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : undefined;
}

// e.g. "10:20:00" → 620
export function parseDurationMinutes(raw: string): number | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^(\d+):(\d{2})/);
  if (!match) return undefined;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function normaliseHeaders(raw: string[]): string[] {
  return raw.map((h) => h.trim().toLowerCase());
}

// Map a single FR24 CSV row to a FlightPayload (without passengers)
export function mapFr24Row(row: Record<string, string>): Partial<FlightPayload> | null {
  const date = row['date']?.trim();
  const rawFrom = row['from']?.trim();
  const rawTo = row['to']?.trim();
  const rawAirline = row['airline']?.trim();

  if (!date || !rawFrom || !rawTo || !rawAirline) return null;

  const airline = parseAirline(rawAirline);
  const rawAircraft = row['aircraft']?.trim();
  const rawClass = row['flight class']?.trim();
  const rawReason = row['flight reason']?.trim();
  const rawDuration = row['duration']?.trim();
  const rawDepTime = row['dep time']?.trim();
  const rawArrTime = row['arr time']?.trim();

  const payload: Partial<FlightPayload> = {
    flight_date: date,
    origin_iata: parseIata(rawFrom),
    destination_iata: parseIata(rawTo),
    airline_name: airline.name,
    airline_iata: airline.iata,
    flight_number: row['flight number']?.trim().replace(/\s+/g, '').toUpperCase() || undefined,
    scheduled_departure: parseTime(rawDepTime ?? ''),
    scheduled_arrival: parseTime(rawArrTime ?? ''),
    aircraft_type: rawAircraft ? parseAircraftType(rawAircraft) : undefined,
    aircraft_registration: row['registration']?.trim() || undefined,
    seat: row['seat number']?.trim() || undefined,
    class: rawClass ? CLASS_MAP[rawClass] : undefined,
    reason: rawReason ? REASON_MAP[rawReason] : undefined,
    duration_minutes: rawDuration ? parseDurationMinutes(rawDuration) : undefined,
    notes: row['note']?.trim() || undefined,
    data_source: 'flightradar24_csv',
  };

  return payload;
}

// ─── In-memory token store ────────────────────────────────────────────────────

interface PendingImport {
  passenger: string;
  toCreate: FlightPayload[];
  toMerge: Array<{ existingId: number; existingFlight: FlightRecord; incomingFlight: FlightPayload }>;
  skipped: FlightPayload[];
  expiresAt: number;
}

const tokenStore = new Map<string, PendingImport>();
const TOKEN_TTL_MS = 5 * 60 * 1000;

function purgeExpired() {
  const now = Date.now();
  for (const [key, val] of tokenStore.entries()) {
    if (val.expiresAt < now) tokenStore.delete(key);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPassengers(db: Db, flightId: number): string[] {
  return (db.prepare('SELECT name FROM flight_passengers WHERE flight_id = ?').all(flightId) as { name: string }[]).map((r) => r.name);
}

function rowToRecord(db: Db, row: Record<string, unknown>): FlightRecord {
  return {
    ...(row as Omit<FlightRecord, 'passengers'>),
    passengers: getPassengers(db, row.id as number),
  };
}

function findExistingFlight(db: Db, flightDate: string, flightNumber: string | undefined): FlightRecord | undefined {
  if (!flightNumber) return undefined;
  const normalized = normalizeFlightNumber(flightNumber);
  // Check both the raw number and normalized form
  const rows = db.prepare(
    'SELECT * FROM flights WHERE flight_date = ? AND flight_number IS NOT NULL'
  ).all(flightDate) as Record<string, unknown>[];
  for (const r of rows) {
    const existing = normalizeFlightNumber(r.flight_number as string);
    if (existing === normalized) return rowToRecord(db, r);
  }
  return undefined;
}

// ─── Router ──────────────────────────────────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage() });

export function createImportRouter(db: Db) {
  const router = Router();

  // POST /api/import/preview
  router.post('/preview', upload.single('file'), (req, res) => {
    const passenger = (req.body as Record<string, string>).passenger?.trim();
    if (!passenger) {
      return res.status(400).json({ error: 'passenger field is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }

    const csvText = req.file.buffer.toString('utf-8');
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
    });

    const headers = parsed.meta.fields ?? [];
    const missing = FR24_REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
      return res.status(400).json({
        error: `CSV is missing required columns: ${missing.join(', ')}`,
        missing,
      });
    }

    const toCreate: FlightPayload[] = [];
    const toMerge: ImportPreviewResponse['toMerge'] = [];
    const skipped: FlightPayload[] = [];

    for (const row of parsed.data) {
      const mapped = mapFr24Row(row);
      if (!mapped || !mapped.origin_iata || !mapped.destination_iata || !mapped.airline_name) continue;

      const payload: FlightPayload = {
        ...(mapped as FlightPayload),
        passengers: [passenger],
      };

      const match = findExistingFlight(db, payload.flight_date, payload.flight_number);

      if (!match) {
        toCreate.push(payload);
      } else if (match.passengers.includes(passenger)) {
        skipped.push(payload);
      } else {
        toMerge.push({ existingId: match.id, existingFlight: match, incomingFlight: payload });
      }
    }

    purgeExpired();
    const token = uuidv4();
    tokenStore.set(token, { passenger, toCreate, toMerge, skipped, expiresAt: Date.now() + TOKEN_TTL_MS });

    res.json({ passenger, toCreate, toMerge, skipped, token });
  });

  // POST /api/import/commit
  router.post('/commit', (req, res) => {
    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ error: 'token is required' });

    const pending = tokenStore.get(token);
    if (!pending || pending.expiresAt < Date.now()) {
      tokenStore.delete(token as string);
      return res.status(400).json({ error: 'Import token is invalid or has expired' });
    }

    const { passenger, toCreate, toMerge, skipped } = pending;
    tokenStore.delete(token);

    let flightsCreated = 0;
    let flightsMatched = 0;
    let passengersAdded = 0;
    const warnings: string[] = [];

    const commit = db.transaction(() => {
      for (const payload of toCreate) {
        try {
          const result = db.prepare(`
            INSERT INTO flights (
              flight_date, airline_iata, airline_name, flight_number,
              origin_iata, destination_iata,
              scheduled_departure, scheduled_arrival,
              aircraft_type, aircraft_registration,
              seat, class, reason, duration_minutes, data_source, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            payload.flight_date, payload.airline_iata ?? null, payload.airline_name,
            payload.flight_number ?? null,
            payload.origin_iata, payload.destination_iata,
            payload.scheduled_departure ?? null, payload.scheduled_arrival ?? null,
            payload.aircraft_type ?? null, payload.aircraft_registration ?? null,
            payload.seat ?? null, payload.class ?? null, payload.reason ?? null,
            payload.duration_minutes ?? null, payload.data_source ?? null,
            payload.notes ?? null,
          );
          db.prepare('INSERT OR IGNORE INTO flight_passengers (flight_id, name) VALUES (?, ?)').run(result.lastInsertRowid, passenger);
          flightsCreated++;
          passengersAdded++;
        } catch (e) {
          warnings.push(`Failed to create flight ${payload.flight_number ?? ''} on ${payload.flight_date}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      for (const { existingId, incomingFlight } of toMerge) {
        // Update any missing fields on the existing flight
        db.prepare(`
          UPDATE flights SET
            aircraft_type = COALESCE(aircraft_type, ?),
            aircraft_registration = COALESCE(aircraft_registration, ?),
            scheduled_departure = COALESCE(scheduled_departure, ?),
            scheduled_arrival = COALESCE(scheduled_arrival, ?),
            seat = COALESCE(seat, ?),
            class = COALESCE(class, ?),
            reason = COALESCE(reason, ?),
            duration_minutes = COALESCE(duration_minutes, ?),
            notes = COALESCE(notes, ?),
            updated_at = datetime('now')
          WHERE id = ?
        `).run(
          incomingFlight.aircraft_type ?? null,
          incomingFlight.aircraft_registration ?? null,
          incomingFlight.scheduled_departure ?? null,
          incomingFlight.scheduled_arrival ?? null,
          incomingFlight.seat ?? null,
          incomingFlight.class ?? null,
          incomingFlight.reason ?? null,
          incomingFlight.duration_minutes ?? null,
          incomingFlight.notes ?? null,
          existingId,
        );

        const added = db.prepare('INSERT OR IGNORE INTO flight_passengers (flight_id, name) VALUES (?, ?)').run(existingId, passenger);
        flightsMatched++;
        if (added.changes > 0) passengersAdded++;
      }
    });

    commit();

    const response: ImportCommitResponse = {
      rows_processed: toCreate.length + toMerge.length + skipped.length,
      flights_created: flightsCreated,
      flights_matched: flightsMatched,
      passengers_added: passengersAdded,
      rows_skipped: skipped.length,
      warnings,
    };

    res.json(response);
  });

  return router;
}
