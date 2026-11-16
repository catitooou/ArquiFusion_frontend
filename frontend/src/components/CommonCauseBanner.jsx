import { Link } from 'react-router-dom';
import { timeAgo } from '../lib/format.js';

/** Banner de causa común por zona (problema 11). */
export function CommonCauseBanner({ causes = [], onFocus }) {
  const active = causes.filter((c) => c.active);
  if (!active.length) return null;
  return (
    <div className="pointer-events-auto absolute inset-x-3 top-3 z-[1000] space-y-2">
      {active.map((c) => (
        <div key={c.groupId} role="status" className="flex items-start gap-3 rounded-xl border border-violet-300 bg-violet-700 px-4 py-2.5 text-white shadow-lg">
          <span className="text-xl" aria-hidden="true">⚠</span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">
              Posible causa común en {c.zone}: {c.machineIds.length} máquinas afectadas
            </p>
            <p className="text-violet-100">{c.suspectedCause} · {c.machineIds.join(', ')} · {timeAgo(c.createdAt)}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-1 text-xs">
            {onFocus && (
              <button type="button" onClick={() => onFocus(c)} className="rounded-md bg-white/15 px-2 py-1 font-medium hover:bg-white/25">
                Ver en mapa
              </button>
            )}
            <Link to="/causas-comunes" className="rounded-md bg-white/15 px-2 py-1 text-center font-medium hover:bg-white/25">Detalle</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
