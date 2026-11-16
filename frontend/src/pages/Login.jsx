import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, DEMO_USERS } from '../context/AuthContext.jsx';
import { FIREBASE_ENABLED } from '../config/env.js';
import { ROLES } from '../lib/constants.js';
import { Button } from '../components/ui.jsx';

const ROLE_CARDS = [
  {
    role: 'gerente',
    icon: '📊',
    title: 'Gerente de Operaciones',
    desc: 'Centro de control en vivo, KPIs, mapa, reasignación de técnicos, repuestos, productividad, causas comunes y asistente IA.',
  },
  {
    role: 'tecnico',
    icon: '🔧',
    title: 'Técnico de Campo',
    desc: 'Vista móvil de incidentes asignados, diagnóstico de IA, repuestos necesarios y botón Resolver.',
  },
  {
    role: 'operador',
    icon: '🚜',
    title: 'Operador de Zona',
    desc: 'Mapa de flota en vivo con el estado de sus máquinas y alertas de operación.',
  },
];

export function Login() {
  const { user, loading, login, loginDemo, logout } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user?.role && ROLES[user.role]) {
    const from = location.state?.from?.pathname;
    const dest = from && from !== '/login' ? from : ROLES[user.role].home;
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err?.message || 'Credenciales inválidas. Verifica correo y contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <header className="text-center text-white">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-amber-400 text-2xl font-black text-slate-900 shadow-lg">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ArquiGuard</h1>
          <p className="mt-1 text-sm text-slate-300">
            Gestión inteligente y preventiva de flotas · ArquiFusion Corp
          </p>
        </header>

        {!loading && user && !ROLES[user.role] && (
          <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow">
            <p className="font-semibold">Sesión iniciada como {user.email}, pero falta asignar un rol válido en Firestore.</p>
            <p className="mt-1 text-xs">
              Verifica el documento <code>users/{user.uid}</code> (campo <code>role</code>: <code>gerente</code>,{' '}
              <code>tecnico</code> u <code>operador</code>).
              {user.authError && ` Detalle: ${user.authError}`}
            </p>
            <Button variant="secondary" className="mt-2 text-xs" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-12">
          {FIREBASE_ENABLED && (
            <section className="rounded-2xl bg-white p-6 shadow-xl md:col-span-5">
              <h2 className="text-base font-semibold text-slate-900">Iniciar sesión</h2>
              <p className="mt-1 text-xs text-slate-500">Acceso autenticado con Firebase Auth</p>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-slate-700">
                    Correo electrónico
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="gerente@arquifusion.pe"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-xs font-medium text-slate-700">
                    Contraseña
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-600 focus:outline-none"
                  />
                </div>
                {error && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full py-2" disabled={submitting}>
                  {submitting ? 'Ingresando…' : 'Ingresar'}
                </Button>
              </form>
            </section>
          )}

          <section
            className={`rounded-2xl bg-white p-6 shadow-xl ${
              FIREBASE_ENABLED ? 'md:col-span-7' : 'md:col-span-12'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Acceso rápido por rol (Demo)</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {FIREBASE_ENABLED
                    ? 'También puedes probar las vistas de cada perfil directamente:'
                    : 'Modo demostración sin Firebase configurado: elige un rol para explorar la plataforma.'}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                3 Roles
              </span>
            </div>

            <div className={`mt-4 grid gap-3 ${FIREBASE_ENABLED ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
              {ROLE_CARDS.map((card) => {
                const demoUser = DEMO_USERS[card.role];
                return (
                  <button
                    key={card.role}
                    type="button"
                    onClick={() => loginDemo(card.role)}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-900 hover:bg-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl" aria-hidden="true">{card.icon}</span>
                        <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-700">
                          {ROLES[card.role].label}
                        </span>
                      </div>
                      <h3 className="mt-2 font-semibold text-slate-900">{card.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{card.desc}</p>
                    </div>
                    <div className="mt-3 border-t border-slate-200/80 pt-2 text-xs font-medium text-indigo-700">
                      Entrar como {demoUser.name} →
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
