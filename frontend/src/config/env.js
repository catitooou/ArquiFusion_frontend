const env = import.meta.env;

export const API_URL = (env.VITE_API_URL || '').replace(/\/$/, '');
export const API_KEY = env.VITE_API_KEY || '';
// Por defecto usamos mocks hasta que Keyra entregue la API real.
export const USE_MOCK = String(env.VITE_USE_MOCK ?? 'true') !== 'false';

export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Sin config de Firebase, la app corre en "modo demo" (login por rol, tiempo real simulado).
export const FIREBASE_ENABLED = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
