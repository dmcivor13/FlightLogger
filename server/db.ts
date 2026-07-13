import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Schema version history:
// 0 → 1: Rename columns, add airline_iata, actual times, reason, duration_minutes, data_source,
//         composite index on (flight_date, flight_number), UNIQUE on flight_passengers(flight_id, name)
// 1 → 2: Move seat, class, reason, notes from flights to flight_passengers (per-passenger attributes)
// 2 → 3: Expand class CHECK constraint to include 'US Domestic First'
// 3 → 4: Add trips table + nullable flights.trip_id (ON DELETE SET NULL)

const CURRENT_VERSION = 4;

const DDL_V4 = `
  CREATE TABLE IF NOT EXISTS trips (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    notes      TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flights (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,

    flight_date           TEXT    NOT NULL,

    airline_iata          TEXT,
    airline_name          TEXT    NOT NULL,

    flight_number         TEXT,

    origin_iata           TEXT    NOT NULL,
    destination_iata      TEXT    NOT NULL,

    scheduled_departure   TEXT,
    actual_departure      TEXT,

    scheduled_arrival     TEXT,
    actual_arrival        TEXT,

    aircraft_type         TEXT,
    aircraft_registration TEXT,

    duration_minutes      INTEGER,
    data_source           TEXT,

    trip_id               INTEGER REFERENCES trips(id) ON DELETE SET NULL,

    created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flight_passengers (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    name      TEXT    NOT NULL,
    seat      TEXT,
    class     TEXT    CHECK(class IN ('Economy', 'Premium Economy', 'Business', 'US Domestic First', 'First')),
    reason    TEXT    CHECK(reason IN ('Business', 'Leisure')),
    notes     TEXT,
    UNIQUE(flight_id, name)
  );

  CREATE INDEX IF NOT EXISTS idx_flights_date             ON flights(flight_date);
  CREATE INDEX IF NOT EXISTS idx_flights_flight_number    ON flights(flight_number);
  CREATE INDEX IF NOT EXISTS idx_flights_aircraft_reg     ON flights(aircraft_registration);
  CREATE INDEX IF NOT EXISTS idx_flights_date_num         ON flights(flight_date, flight_number);
  CREATE INDEX IF NOT EXISTS idx_flights_trip_id          ON flights(trip_id);
  CREATE INDEX IF NOT EXISTS idx_fp_flight_id             ON flight_passengers(flight_id);
  CREATE INDEX IF NOT EXISTS idx_fp_name                  ON flight_passengers(name);
`;

