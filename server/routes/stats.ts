import { Router } from 'express';
import type { Db } from '../db';

export function createStatsRouter(db: Db) {
  const router = Router();

  router.get('/', (_req, res) => {
    const totalFlights = (db.prepare('SELECT COUNT(*) as count FROM flights').get() as { count: number }).count;
    const uniqueRoutes = (db.prepare('SELECT COUNT(DISTINCT origin_iata || destination_iata) as count FROM flights').get() as { count: number }).count;
    const uniqueAirlines = (db.prepare('SELECT COUNT(DISTINCT airline_name) as count FROM flights').get() as { count: number }).count;
    const uniqueAircraft = (db.prepare("SELECT COUNT(DISTINCT aircraft_type) as count FROM flights WHERE aircraft_type IS NOT NULL AND aircraft_type != ''").get() as { count: number }).count;

    const byYear      = db.prepare("SELECT strftime('%Y', flight_date) as year, COUNT(*) as count FROM flights GROUP BY year ORDER BY year DESC").all();
    const byAirline   = db.prepare("SELECT airline_name as airline, COUNT(*) as count FROM flights GROUP BY airline_name ORDER BY count DESC").all();
    const byAircraft  = db.prepare("SELECT aircraft_type as aircraft, COUNT(*) as count FROM flights WHERE aircraft_type IS NOT NULL AND aircraft_type != '' GROUP BY aircraft_type ORDER BY count DESC").all();
    const byClass     = db.prepare("SELECT class, COUNT(*) as count FROM flight_passengers WHERE class IS NOT NULL GROUP BY class ORDER BY count DESC").all();
    const byReason    = db.prepare("SELECT reason, COUNT(*) as count FROM flight_passengers WHERE reason IS NOT NULL GROUP BY reason ORDER BY count DESC").all();
    const byPassenger = db.prepare('SELECT name as passenger, COUNT(*) as count FROM flight_passengers GROUP BY name ORDER BY count DESC').all();
    const topRoutes   = db.prepare('SELECT origin_iata as origin, destination_iata as destination, COUNT(*) as count FROM flights GROUP BY origin_iata, destination_iata ORDER BY count DESC LIMIT 20').all();

    res.json({
      totals: { flights: totalFlights, uniqueRoutes, uniqueAirlines, uniqueAircraft },
      byYear,
      byAirline,
      byAircraft,
      byClass,
      byReason,
      byPassenger,
      topRoutes,
    });
  });

  return router;
}
