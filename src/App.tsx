import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { FlightsPage } from './pages/FlightsPage';
import { NewFlightPage } from './pages/NewFlightPage';
import { FlightDetailPage } from './pages/FlightDetailPage';
import { TripsPage } from './pages/TripsPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { StatsPage } from './pages/StatsPage';
import { MapPage } from './pages/MapPage';
import { ImportPage } from './pages/ImportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/flights" replace />} />
          <Route path="flights" element={<FlightsPage />} />
          <Route path="flights/new" element={<NewFlightPage />} />
          <Route path="flights/:id" element={<FlightDetailPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="trips/:id" element={<TripDetailPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="import" element={<ImportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
