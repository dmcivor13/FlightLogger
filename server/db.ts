import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Schema version history:
// 0 → 1: Rename columns, add airline_iata, actual times, reason, duration_minutes, data_source,
//         composite index on (flight_date, flight_number), UNIQUE on flight_passengers(flight_id, name)

const CURRENT_VERSION = 1;

const DDL_V1 = `
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

    seat                  TEXT,

    class                 TEXT    CHECK(class IN ('Economy', 'Premium Economy', 'Business', 'First')),
    reason                TEXT    CHECK(reason IN ('Business', 'Leisure')),

    duration_minutes      INTEGER,
    data_source           TEXT,

    notes                 TEXT,

    created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flight_passengers (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    name      TEXT    NOT NULL,
    UNIQUE(flight_id, name)
  );

  CREATE INDEX IF NOT EXISTS idx_flights_date             ON flights(flight_date);
  CREATE INDEX IF NOT EXISTS idx_flights_flight_number    ON flights(flight_number);
  CREATE INDEX IF NOT EXISTS idx_flights_aircraft_reg     ON flights(aircraft_registration);
  CREATE INDEX IF NOT EXISTS idx_flights_date_num         ON flights(flight_date, flight_number);
  CREATE INDEX IF NOT EXISTS idx_fp_flight_id             ON flight_passengers(flight_id);
  CREATE INDEX IF NOT EXISTS idx_fp_name                  ON flight_passengers(name);
`;

function migrate(db: ReturnType<typeof Database>): void {
  const currentVersion = (db.pragma('user_version', { simple: true }) as number);

  if (currentVersion >= CURRENT_VERSION) return;

  // Version 0 → 1: rename old columns to new schema
  if (currentVersion === 0) {
    const hasOldSchema = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='flights' AND sql LIKE '%date%NOT NULL%'"
    ).get();

    if (hasOldSchema) {
      db.exec(`
        -- Migrate flights table
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

        -- Recreate flight_passengers with UNIQUE constraint
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
    } else {
      // Fresh database — create v1 schema directly
      db.exec(DDL_V1);
    }

    db.pragma(`user_version = ${CURRENT_VERSION}`);
  }
}

export function createDb(dbPath: string = path.join(__dirname, 'flightlogger.db')) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export type Db = ReturnType<typeof createDb>;
