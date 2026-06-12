import { Router } from 'express';
import type { Db } from '../db';

export function createStatsRouter(db: Db) {
  const router = Router();

  router.get('/', (req, res) => {
    const passengerRaw = req.query.passenger;
    const passenger =
      typeof passengerRaw === 'string' && passengerRaw.trim() !== ''
        ? passengerRaw.trim()
        : null;

    // When filtering by passenger, restrict flights to those the passenger was on.
    // For flight_passengers-based queries, restrict to that passenger's rows directly.
    const flightWhere = passenger
      ? 'WHERE id IN (SELECT flight_id FROM flight_passengers WHERE name = ?)'
      : '';
    const fpWhere = passenger ? 'AND name = ?' : '';
    const flightArgs = passenger ? [passenger] : [];
    const fpArgs = passenger ? [passenger] : [];

    const get = <T>(sql: string, args: unknown[] = []) =>
      db.prepare(sql).get(...args) as T;
    const all = <T>(sql: string, args: unknown[] = []) =>
      db.prepare(sql).all(...args) as T[];

    const totalFlights = get<{ count: number }>(
      `SELECT COUNT(*) as count FROM flights ${flightWhere}`,
      flightArgs,
    ).count;
    const uniqueRoutes = get<{ count: number }>(
      `SELECT COUNT(DISTINCT origin_iata || destination_iata) as count FROM flights ${flightWhere}`,
      flightArgs,
    ).count;
    const uniqueAirlines = get<{ count: number }>(
      `SELECT COUNT(DISTINCT airline_name) as count FROM flights ${flightWhere}`,
      flightArgs,
    ).count;
    const uniqueAircraft = get<{ count: number }>(
      `SELECT COUNT(DISTINCT aircraft_type) as count FROM flights
       WHERE aircraft_type IS NOT NULL AND aircraft_type != ''
         ${passenger ? 'AND id IN (SELECT flight_id FROM flight_passengers WHERE name = ?)' : ''}`,
      flightArgs,
    ).count;

    const byYear = all(
      `SELECT strftime('%Y', flight_date) as year, COUNT(*) as count
       FROM flights ${flightWhere}
       GROUP BY year ORDER BY year DESC`,
      flightArgs,
    );
    const byAirline = all(
      `SELECT airline_name as airline, COUNT(*) as count
       FROM flights ${flightWhere}
       GROUP BY airline_name ORDER BY count DESC`,
      flightArgs,
    );
    const byAircraft = all(
      `SELECT aircraft_type as aircraft, COUNT(*) as count FROM flights
       WHERE aircraft_type IS NOT NULL AND aircraft_type != ''
         ${passenger ? 'AND id IN (SELECT flight_id FROM flight_passengers WHERE name = ?)' : ''}
       GROUP BY aircraft_type ORDER BY count DESC`,
      flightArgs,
    );
    const byClass = all(
      `SELECT class, COUNT(*) as count FROM flight_passengers
       WHERE class IS NOT NULL ${fpWhere}
       GROUP BY class ORDER BY count DESC`,
      fpArgs,
    );
    const byReason = all(
      `SELECT reason, COUNT(*) as count FROM flight_passengers
       WHERE reason IS NOT NULL ${fpWhere}
       GROUP BY reason ORDER BY count DESC`,
      fpArgs,
    );
    // byPassenger is intentionally NOT filtered — when viewing Alice's stats
    // we still want to see who she flew with (and herself).
    const byPassenger = all(
      passenger
        ? `SELECT name as passenger, COUNT(*) as count FROM flight_passengers
           WHERE flight_id IN (SELECT flight_id FROM flight_passengers WHERE name = ?)
           GROUP BY name ORDER BY count DESC`
        : `SELECT name as passenger, COUNT(*) as count FROM flight_passengers
           GROUP BY name ORDER BY count DESC`,
      passenger ? [passenger] : [],
    );
    const topRoutes = all(
      `SELECT origin_iata as origin, destination_iata as destination, COUNT(*) as count
       FROM flights ${flightWhere}
       GROUP BY origin_iata, destination_iata ORDER BY count DESC LIMIT 20`,
      flightArgs,
    );

    // ─── Highlights ─────────────────────────────────────────────────────────
    const repeatAircraft = all<{ registration: string; count: number }>(
      `SELECT aircraft_registration as registration, COUNT(*) as count FROM flights
       WHERE aircraft_registration IS NOT NULL AND aircraft_registration != ''
         ${passenger ? 'AND id IN (SELECT flight_id FROM flight_passengers WHERE name = ?)' : ''}
       GROUP BY aircraft_registration
       HAVING count >= 2
       ORDER BY count DESC, registration ASC`,
      flightArgs,
    );
    const mostFlownRoute = get<
      { origin: string; destination: string; count: number } | undefined
    >(
      `SELECT origin_iata as origin, destination_iata as destination, COUNT(*) as count
       FROM flights ${flightWhere}
       GROUP BY origin_iata, destination_iata
       ORDER BY count DESC LIMIT 1`,
      flightArgs,
    ) ?? null;
    const mostFlownAirline = get<
      { airline: string; count: number } | undefined
    >(
      `SELECT airline_name as airline, COUNT(*) as count
       FROM flights ${flightWhere}
       GROUP BY airline_name ORDER BY count DESC LIMIT 1`,
      flightArgs,
    ) ?? null;
    const totalAirMinutes = get<{ total: number | null }>(
      `SELECT COALESCE(SUM(duration_minutes), 0) as total
       FROM flights ${flightWhere}`,
      flightArgs,
    ).total ?? 0;
    const longestFlight = get<
      | {
          origin: string;
          destination: string;
          durationMinutes: number;
          date: string;
          flightNumber: string | null;
        }
      | undefined
    >(
      `SELECT origin_iata as origin, destination_iata as destination,
              duration_minutes as durationMinutes,
              flight_date as date, flight_number as flightNumber
       FROM flights
       WHERE duration_minutes IS NOT NULL
         ${passenger ? 'AND id IN (SELECT flight_id FROM flight_passengers WHERE name = ?)' : ''}
       ORDER BY duration_minutes DESC LIMIT 1`,
      flightArgs,
    ) ?? null;

    res.json({
      totals: { flights: totalFlights, uniqueRoutes, uniqueAirlines, uniqueAircraft },
      byYear,
      byAirline,
      byAircraft,
      byClass,
      byReason,
      byPassenger,
      topRoutes,
      highlights: {
        repeatAircraft,
        mostFlownRoute,
        mostFlownAirline,
        totalAirMinutes,
        longestFlight,
      },
    });
  });

  return router;
}
