import 'dotenv/config';
import { createDb } from './db';
import { createApp } from './app';

const PORT = 3001;
const db = createDb();
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`[API] FlightLogger backend running on http://localhost:${PORT}`);
});
