import { useEffect, useId, useRef } from 'react';

/**
 * Diálogo modal nativo (<dialog> + showModal): foco, Esc, ::backdrop e inert de la página
 * los da el navegador. Se controla con la prop `open`.
 */
export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      closedby="any"
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl p-0 shadow-2xl backdrop:bg-slate-900/50"
    >
      {open && (
        <div className="flex flex-col">
          <h2 id={titleId} className="border-b border-slate-100 px-5 py-3 text-base font-semibold text-slate-900">{title}</h2>
          <div className="max-h-[70vh] overflow-auto px-5 py-4 text-sm text-slate-700">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
