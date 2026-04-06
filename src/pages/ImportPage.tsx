import { useState, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { importPreview, importCommit } from '../api/client';
import { ImportPreviewTable } from '../components/import/ImportPreviewTable';
import type { ImportPreviewResponse, ImportCommitResponse } from '../types';

type Step = 'upload' | 'preview' | 'result';

export function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [passengerName, setPassengerName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ImportCommitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ passenger?: string; file?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePreview(e: FormEvent) {
    e.preventDefault();
    const errs: typeof fieldErrors = {};
    if (!passengerName.trim()) errs.passenger = 'Passenger name is required';
    if (!file) errs.file = 'Please select a CSV file';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    setError(null);
    try {
      const data = await importPreview(file!, passengerName.trim());
      setPreview(data);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse CSV');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const data = await importCommit(preview.token);
      setResult(data);
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep('upload');
    setPassengerName('');
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setFieldErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Import Flights</h1>
        <StepIndicator step={step} />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{error}</div>
      )}

      {step === 'upload' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm text-slate-600 mb-6">
            Upload a FlightRadar24 CSV export (My Data → Export). Each import is for one passenger — run it again with a different name to tag other family members on the same flights.
          </p>
          <form onSubmit={handlePreview} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Passenger Name
              </label>
              <input
                type="text"
                placeholder="Passenger name"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                className="input"
              />
              {fieldErrors.passenger && <p className="text-red-600 text-xs mt-1">{fieldErrors.passenger}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="csv-file-input">
                CSV File
              </label>
              <input
                id="csv-file-input"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                aria-label="CSV file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100 cursor-pointer"
              />
              {fieldErrors.file && <p className="text-red-600 text-xs mt-1">{fieldErrors.file}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Parsing…' : 'Preview'}
            </button>
          </form>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-1">
              Import preview for <span className="text-blue-700">{preview.passenger}</span>
            </h2>
            <p className="text-sm text-slate-500 mb-4">Review the changes below before confirming.</p>
            <ImportPreviewTable preview={preview} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleCommit} disabled={loading} className="btn-primary">
              {loading ? 'Importing…' : 'Confirm Import'}
            </button>
            <button onClick={reset} className="btn-secondary">Back</button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-slate-900 text-lg">Import complete</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-medium">
              {result.rows_processed} rows processed
            </span>
            {result.flights_created > 0 && (
              <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium">
                {result.flights_created} flight{result.flights_created !== 1 ? 's' : ''} created
              </span>
            )}
            {result.flights_matched > 0 && (
              <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full font-medium">
                {result.flights_matched} matched existing
              </span>
            )}
            {result.passengers_added > 0 && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium">
                {result.passengers_added} passenger{result.passengers_added !== 1 ? 's' : ''} tagged
              </span>
            )}
            {result.rows_skipped > 0 && (
              <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-medium">
                {result.rows_skipped} skipped
              </span>
            )}
          </div>
          {result.warnings.length > 0 && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm font-medium text-yellow-800 mb-1">Warnings</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-3">
            <Link to="/flights" className="btn-primary text-sm">View Flights</Link>
            <button onClick={reset} className="btn-secondary text-sm">Import Another</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: 'upload', label: 'Upload' },
    { key: 'preview', label: 'Preview' },
    { key: 'result', label: 'Done' },
  ];
  const current = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-1 text-xs">
      {steps.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1">
          <span className={`px-2 py-0.5 rounded-full font-medium ${i <= current ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
            {i + 1}
          </span>
          <span className={i <= current ? 'text-slate-700' : 'text-slate-400'}>{s.label}</span>
          {i < steps.length - 1 && <span className="text-slate-300 mx-1">→</span>}
        </span>
      ))}
    </div>
  );
}
