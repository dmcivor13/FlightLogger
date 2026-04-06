import { Router } from 'express';
import { FlightLookupService } from '../services/flight-lookup/FlightLookupService.js';

const lookupService = new FlightLookupService();

export function createLookupRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    const { flightNumber, date } = req.query as Record<string, string>;

    if (!flightNumber || !date) {
      return res.status(400).json({ error: 'flightNumber and date are required' });
    }

    const result = await lookupService.lookup(flightNumber.trim(), date.trim());
    return res.json(result);
  });

  return router;
}
