import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { RequestHandler } from 'express';
import { createDb } from './db';
import { createApp } from './app';
import { startBackupSchedule } from './backup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
const CLIENT_DIST = process.env.CLIENT_DIST ?? path.resolve(__dirname, '../dist');
const SERVE_CLIENT =
  process.env.SERVE_CLIENT !== 'false' &&
  fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

const beforeRoutes: RequestHandler[] = [];

if (process.env.AUTH_USER && process.env.AUTH_PASS) {
  const expectedUser = process.env.AUTH_USER;
  const expectedPass = process.env.AUTH_PASS;
  beforeRoutes.push((req, res, next) => {
    const hdr = req.headers.authorization ?? '';
    const [scheme, b64] = hdr.split(' ');
    if (scheme === 'Basic' && b64) {
      const [u, p] = Buffer.from(b64, 'base64').toString().split(':');
      if (u === expectedUser && p === expectedPass) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="FlightLogger"').status(401).end();
  });
}

const db = createDb();
const app = createApp(db, { beforeRoutes });

if (SERVE_CLIENT) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

if (process.env.BACKUP_DIR) {
  startBackupSchedule(db, process.env.BACKUP_DIR);
}

app.listen(PORT, HOST, () => {
  console.log(`[API] FlightLogger backend running on http://${HOST}:${PORT}`);
});
