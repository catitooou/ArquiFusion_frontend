import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useToasts } from '../context/ToastContext.jsx';
import { SEVERITY } from '../lib/constants.js';

const supportsPopover = typeof HTMLElement !== 'undefined' && Object.hasOwn(HTMLElement.prototype, 'popover');

function announce(text) {
  if (typeof document.ariaNotify === 'function') document.ariaNotify(text);
  else {
    const live = document.getElementById('toast-live');
    if (live) live.textContent = text;
  }
}

/**
 * Contenedor de toasts por rol. Región con nombre accesible, en popover="manual" (top layer, sin
 * light-dismiss) y toasts persistentes hasta que se cierran: las alertas también quedan en la lista
 * de incidentes, así la información no depende del toast.
 */
export function AlertToast() {
  const { toasts, dismiss } = useToasts();
  const ref = useRef(null);
  const seen = useRef(new Set());

  useEffect(() => {
    const el = ref.current;
    if (!el || !supportsPopover) return;
    const isOpen = el.matches(':popover-open');
    if (toasts.length && !isOpen) el.showPopover();
    if (!toasts.length && isOpen) el.hidePopover();
  }, [toasts.length]);

  useEffect(() => {
    for (const t of toasts) {
      if (seen.current.has(t.id)) continue;
      seen.current.add(t.id);
      announce(`${t.title}. ${t.message}${t.incidentId ? '. Acciones disponibles' : ''}`);
    }
  }, [toasts]);

  const close = (id, e) => {
    // Si el foco estaba en este toast, pásalo al siguiente
    const container = ref.current;
    const items = [...(container?.querySelectorAll('[data-toast]') || [])];
    const idx = items.findIndex((n) => n.contains(e.currentTarget));
    const next = items[idx + 1] || items[idx - 1];
    dismiss(id);
    next?.querySelector('button')?.focus();
  };

  return (
    <>
      <p className="sr-only">Anuncios para lectores de pantalla</p>
      <div id="toast-live" aria-live="assertive" className="sr-only" />
      <div
        ref={ref}
        role="region"
        aria-label="Notificaciones"
        {...(supportsPopover ? { popover: 'manual' } : {})}
        className="toast-region"
      >
        {toasts.map((t) => {
          const sev = SEVERITY[t.severity];
          return (
            <div
              key={t.id}
              data-toast
              className="toast pointer-events-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
              style={{ borderLeft: `6px solid ${sev?.color || '#334155'}` }}
            >
              <div className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {sev && <span className="mr-1 uppercase" style={{ color: sev.color }}>{sev.label} ·</span>}
                    {t.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{t.message}</p>
                  {t.incidentId && (
                    <Link
                      to={`/incidentes/${t.incidentId}`}
                      onClick={() => dismiss(t.id)}
                      className="mt-2 inline-block text-xs font-medium text-indigo-700 underline underline-offset-2"
                    >
                      Ver incidente
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => close(t.id, e)}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Cerrar notificación"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
