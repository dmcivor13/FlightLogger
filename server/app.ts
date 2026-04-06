import express from 'express';
import cors from 'cors';
import { Db } from './db';
import { createFlightsRouter } from './routes/flights';
import { createStatsRouter } from './routes/stats';
import { createImportRouter } from './routes/import';
import { createLookupRouter } from './routes/lookup';

export function createApp(db: Db) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/flights', createFlightsRouter(db));
  app.use('/api/stats', createStatsRouter(db));
  app.use('/api/import', createImportRouter(db));
  app.use('/api/lookup', createLookupRouter());

  return app;
}
