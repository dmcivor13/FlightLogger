import type { FlightsFilter } from '../../types';

const CLASS_OPTIONS = ['Economy', 'Premium Economy', 'Business', 'First'];
const REASON_OPTIONS = ['Leisure', 'Business'];

interface Props {
  filters: FlightsFilter;
  onChange: (filters: FlightsFilter) => void;
}

export function FilterBar({ filters, onChange }: Props) {
  function set(key: keyof FlightsFilter, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }

  function clear() {
    onChange({});
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Search…"
          value={filters.q ?? ''}
          onChange={(e) => set('q', e.target.value)}
          className="input col-span-2 sm:col-span-4"
          aria-label="Search flights"
        />
        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => set('dateFrom', e.target.value)}
          className="input"
          aria-label="From date"
        />
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => set('dateTo', e.target.value)}
          className="input"
          aria-label="To date"
        />
        <input
          type="text"
          placeholder="Origin"
          value={filters.origin ?? ''}
          onChange={(e) => set('origin', e.target.value.toUpperCase())}
          className="input"
          aria-label="Origin"
          maxLength={4}
        />
        <input
          type="text"
          placeholder="Destination"
          value={filters.destination ?? ''}
          onChange={(e) => set('destination', e.target.value.toUpperCase())}
          className="input"
          aria-label="Destination"
          maxLength={4}
        />
        <input
          type="text"
          placeholder="Airline"
          value={filters.airline ?? ''}
          onChange={(e) => set('airline', e.target.value)}
          className="input"
          aria-label="Airline"
        />
        <input
          type="text"
          placeholder="Aircraft"
          value={filters.aircraft ?? ''}
          onChange={(e) => set('aircraft', e.target.value)}
          className="input"
          aria-label="Aircraft"
        />
        <input
          type="text"
          placeholder="Passenger"
          value={filters.passenger ?? ''}
          onChange={(e) => set('passenger', e.target.value)}
          className="input"
          aria-label="Passenger"
        />
        <select
          value={filters.class ?? ''}
          onChange={(e) => set('class', e.target.value)}
          className="input"
          aria-label="Class"
        >
          <option value="">All classes</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filters.reason ?? ''}
          onChange={(e) => set('reason', e.target.value)}
          className="input"
          aria-label="Reason"
        >
          <option value="">All reasons</option>
          {REASON_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      {hasFilters && (
        <button onClick={clear} className="text-sm text-slate-500 hover:text-slate-800 underline">
          Clear
        </button>
      )}
    </div>
  );
}