function migrate(db: ReturnType<typeof Database>): void {
  let version = (db.pragma('user_version', { simple: true }) as number);

  if (version >= CURRENT_VERSION) return;

  // Version 0: either an old pre-v1 database or a completely fresh one
  if (version === 0) {
    const hasAnyFlightsTable = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='flights'"
    ).get();

    if (!hasAnyFlightsTable) {
      // Completely fresh database — create current schema directly
      db.exec(DDL_V4);
      db.pragma('user_version = 4');
      return;
    }

    // Old pre-v1 schema: has flights table with legacy column names (date, airline, origin, etc.)
    const hasOldSchema = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='flights' AND sql LIKE '%date%NOT NULL%'"
    ).get();

    if (hasOldSchema) {
      db.exec(`
        CREATE TABLE flights_v1 (
          id                    INTEGER PRIMARY KEY AUTOINCREMENT,
          flight_date           TEXT    NOT NULL,
          airline_iata          TEXT,
          airline_name          TEXT    NOT NULL,
          flight_number         TEXT,
          origin_iata           TEXT    NOT NULL,
          destination_iata      TEXT    NOT NULL,
          scheduled_departure   TEXT,
          actual_departure      TEXT,
          scheduled_arrival     TEXT,
          actual_arrival        TEXT,
          aircraft_type         TEXT,
          aircraft_registration TEXT,
          seat                  TEXT,
          class                 TEXT    CHECK(class IN ('Economy', 'Premium Economy', 'Business', 'First')),
          reason                TEXT    CHECK(reason IN ('Business', 'Leisure')),
          duration_minutes      INTEGER,
          data_source           TEXT,
          notes                 TEXT,
          created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO flights_v1 (
          id, flight_date, airline_name, flight_number,
          origin_iata, destination_iata,
          scheduled_departure, scheduled_arrival,
          aircraft_type, aircraft_registration,
          seat, class, notes, created_at, updated_at
        )
        SELECT
          id, date, airline, flight_number,
          origin, destination,
          departure_time, arrival_time,
          aircraft, tail_number,
          seat, class, notes, created_at, updated_at
        FROM flights;

        DROP TABLE flights;
        ALTER TABLE flights_v1 RENAME TO flights;

        CREATE TABLE flight_passengers_v1 (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          flight_id INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
          name      TEXT    NOT NULL,
          UNIQUE(flight_id, name)
        );

        INSERT OR IGNORE INTO flight_passengers_v1 (id, flight_id, name)
        SELECT id, flight_id, name FROM flight_passengers;

        DROP TABLE flight_passengers;
        ALTER TABLE flight_passengers_v1 RENAME TO flight_passengers;

        CREATE INDEX IF NOT EXISTS idx_flights_date          ON flights(flight_date);
        CREATE INDEX IF NOT EXISTS idx_flights_flight_number ON flights(flight_number);
        CREATE INDEX IF NOT EXISTS idx_flights_aircraft_reg  ON flights(aircraft_registration);
        CREATE INDEX IF NOT EXISTS idx_flights_date_num      ON flights(flight_date, flight_number);
        CREATE INDEX IF NOT EXISTS idx_fp_flight_id          ON flight_passengers(flight_id);
        CREATE INDEX IF NOT EXISTS idx_fp_name               ON flight_passengers(name);
      `);
    }

    db.pragma('user_version = 1');
    version = 1;
  }

  // Version 1 → 2: move seat/class/reason/notes from flights to flight_passengers
  if (version === 1) {
    db.exec(`
      ALTER TABLE flight_passengers ADD COLUMN seat   TEXT;
      ALTER TABLE flight_passengers ADD COLUMN class  TEXT
        CHECK(class IN ('Economy', 'Premium Economy', 'Business', 'First'));
      ALTER TABLE flight_passengers ADD COLUMN reason TEXT
        CHECK(reason IN ('Business', 'Leisure'));
      ALTER TABLE flight_passengers ADD COLUMN notes  TEXT;

      UPDATE flight_passengers SET
        seat   = (SELECT seat   FROM flights WHERE flights.id = flight_passengers.flight_id),
        class  = (SELECT class  FROM flights WHERE flights.id = flight_passengers.flight_id),
        reason = (SELECT reason FROM flights WHERE flights.id = flight_passengers.flight_id),
        notes  = (SELECT notes  FROM flights WHERE flights.id = flight_passengers.flight_id);

      CREATE TABLE flights_v2 (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        flight_date           TEXT    NOT NULL,
        airline_iata          TEXT,
        airline_name          TEXT    NOT NULL,
        flight_number         TEXT,
        origin_iata           TEXT    NOT NULL,
        destination_iata      TEXT    NOT NULL,
        scheduled_departure   TEXT,
        actual_departure      TEXT,
        scheduled_arrival     TEXT,
        actual_arrival        TEXT,
        aircraft_type         TEXT,
        aircraft_registration TEXT,
        duration_minutes      INTEGER,
        data_source           TEXT,
        created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO flights_v2 (
        id, flight_date, airline_iata, airline_name, flight_number,
        origin_iata, destination_iata,
        scheduled_departure, actual_departure,
        scheduled_arrival, actual_arrival,
        aircraft_type, aircraft_registration,
        duration_minutes, data_source,
        created_at, updated_at
      )
      SELECT
        id, flight_date, airline_iata, airline_name, flight_number,
        origin_iata, destination_iata,
        scheduled_departure, actual_departure,
        scheduled_arrival, actual_arrival,
        aircraft_type, aircraft_registration,
        duration_minutes, data_source,
        created_at, updated_at
      FROM flights;

      DROP TABLE flights;
      ALTER TABLE flights_v2 RENAME TO flights;

      CREATE INDEX IF NOT EXISTS idx_flights_date          ON flights(flight_date);
      CREATE INDEX IF NOT EXISTS idx_flights_flight_number ON flights(flight_number);
      CREATE INDEX IF NOT EXISTS idx_flights_aircraft_reg  ON flights(aircraft_registration);
      CREATE INDEX IF NOT EXISTS idx_flights_date_num      ON flights(flight_date, flight_number);
    `);

    db.pragma('user_version = 2');
    version = 2;
  }

  // Version 2 → 3: expand class CHECK constraint to include 'US Domestic First'
  if (version === 2) {
    db.exec(`
      CREATE TABLE flight_passengers_v3 (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        flight_id INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
        name      TEXT    NOT NULL,
        seat      TEXT,
        class     TEXT    CHECK(class IN ('Economy', 'Premium Economy', 'Business', 'US Domestic First', 'First')),
        reason    TEXT    CHECK(reason IN ('Business', 'Leisure')),
        notes     TEXT,
        UNIQUE(flight_id, name)
      );

      INSERT INTO flight_passengers_v3 (id, flight_id, name, seat, class, reason, notes)
      SELECT id, flight_id, name, seat, class, reason, notes FROM flight_passengers;

      DROP TABLE flight_passengers;
      ALTER TABLE flight_passengers_v3 RENAME TO flight_passengers;

      CREATE INDEX IF NOT EXISTS idx_fp_flight_id ON flight_passengers(flight_id);
      CREATE INDEX IF NOT EXISTS idx_fp_name      ON flight_passengers(name);
    `);

    db.pragma('user_version = 3');
    version = 3;
  }

  // Version 3 → 4: add trips table + nullable flights.trip_id
  if (version === 3) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS trips (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL,
        notes      TEXT,
        created_at TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      ALTER TABLE flights ADD COLUMN trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_flights_trip_id ON flights(trip_id);
    `);

    db.pragma('user_version = 4');
  }
}

const DEFAULT_DB_PATH = process.env.DB_PATH ?? path.join(__dirname, 'flightlogger.db');

export function createDb(dbPath: string = DEFAULT_DB_PATH) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export type Db = ReturnType<typeof createDb>;
