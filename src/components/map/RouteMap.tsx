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

// Inner component so we can use the useMapContext hook inside ComposableMap's context.
function RoutePaths({ routes, maxCount }: { routes: Route[]; maxCount: number }) {
  const { projection } = useMapContext();

  return (
    <>
      {routes.map((route, i) => {
        const from = getCoords(route.origin);
        const to = getCoords(route.destination);
        if (!from || !to) return null;

        const d = buildArcPath(from, to, projection as (c: [number, number]) => [number, number] | null);
        if (!d) return null;

        const opacity = 0.3 + (route.count / maxCount) * 0.7;
        const strokeWidth = 0.5 + (route.count / maxCount) * 2;

        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </>
  );
}

export function RouteMap({ routes }: { routes: Route[] }) {
  const maxCount = Math.max(...routes.map((r) => r.count), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
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

        <RoutePaths routes={routes} maxCount={maxCount} />

        {/* Airport dots */}
        {Array.from(new Set(routes.flatMap((r) => [r.origin, r.destination]))).map((iata) => {
          const coords = getCoords(iata);
          if (!coords) return null;
          return (
            <Marker key={iata} coordinates={coords}>
              <circle r={2} fill="#1d4ed8" fillOpacity={0.8} />
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
}
