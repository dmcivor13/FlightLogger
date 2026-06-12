import { useState, useRef } from 'react';
import { useMapContext, ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import airports from '../../data/airports.json';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface Route {
  origin: string;
  destination: string;
  count: number;
}

interface AirportData {
  lat: number;
  lon: number;
  name: string;
  city?: string;
  country?: string;
}

const airportData = airports as Record<string, AirportData>;

export function getCoords(iata: string): [number, number] | null {
  const a = airportData[iata];
  return a ? [a.lon, a.lat] : null;
}

// Compute a geographic midpoint pushed slightly north to create a gentle arc.
// Both input and output are [lon, lat] geographic coordinates.
export function midpointWithCurve(
  [lon1, lat1]: [number, number],
  [lon2, lat2]: [number, number],
): [number, number] {
  const midLon = (lon1 + lon2) / 2;
  const midLat = (lat1 + lat2) / 2;
  const curvature = Math.abs(lat1 - lat2) * 0.3 + Math.abs(lon1 - lon2) * 0.1;
  return [midLon, midLat + curvature];
}

/**
 * Build a quadratic-bezier SVG path string for a flight arc.
 *
 * `project` must be the map's projection function (geo [lon,lat] → SVG [x,y]).
 * Returns null if either endpoint cannot be projected (e.g. the airport is
 * outside the current viewport or has no coordinate data).
 */
export function buildArcPath(
  from: [number, number],
  to: [number, number],
  project: (coord: [number, number]) => [number, number] | null,
): string | null {
  const fromPx = project(from);
  const toPx = project(to);
  if (!fromPx || !toPx) return null;

  const midGeo = midpointWithCurve(from, to);
  const midPx = project(midGeo);
  if (!midPx) return null;

  return `M ${fromPx[0]} ${fromPx[1]} Q ${midPx[0]} ${midPx[1]} ${toPx[0]} ${toPx[1]}`;
}

interface RoutePathsProps {
  routes: Route[];
  maxCount: number;
  selectedAirport?: string | null;
  onHover: (route: Route | null, x: number, y: number) => void;
}

function RoutePaths({ routes, maxCount, selectedAirport, onHover }: RoutePathsProps) {
  const { projection } = useMapContext();

  return (
    <>
      {routes.map((route, i) => {
        const from = getCoords(route.origin);
        const to = getCoords(route.destination);
        if (!from || !to) return null;

        const d = buildArcPath(from, to, projection as (c: [number, number]) => [number, number] | null);
        if (!d) return null;

        const isConnected =
          !selectedAirport ||
          route.origin === selectedAirport ||
          route.destination === selectedAirport;

        const baseOpacity = 0.3 + (route.count / maxCount) * 0.7;
        const opacity = selectedAirport ? (isConnected ? Math.max(baseOpacity, 0.7) : 0.07) : baseOpacity;
        const strokeWidth = selectedAirport
          ? isConnected
            ? 0.5 + (route.count / maxCount) * 4
            : 0.5
          : 0.5 + (route.count / maxCount) * 4;

        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => onHover(route, e.clientX, e.clientY)}
            onMouseMove={(e) => onHover(route, e.clientX, e.clientY)}
            onMouseLeave={() => onHover(null, 0, 0)}
          />
        );
      })}
    </>
  );
}

interface RouteMapProps {
  routes: Route[];
  selectedAirport?: string | null;
  onAirportClick?: (iata: string) => void;
}

export function RouteMap({ routes, selectedAirport, onAirportClick }: RouteMapProps) {
  const maxCount = Math.max(...routes.map((r) => r.count), 1);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<{
    route: Route;
    x: number;
    y: number;
  } | null>(null);

  const handleHover = (route: Route | null, clientX: number, clientY: number) => {
    if (!route || !containerRef.current) {
      setTooltip(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({ route, x: clientX - rect.left, y: clientY - rect.top });
  };

  const uniqueAirports = Array.from(
    new Set(routes.flatMap((r) => [r.origin, r.destination])),
  );

  return (
    <div ref={containerRef} className="bg-white border border-slate-200 rounded-xl overflow-hidden relative">
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 160 }}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#e2e8f0"
                stroke="#cbd5e1"
                strokeWidth={0.5}
                style={{ outline: 'none' }}
              />
            ))
          }
        </Geographies>

        <RoutePaths
          routes={routes}
          maxCount={maxCount}
          selectedAirport={selectedAirport}
          onHover={handleHover}
        />

        {uniqueAirports.map((iata) => {
          const coords = getCoords(iata);
          if (!coords) return null;
          const isSelected = iata === selectedAirport;
          const isDimmed = selectedAirport && !isSelected;
          return (
            <Marker
              key={iata}
              coordinates={coords}
              onClick={() => onAirportClick?.(iata)}
            >
              {isSelected && (
                <circle r={8} fill="none" stroke="#2563eb" strokeWidth={1.5} strokeOpacity={0.5} />
              )}
              <circle
                r={isSelected ? 4 : 2}
                fill={isSelected ? '#1d4ed8' : '#1d4ed8'}
                fillOpacity={isDimmed ? 0.2 : 0.8}
                style={{ cursor: onAirportClick ? 'pointer' : 'default' }}
              />
            </Marker>
          );
        })}
      </ComposableMap>

      {tooltip && (
        <div
          className="absolute bg-slate-900 text-white text-xs rounded px-2 py-1 pointer-events-none shadow-lg whitespace-nowrap z-10"
          style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
        >
          {tooltip.route.origin} → {tooltip.route.destination} &middot; {tooltip.route.count}×
        </div>
      )}
    </div>
  );
}
