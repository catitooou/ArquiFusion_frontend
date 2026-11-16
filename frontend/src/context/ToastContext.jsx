import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);

  const push = useCallback((toast) => {
    const t = { id: nextId++, createdAt: new Date().toISOString(), tone: 'info', ...toast };
    setToasts((prev) => [t, ...prev].slice(0, 5));
    setHistory((prev) => [t, ...prev].slice(0, 50));
    return t.id;
  }, []);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const value = useMemo(() => ({ toasts, history, push, dismiss }), [toasts, history, push, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts debe usarse dentro de ToastProvider');
  return ctx;
}
