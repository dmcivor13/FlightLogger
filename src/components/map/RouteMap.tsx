import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
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

function getCoords(iata: string): [number, number] | null {
  const a = airportData[iata];
  return a ? [a.lon, a.lat] : null;
}

// Simple great-circle midpoint for arc control point
function midpointWithCurve(
  [lon1, lat1]: [number, number],
  [lon2, lat2]: [number, number],
): [number, number] {
  const midLon = (lon1 + lon2) / 2;
  const midLat = (lat1 + lat2) / 2;
  // Push the midpoint toward the equator to create a gentle upward curve
  const curvature = Math.abs(lat1 - lat2) * 0.3 + Math.abs(lon1 - lon2) * 0.1;
  return [midLon, midLat + curvature];
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
          {({ geographies }) =>
            geographies.map((geo) => (
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

        {routes.map((route, i) => {
          const from = getCoords(route.origin);
          const to = getCoords(route.destination);
          if (!from || !to) return null;
          const mid = midpointWithCurve(from, to);
          const opacity = 0.3 + (route.count / maxCount) * 0.7;
          const strokeWidth = 0.5 + (route.count / maxCount) * 2;
          const d = `M ${from[0]} ${from[1]} Q ${mid[0]} ${mid[1]} ${to[0]} ${to[1]}`;

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

        {/* Render airport dots for routes */}
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
