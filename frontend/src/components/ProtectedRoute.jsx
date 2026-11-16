import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../lib/constants.js';
import { Button, Loading } from './ui.jsx';

function MissingRoleScreen({ user, onLogout }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-amber-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
        <h1 className="text-base font-bold text-slate-900">Perfil sin rol válido en Firestore</h1>
        <p>
          Iniciaste sesión como <strong>{user.email}</strong>, pero no pudimos resolver un rol válido (
          <code>gerente</code>, <code>tecnico</code> u <code>operador</code>).
        </p>
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          Documento esperado: <code>users/{user.uid}</code>
          <br />
          Rol leído: <code>{user.role ?? 'ninguno'}</code>
          {user.authError && (
            <>
              <br />
              Detalle Firestore: <code>{user.authError}</code>
            </>
          )}
        </p>
        <Button onClick={onLogout} className="w-full">
          Cerrar sesión y volver al login
        </Button>
      </div>
    </div>
  );
}

/** Protege rutas por sesión y rol (sección 8.7). */
export function ProtectedRoute({ roles }) {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Verificando sesión…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  const roleInfo = ROLES[user.role];
  if (!roleInfo) return <MissingRoleScreen user={user} onLogout={logout} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={roleInfo.home} replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  const roleInfo = user?.role ? ROLES[user.role] : null;
  if (!roleInfo) return <Navigate to="/login" replace />;
  return <Navigate to={roleInfo.home} replace />;
}
