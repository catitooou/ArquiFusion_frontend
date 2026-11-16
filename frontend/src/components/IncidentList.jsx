import { FAULT_TYPE, SEVERITY } from '../lib/constants.js';
import { cx, timeAgo } from '../lib/format.js';
import { IncidentStatusBadge, SeverityBadge } from './Badges.jsx';

export function IncidentList({ incidents = [], selectedId, onSelect, technicians = [] }) {
  const techName = (id) => technicians.find((t) => t.techId === id)?.name;
  return (
    <ul className="divide-y divide-slate-100" aria-label="Incidentes">
      {incidents.map((inc) => {
        const sel = inc.incidentId === selectedId;
        const sev = SEVERITY[inc.severity];
        return (
          <li key={inc.incidentId}>
            <button
              type="button"
              onClick={() => onSelect?.(inc)}
              aria-current={sel ? 'true' : undefined}
              className={cx(
                'flex w-full gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none',
                sel && 'bg-indigo-50 hover:bg-indigo-50',
              )}
            >
              <span className="mt-0.5 w-1.5 shrink-0 self-stretch rounded-full" style={{ background: sev?.color || '#cbd5e1' }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">{inc.machineIds?.join(', ')}</span>
                  <span className="shrink-0 text-xs text-slate-500">{timeAgo(inc.createdAt)}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {inc.incidentId} · {FAULT_TYPE[inc.faultType] || inc.faultType} · {inc.zone}
                  {inc.type === 'grupal' && ' · GRUPAL'}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1">
                  <SeverityBadge severity={inc.severity} />
                  <IncidentStatusBadge status={inc.status} />
                  {inc.isRecurrence && <span className="text-xs font-medium text-fuchsia-700">↻ Reincidencia</span>}
                  {inc.technicianId && <span className="truncate text-xs text-slate-600">👷 {techName(inc.technicianId) || inc.technicianId}</span>}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
