# FlightLogger

A personal flight tracker for logging and visualising my family's flight history. Import flights from Flightradar24, browse them on a world map with route arcs, and explore stats like most-visited airports and airlines.

## What it does

- **Import flights** from Flightradar24 CSV exports
- **Map view** — world map showing all routes as arcs between airports
- **Flight list** — searchable, browsable history of all logged flights
- **Flight detail** — individual flight info including route, airline, aircraft, and date
- **Stats** — summary of most-flown routes, airlines, airports, and totals
- **Manual entry** — add flights by hand if they're not in an export

## Tech stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, react-simple-maps, Recharts
- **Backend:** Express, TypeScript
- **Database:** SQLite (via better-sqlite3)
- **Tests:** Vitest (unit + integration), Playwright (E2E)

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server (Vite + Express run concurrently):
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - API: `http://localhost:3000`

3. Import some flights via the Import page using a Flightradar24 CSV export.

## Other commands

```bash
npm run build        # Production build
npm run preview      # Preview production build

npm test             # Run unit + integration tests
npm run test:watch   # Watch mode
npm run test:e2e     # Playwright E2E tests (requires dev server running)
```

## Project structure

```
src/            React frontend (pages, components, hooks, api)
server/         Express API (routes, services, db)
tests/
  integration/  API integration tests (supertest + SQLite)
  e2e/          Playwright end-to-end tests
  fixtures/     Sample CSV files for import tests
```
