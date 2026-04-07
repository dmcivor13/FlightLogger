import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MapPage } from '../pages/MapPage';
import * as client from '../api/client';
import type { FlightRecord } from '../types';

vi.mock('../api/client');
vi.mock('../components/map/RouteMap', () => ({
  RouteMap: ({ routes }: { routes: Array<{ origin: string; destination: string; count: number }> }) => (
    <div data-testid="route-map">
      {routes.map((r) => (
        <span key={`${r.origin}-${r.destination}`}>{r.origin} → {r.destination}</span>
      ))}
    </div>
  ),
}));

function makeFlightRecord(overrides: Partial<FlightRecord> = {}): FlightRecord {
  return {
    id: 1,
    flight_date: '2024-03-10',
    origin_iata: 'SFO',
    destination_iata: 'LAX',
    airline_name: 'United',
    passengers: ['Alice'],
    created_at: '2024-03-10T00:00:00Z',
    updated_at: '2024-03-10T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('MapPage route building', () => {
  it('renders routes using origin_iata and destination_iata — regression: must not show "undefined → undefined"', async () => {
    vi.mocked(client.getFlights).mockResolvedValue([
      makeFlightRecord({ id: 1, origin_iata: 'SFO', destination_iata: 'LAX' }),
      makeFlightRecord({ id: 2, origin_iata: 'SFO', destination_iata: 'LAX' }),
      makeFlightRecord({ id: 3, origin_iata: 'SFO', destination_iata: 'SEA' }),
    ]);

    render(<MapPage />);
    await waitFor(() => expect(screen.getByTestId('route-map')).toBeInTheDocument());

    // Should show valid IATA routes (appears in both the mock RouteMap and the route list)
    expect(screen.getAllByText('SFO → LAX').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SFO → SEA').length).toBeGreaterThan(0);

    // Must not show the pre-fix broken output
    expect(screen.queryByText('undefined → undefined')).not.toBeInTheDocument();
  });

  it('deduplicates routes and counts correctly', async () => {
    vi.mocked(client.getFlights).mockResolvedValue([
      makeFlightRecord({ id: 1, origin_iata: 'SFO', destination_iata: 'LAX' }),
      makeFlightRecord({ id: 2, origin_iata: 'SFO', destination_iata: 'LAX' }),
      makeFlightRecord({ id: 3, origin_iata: 'SFO', destination_iata: 'SEA' }),
    ]);

    render(<MapPage />);
    await waitFor(() => expect(screen.getByTestId('route-map')).toBeInTheDocument());

    // 2 unique routes
    expect(screen.getByText('2 unique routes')).toBeInTheDocument();

    // Route list shows counts
    expect(screen.getByText('2×')).toBeInTheDocument();
    expect(screen.getByText('1×')).toBeInTheDocument();
  });

  it('shows no-flights message when flight list is empty', async () => {
    vi.mocked(client.getFlights).mockResolvedValue([]);

    render(<MapPage />);
    await waitFor(() => expect(screen.getByText('No flights logged yet.')).toBeInTheDocument());
  });
});
