import { describe, it, expect } from 'vitest';
import { buildArcPath, midpointWithCurve, getCoords } from '../components/map/RouteMap';

// A trivial identity projection: SVG coords equal geographic coords.
// This is what the pre-fix code was implicitly doing — using geo coords as pixels.
const identityProject = (coord: [number, number]): [number, number] => coord;

// A realistic mock projection: translate and scale like a real map projection.
// Roughly mimics geoNaturalEarth1 at scale 160 centred on [0, 0]:
//   SVG x ≈ (lon / 180) * 400 + 400    (lon -180..180 → 0..800)
//   SVG y ≈ -(lat / 90) * 245 + 245    (lat 90..-90 → 0..490)
const mockProject = ([lon, lat]: [number, number]): [number, number] => [
  (lon / 180) * 400 + 400,
  -(lat / 90) * 245 + 245,
];

const SFO: [number, number] = [-122.379, 37.621]; // [lon, lat]
const LAX: [number, number] = [-118.408, 33.943];

describe('buildArcPath', () => {
  it('returns a non-null path for valid airports with a real-like projection', () => {
    const d = buildArcPath(SFO, LAX, mockProject);
    expect(d).not.toBeNull();
    expect(d).toMatch(/^M /);
    expect(d).toContain(' Q ');
  });

  it('uses projected coordinates — not raw geographic coordinates — in the path string', () => {
    const d = buildArcPath(SFO, LAX, mockProject);
    expect(d).not.toBeNull();

    const projectedSFO = mockProject(SFO);
    // The path must contain the projected x,y — not the raw lon/lat
    expect(d).toContain(projectedSFO[0].toString().substring(0, 5)); // projected x present
    expect(d).not.toContain(`${SFO[0]}`); // raw lon NOT present
    expect(d).not.toContain(`${SFO[1]}`); // raw lat NOT present
  });

  it('regression: raw geo coords used as SVG coords produce a degenerate top-left path', () => {
    // Pre-fix behaviour: identity projection → geo coords become SVG pixel coords.
    // SFO [-122, 37] → SVG (−122, 37) which clips to top-left corner.
    // A real projection maps SFO to something around (129, 142) in an 800×490 viewport.
    const buggyPath = buildArcPath(SFO, LAX, identityProject);
    const fixedPath  = buildArcPath(SFO, LAX, mockProject);

    expect(buggyPath).not.toBeNull();
    expect(fixedPath).not.toBeNull();

    // Extract first M-point x from each path ("M <x> <y> Q ...")
    const xOf = (d: string) => parseFloat(d!.split(' ')[1]);
    const buggyX = xOf(buggyPath!);
    const fixedX = xOf(fixedPath!);

    // Buggy: x ≈ -122 (SFO raw lon) — clearly wrong for an 800px-wide SVG
    expect(buggyX).toBeCloseTo(SFO[0], 1);        // matches raw lon
    expect(buggyX).toBeLessThan(0);                // negative → off-screen left

    // Fixed: x should be well within the SVG viewport
    expect(fixedX).toBeGreaterThan(0);
    expect(fixedX).toBeLessThan(800);
  });

  it('returns null when airport coordinates are unknown', () => {
    const unknown: [number, number] = [999, 999];
    // projection that returns null for the sentinel value
    const project = (c: [number, number]) =>
      c[0] === 999 ? null : mockProject(c);
    const d = buildArcPath(unknown, LAX, project as (c: [number, number]) => [number, number] | null);
    expect(d).toBeNull();
  });
});

describe('midpointWithCurve', () => {
  it('returns a point between the two inputs', () => {
    const [midLon, midLat] = midpointWithCurve(SFO, LAX);
    expect(midLon).toBeCloseTo((SFO[0] + LAX[0]) / 2, 1);
    // midLat should be above the arithmetic midpoint (pushed north for curvature)
    expect(midLat).toBeGreaterThan((SFO[1] + LAX[1]) / 2);
  });
});

describe('getCoords', () => {
  it('returns [lon, lat] for a known airport', () => {
    const coords = getCoords('SFO');
    expect(coords).not.toBeNull();
    expect(coords![0]).toBeCloseTo(-122.379, 1); // lon
    expect(coords![1]).toBeCloseTo(37.621, 1);   // lat
  });

  it('returns null for an unknown IATA code', () => {
    expect(getCoords('ZZZ')).toBeNull();
  });
});
