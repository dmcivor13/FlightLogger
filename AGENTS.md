# FlightLogger — Developer Guide

## Project Overview

FlightLogger is a personal family flight tracker. It allows importing flight history from FR24 and TripIt CSV exports, viewing flights on a world map with route arcs, and browsing stats/history. No authentication is required — this is a single-user personal tool.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Routing | React Router v6 |
| Maps | react-simple-maps, d3-geo |
| Charts | Recharts |
| Backend | Express, TypeScript, tsx |
| Database | SQLite via better-sqlite3 |
| Unit/Integration Tests | Vitest, React Testing Library, supertest |
| E2E Tests | Playwright |

## Development Commands

```bash
npm run dev          # Start Vite + Express concurrently (use this for development)
npm run dev:client   # Vite only
npm run dev:server   # Express API only
npm run build        # TypeScript compile + Vite bundle
npm run preview      # Preview production build

npm test             # Run unit + integration tests (vitest, one-shot)
npm run test:watch   # Run tests in watch mode
npm run test:verbose # Run tests with verbose reporter
npm run test:e2e     # Run Playwright E2E tests (requires dev server running)
```

## Development Philosophy

### Test-First (TDD)
Write tests before or alongside implementation. If adding a new API endpoint or feature, the test comes first. This keeps the design honest and catches regressions early.

### Confidence Over Coverage
Do not chase coverage percentages. Every test should give genuine confidence that a feature works. One integration test that exercises a real code path is worth more than ten unit tests mocking everything.

### Test Pyramid (inverted for this project)
Prefer in this order:
1. **Integration tests** — test server API routes with real SQLite using supertest. These are the primary safety net.
2. **E2E / functional tests** — Playwright tests that drive the UI and verify features work end-to-end.
3. **Unit tests** — only for genuinely isolated logic: pure functions, data mappers, format utilities. Do not unit-test things that are better covered by integration tests.

### No Database Mocking in Integration Tests
Integration tests hit a real (in-process, test-scoped) SQLite database. Never mock the database layer — the value of integration tests comes from exercising real queries and schema.

## Testing Structure

```
tests/
  integration/       # Vitest, node env, supertest against Express app
  e2e/               # Playwright tests against http://localhost:5173
  fixtures/          # Sample CSV files for import tests

src/
  **/__tests__/      # Unit tests (Vitest, jsdom, React Testing Library)
```

Run `npm test` before every commit to ensure integration tests pass.

## Git Workflow

- **Commit directly to master.** No long-lived feature branches. Small, frequent commits are preferred.
- Each commit should represent one logical, working change. Do not bundle unrelated changes.
- Write commit messages that explain *why*, not just *what*.
- Never force-push to master.
- Run `npm test` before committing.
