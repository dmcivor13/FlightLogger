import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/flights', label: 'Flights' },
  { to: '/stats', label: 'Stats' },
  { to: '/map', label: 'Map' },
  { to: '/import', label: 'Import' },
];

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-6">
        <span className="font-bold text-blue-700 text-lg tracking-tight">✈ FlightLogger</span>
        <div className="flex gap-4">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm font-medium px-2 py-1 rounded transition-colors ${
                  isActive
                    ? 'text-blue-700 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
