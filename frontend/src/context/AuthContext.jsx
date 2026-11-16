import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import { FIREBASE_ENABLED } from '../config/env.js';

const AuthContext = createContext(null);

// Usuarios del modo demo (sin Firebase). En Firebase, estos datos viven en users/{uid}.
export const DEMO_USERS = {
  gerente: { uid: 'demo-gerente', name: 'Gerencia de Operaciones', email: 'gerente@arquifusion.demo', role: 'gerente' },
  tecnico: { uid: 'demo-tecnico', name: 'Luis Ramírez', email: 'tecnico@arquifusion.demo', role: 'tecnico', techId: 'TEC-01' },
  operador: { uid: 'demo-operador', name: 'Operador Zona Norte', email: 'operador@arquifusion.demo', role: 'operador', zone: 'ZONA-NORTE' },
};

const DEMO_KEY = 'arquiguard.demoRole';

function normalizeRole(val) {
  if (typeof val !== 'string') return null;
  const cleaned = val
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^["']|["']$/g, '');
  return cleaned || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!FIREBASE_ENABLED) {
      const role = localStorage.getItem(DEMO_KEY);
      setUser(role && DEMO_USERS[role] ? DEMO_USERS[role] : null);
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        const profile = snap.exists() ? snap.data() : {};
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          name: profile.name || fbUser.displayName || fbUser.email,
          role: normalizeRole(profile.role),
          techId: typeof profile.techId === 'string' ? profile.techId.trim() : profile.techId || null,
          zone: typeof profile.zone === 'string' ? profile.zone.trim() : profile.zone || null,
          authError: null,
        });
      } catch (e) {
        console.error('No se pudo leer users/{uid}', e);
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.email,
          role: null,
          authError: e?.message || 'Error al leer el perfil en Firestore',
        });
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = useCallback(async (email, password) => {
    if (!FIREBASE_ENABLED) throw new Error('Firebase no está configurado');
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const loginDemo = useCallback((role) => {
    localStorage.setItem(DEMO_KEY, role);
    setUser(DEMO_USERS[role]);
  }, []);

  const logout = useCallback(async () => {
    if (FIREBASE_ENABLED) await signOut(auth);
    localStorage.removeItem(DEMO_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, loginDemo, logout, demo: !FIREBASE_ENABLED }),
    [user, loading, login, loginDemo, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
