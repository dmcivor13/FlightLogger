import { useNavigate } from 'react-router-dom';
import { FlightForm } from '../components/flights/FlightForm';
import { createFlight } from '../api/client';
import type { FlightPayload } from '../types';

export function NewFlightPage() {
  const navigate = useNavigate();

  async function handleSubmit(data: FlightPayload) {
    await createFlight(data);
    navigate('/flights');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Flight</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <FlightForm onSubmit={handleSubmit} onCancel={() => navigate('/flights')} />
      </div>
    </div>
  );
}
