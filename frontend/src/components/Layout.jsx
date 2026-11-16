import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtimeSync } from '../hooks/useRealtime.js';
import { USE_MOCK, FIREBASE_ENABLED } from '../config/env.js';
import { ROLES } from '../lib/constants.js';
import { cx } from '../lib/format.js';
import { AlertToast } from './AlertToast.jsx';

const NAV = [
  { to: '/gerente', label: 'Centro de control', roles: ['gerente'] },
  { to: '/mis-tareas', label: 'Mis tareas', roles: ['tecnico'] },
  { to: '/mapa', label: 'Mapa de flota', roles: ['operador', 'gerente', 'tecnico'] },
  { to: '/incidentes', label: 'Incidentes', roles: ['gerente', 'tecnico'] },
  { to: '/repuestos', label: 'Repuestos', roles: ['gerente', 'tecnico'] },
  { to: '/mantenimiento', label: 'Mantenimiento', roles: ['gerente', 'tecnico'] },
  { to: '/productividad', label: 'Productividad', roles: ['gerente'] },
  { to: '/causas-comunes', label: 'Causas comunes', roles: ['gerente'] },
];

export function Layout() {
  const { user, logout } = useAuth();
  useRealtimeSync();
  const items = NAV.filter((n) => n.roles.includes(user?.role));

  return (
    <div className="flex h-full min-w-0 max-w-full flex-col overflow-x-hidden">
      <header className="sticky top-0 z-[1100] w-full min-w-0 bg-slate-900 text-white shadow">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 sm:px-4">
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-400 font-black text-slate-900" aria-hidden="true">A</span>
            <div className="leading-tight">
              <p className="text-sm font-bold">ArquiGuard</p>
              <p className="hidden text-[11px] text-slate-400 sm:block">ArquiFusion Corp</p>
            </div>
          </div>
          <nav aria-label="Principal" className="order-3 w-full min-w-0 xl:order-2 xl:mx-2 xl:w-auto xl:flex-1">
            <ul className="flex flex-wrap gap-1">
              {items.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    className={({ isActive }) =>
                      cx('block whitespace-nowrap rounded-md px-2.5 py-1 text-xs sm:text-sm transition', isActive ? 'bg-white/15 font-semibold text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white')
                    }
                  >
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="order-2 flex shrink-0 items-center gap-2 xl:order-3">
            {(USE_MOCK || !FIREBASE_ENABLED) && (
              <span className="hidden rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 md:inline" title="VITE_USE_MOCK / Firebase sin configurar">
                {USE_MOCK ? 'Mock' : 'API'}{!FIREBASE_ENABLED && ' · demo'}
              </span>
            )}
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm">{user?.name}</p>
              <p className="text-[11px] text-slate-400">{ROLES[user?.role]?.label}</p>
            </div>
            <button type="button" onClick={logout} className="rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
      <AlertToast />
    </div>
  );
}
