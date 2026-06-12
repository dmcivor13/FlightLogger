import fs from 'fs';
import path from 'path';
import type { Db } from './db';

const DAY_MS = 24 * 60 * 60 * 1000;
const RETAIN = 7;

function stamp(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

async function runBackup(db: Db, dir: string): Promise<void> {
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `flightlogger-${stamp()}.db`);
  await db.backup(dest);
  console.log(`[backup] wrote ${dest}`);

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('flightlogger-') && f.endsWith('.db'))
    .sort();
  for (const f of files.slice(0, -RETAIN)) {
    fs.unlinkSync(path.join(dir, f));
    console.log(`[backup] pruned ${f}`);
  }
}

export function startBackupSchedule(db: Db, dir: string): void {
  runBackup(db, dir).catch((e) => console.error('[backup] initial failed', e));
  setInterval(() => {
    runBackup(db, dir).catch((e) => console.error('[backup] failed', e));
  }, DAY_MS).unref();
}
