import type { NormalizedFlightCandidate } from '../types.js';

// Maps a single FR24 flight entry to our normalized shape.
// FR24 API shape is unofficial and subject to change — this mapper is
// intentionally lenient; missing fields simply produce undefined.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapFr24Flight(raw: any, requestedDate: string): NormalizedFlightCandidate {
  const candidate: NormalizedFlightCandidate = {};

  // Airline
  candidate.airlineName = raw?.airline?.name ?? undefined;
  candidate.airlineIata = raw?.airline?.code?.iata ?? undefined;

  // Flight number
  const iata = raw?.identification?.number?.default ?? undefined;
  candidate.flightNumber = iata ?? undefined;

  candidate.flightDate = requestedDate;

  // Airports
  candidate.originIata      = raw?.airport?.origin?.code?.iata ?? undefined;
  candidate.destinationIata = raw?.airport?.destination?.code?.iata ?? undefined;

  // Times — FR24 returns Unix timestamps; convert to HH:MM local (we use scheduled)
  const schedDep = raw?.time?.scheduled?.departure;
  const schedArr = raw?.time?.scheduled?.arrival;
  const realDep  = raw?.time?.real?.departure;
  const realArr  = raw?.time?.real?.arrival;

  if (schedDep) candidate.scheduledDeparture = unixToHHMM(schedDep);
  if (schedArr) candidate.scheduledArrival   = unixToHHMM(schedArr);
  if (realDep)  candidate.actualDeparture    = unixToHHMM(realDep);
  if (realArr)  candidate.actualArrival      = unixToHHMM(realArr);

  // Aircraft
  candidate.aircraftType         = raw?.aircraft?.model?.text ?? undefined;
  candidate.aircraftRegistration = raw?.aircraft?.registration ?? undefined;

  return candidate;
}

function unixToHHMM(ts: number): string {
  const d = new Date(ts * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
