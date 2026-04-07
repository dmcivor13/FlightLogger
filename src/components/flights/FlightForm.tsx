import { useState, FormEvent } from 'react';
import type { FlightPayload, PassengerDetail, ClassOfService, FlightReason, NormalizedFlightCandidate } from '../../types';
import { lookupFlight } from '../../api/client';

interface Props {
  initialValues?: Partial<Omit<FlightPayload, 'passengers'>> & { passengers?: PassengerDetail[] };
  onSubmit: (data: FlightPayload) => Promise<void>;
  onCancel: () => void;
}

const CLASS_OPTIONS: ClassOfService[] = ['Economy', 'Premium Economy', 'Business', 'First'];
const REASON_OPTIONS: FlightReason[] = ['Leisure', 'Business'];

export function FlightForm({ initialValues = {}, onSubmit, onCancel }: Props) {
  const [flightDate, setFlightDate]           = useState(initialValues.flight_date ?? '');
  const [airlineIata, setAirlineIata]         = useState(initialValues.airline_iata ?? '');
  const [airlineName, setAirlineName]         = useState(initialValues.airline_name ?? '');
  const [flightNumber, setFlightNumber]       = useState(initialValues.flight_number ?? '');
  const [originIata, setOriginIata]           = useState(initialValues.origin_iata ?? '');
  const [destinationIata, setDestinationIata] = useState(initialValues.destination_iata ?? '');
  const [schedDep, setSchedDep]               = useState(initialValues.scheduled_departure ?? '');
  const [actualDep, setActualDep]             = useState(initialValues.actual_departure ?? '');
  const [schedArr, setSchedArr]               = useState(initialValues.scheduled_arrival ?? '');
  const [actualArr, setActualArr]             = useState(initialValues.actual_arrival ?? '');
  const [aircraftType, setAircraftType]       = useState(initialValues.aircraft_type ?? '');
  const [aircraftReg, setAircraftReg]         = useState(initialValues.aircraft_registration ?? '');
  const [passengers, setPassengers]           = useState<PassengerDetail[]>(initialValues.passengers ?? []);
  const [passengerInput, setPassengerInput]   = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});

  // Lookup state
  const [lookupCode, setLookupCode]         = useState('');
  const [lookupDate, setLookupDate]         = useState(initialValues.flight_date ?? '');
  const [lookupStatus, setLookupStatus]     = useState<'idle' | 'loading' | 'found' | 'multiple' | 'notfound' | 'error'>('idle');
  const [lookupMessage, setLookupMessage]   = useState('');
  const [candidates, setCandidates]         = useState<NormalizedFlightCandidate[]>([]);

  function applyCandidate(c: NormalizedFlightCandidate, filled: string[]) {
    if (c.originIata)           { setOriginIata(c.originIata);             filled.push('Origin'); }
    if (c.destinationIata)      { setDestinationIata(c.destinationIata);   filled.push('Destination'); }
    if (c.airlineName)          { setAirlineName(c.airlineName);           filled.push('Airline'); }
    if (c.airlineIata)          { setAirlineIata(c.airlineIata); }
    if (c.aircraftType)         { setAircraftType(c.aircraftType);         filled.push('Aircraft'); }
    if (c.aircraftRegistration) { setAircraftReg(c.aircraftRegistration);  filled.push('Registration'); }
    if (c.scheduledDeparture)   { setSchedDep(c.scheduledDeparture);       filled.push('Dep Time'); }
    if (c.scheduledArrival)     { setSchedArr(c.scheduledArrival);         filled.push('Arr Time'); }
    if (c.actualDeparture)      { setActualDep(c.actualDeparture); }
    if (c.actualArrival)        { setActualArr(c.actualArrival); }
    if (!flightDate && lookupDate) setFlightDate(lookupDate);
    if (!flightNumber && lookupCode) setFlightNumber(lookupCode.toUpperCase());
  }

  async function handleLookup() {
    if (!lookupCode || !lookupDate) return;
    setLookupStatus('loading');
    setLookupMessage('');
    setCandidates([]);
    try {
      const result = await lookupFlight(lookupCode.trim(), lookupDate.trim());
      if (result.status === 'no_match' || result.matchedFlights.length === 0) {
        setLookupStatus('notfound');
        setLookupMessage('No flight found for that number and date.');
        return;
      }
      if (result.status === 'multiple_matches') {
        setLookupStatus('multiple');
        setCandidates(result.matchedFlights);
        setLookupMessage(`${result.matchedFlights.length} matches found — select one below.`);
        return;
      }
      const filled: string[] = [];
      applyCandidate(result.matchedFlights[0], filled);
      setLookupStatus('found');
      setLookupMessage(`Filled: ${filled.join(', ')}`);
    } catch (err) {
      setLookupStatus('error');
      setLookupMessage(err instanceof Error ? err.message : 'Lookup failed');
    }
  }

  function selectCandidate(c: NormalizedFlightCandidate) {
    const filled: string[] = [];
    applyCandidate(c, filled);
    setLookupStatus('found');
    setLookupMessage(`Filled: ${filled.join(', ')}`);
    setCandidates([]);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!flightDate)       errs.flight_date       = 'Date is required';
    if (!originIata)       errs.origin_iata       = 'Origin is required';
    if (!destinationIata)  errs.destination_iata  = 'Destination is required';
    if (!airlineName)      errs.airline_name      = 'Airline is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function addPassenger() {
    const name = passengerInput.trim();
    if (name && !passengers.some((p) => p.name === name)) {
      setPassengers([...passengers, { name }]);
    }
    setPassengerInput('');
  }

  function removePassenger(name: string) {
    setPassengers(passengers.filter((p) => p.name !== name));
  }

  function updatePassenger(name: string, field: keyof Omit<PassengerDetail, 'name'>, value: string) {
    setPassengers(passengers.map((p) =>
      p.name === name ? { ...p, [field]: value || undefined } : p
    ));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        flight_date: flightDate,
        airline_iata: airlineIata || undefined,
        airline_name: airlineName,
        flight_number: flightNumber || undefined,
        origin_iata: originIata,
        destination_iata: destinationIata,
        scheduled_departure: schedDep || undefined,
        actual_departure: actualDep || undefined,
        scheduled_arrival: schedArr || undefined,
        actual_arrival: actualArr || undefined,
        aircraft_type: aircraftType || undefined,
        aircraft_registration: aircraftReg || undefined,
        passengers,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Auto-fill lookup */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
        <p className="text-sm font-medium text-blue-800">Auto-fill flight details</p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Flight Number</label>
            <input
              type="text"
              placeholder="e.g. BA268"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
              className="input"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={lookupDate}
              onChange={(e) => setLookupDate(e.target.value)}
              className="input"
            />
          </div>
          <button
            type="button"
            onClick={handleLookup}
            disabled={!lookupCode || !lookupDate || lookupStatus === 'loading'}
            className="btn-secondary whitespace-nowrap"
          >
            {lookupStatus === 'loading' ? 'Looking up…' : 'Lookup'}
          </button>
        </div>
        {lookupStatus === 'found' && (
          <p className="text-xs text-green-700">{lookupMessage}</p>
        )}
        {lookupStatus === 'notfound' && (
          <p className="text-xs text-amber-700">{lookupMessage}</p>
        )}
        {lookupStatus === 'error' && (
          <p className="text-xs text-red-700">{lookupMessage}</p>
        )}
        {lookupStatus === 'multiple' && candidates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-blue-700">{lookupMessage}</p>
            <div className="flex flex-col gap-1">
              {candidates.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectCandidate(c)}
                  className="text-left text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
                >
                  <span className="font-medium">{c.originIata} → {c.destinationIata}</span>
                  {c.airlineName && <span className="text-slate-500"> · {c.airlineName}</span>}
                  {c.scheduledDeparture && <span className="text-slate-500"> · {c.scheduledDeparture}</span>}
                  {c.aircraftType && <span className="text-slate-500"> · {c.aircraftType}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date *" error={errors.flight_date}>
          <input
            type="date"
            value={flightDate}
            onChange={(e) => setFlightDate(e.target.value)}
            className="input"
            required
          />
        </Field>
        <Field label="Flight Number">
          <input
            type="text"
            placeholder="e.g. BA268"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Origin (IATA) *" error={errors.origin_iata}>
          <input
            type="text"
            placeholder="e.g. LHR"
            value={originIata}
            onChange={(e) => setOriginIata(e.target.value.toUpperCase())}
            maxLength={4}
            className="input"
          />
        </Field>
        <Field label="Destination (IATA) *" error={errors.destination_iata}>
          <input
            type="text"
            placeholder="e.g. JFK"
            value={destinationIata}
            onChange={(e) => setDestinationIata(e.target.value.toUpperCase())}
            maxLength={4}
            className="input"
          />
        </Field>
        <Field label="Airline *" error={errors.airline_name}>
          <input
            type="text"
            placeholder="e.g. British Airways"
            value={airlineName}
            onChange={(e) => setAirlineName(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Airline IATA">
          <input
            type="text"
            placeholder="e.g. BA"
            value={airlineIata}
            onChange={(e) => setAirlineIata(e.target.value.toUpperCase())}
            maxLength={3}
            className="input"
          />
        </Field>
        <Field label="Scheduled Departure">
          <input type="time" value={schedDep} onChange={(e) => setSchedDep(e.target.value)} className="input" />
        </Field>
        <Field label="Scheduled Arrival">
          <input type="time" value={schedArr} onChange={(e) => setSchedArr(e.target.value)} className="input" />
        </Field>
        <Field label="Actual Departure">
          <input type="time" value={actualDep} onChange={(e) => setActualDep(e.target.value)} className="input" />
        </Field>
        <Field label="Actual Arrival">
          <input type="time" value={actualArr} onChange={(e) => setActualArr(e.target.value)} className="input" />
        </Field>
        <Field label="Aircraft Type">
          <input
            type="text"
            placeholder="e.g. Boeing 737-800"
            value={aircraftType}
            onChange={(e) => setAircraftType(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Registration">
          <input
            type="text"
            placeholder="e.g. G-XLEB"
            value={aircraftReg}
            onChange={(e) => setAircraftReg(e.target.value.toUpperCase())}
            className="input"
          />
        </Field>
      </div>

      {/* Passengers */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Passengers</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Add passenger name"
            value={passengerInput}
            onChange={(e) => setPassengerInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPassenger(); } }}
            className="input flex-1"
            aria-label="Add passenger"
          />
          <button
            type="button"
            onClick={addPassenger}
            aria-label="Add passenger"
            className="btn-secondary px-3"
          >
            Add
          </button>
        </div>
        {passengers.length > 0 && (
          <div className="space-y-2">
            {passengers.map((p) => (
              <div key={p.name} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-800">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => removePassenger(p.name)}
                    aria-label={`Remove ${p.name}`}
                    className="text-slate-400 hover:text-slate-700 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Seat</label>
                    <input
                      type="text"
                      placeholder="e.g. 14A"
                      value={p.seat ?? ''}
                      onChange={(e) => updatePassenger(p.name, 'seat', e.target.value)}
                      className="input text-sm"
                      aria-label={`Seat for ${p.name}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Class</label>
                    <select
                      value={p.class ?? ''}
                      onChange={(e) => updatePassenger(p.name, 'class', e.target.value)}
                      className="input text-sm"
                      aria-label={`Class for ${p.name}`}
                    >
                      <option value="">—</option>
                      {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Reason</label>
                    <select
                      value={p.reason ?? ''}
                      onChange={(e) => updatePassenger(p.name, 'reason', e.target.value)}
                      className="input text-sm"
                      aria-label={`Reason for ${p.name}`}
                    >
                      <option value="">—</option>
                      {REASON_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <label className="block text-xs text-slate-500 mb-1">Notes</label>
                    <input
                      type="text"
                      placeholder="Any notes…"
                      value={p.notes ?? ''}
                      onChange={(e) => updatePassenger(p.name, 'notes', e.target.value)}
                      className="input text-sm w-full"
                      aria-label={`Notes for ${p.name}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {children}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
