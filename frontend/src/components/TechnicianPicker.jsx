import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentsService } from '../services/incidents.js';
import { useSuggestions } from '../hooks/useData.js';
import { useToasts } from '../context/ToastContext.jsx';
import { Button, Loading } from './ui.jsx';
import { Modal } from './Modal.jsx';
import { cx } from '../lib/format.js';
import { FAULT_TYPE } from '../lib/constants.js';

/**
 * Técnico asignado + top 3 sugeridos con ETA (GET /incidents/{id}/suggestions)
 * y reasignación manual (PATCH /incidents/{id}/assign). Problema 5.
 */
export function TechnicianPicker({ incident, technicians = [], canReassign = true }) {
  const qc = useQueryClient();
  const { push } = useToasts();
  const resolved = incident.status === 'resuelto';
  const { data: suggestions, isLoading } = useSuggestions(incident.incidentId, !resolved);
  const [pending, setPending] = useState(null);

  const assign = useMutation({
    mutationFn: (techId) => incidentsService.assign(incident.incidentId, techId),
    onSuccess: (inc) => {
      qc.setQueryData(['incident', inc.incidentId], inc);
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['technicians'] });
      qc.invalidateQueries({ queryKey: ['suggestions', inc.incidentId] });
      push({ title: 'Técnico reasignado', message: `${incident.incidentId}: el nuevo técnico fue notificado.`, tone: 'success' });
      setPending(null);
    },
    onError: (e) => push({ title: 'No se pudo reasignar', message: e.message, severity: 'alta' }),
  });

  const current = technicians.find((t) => t.techId === incident.technicianId);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Técnico asignado</p>
        {incident.technicianId ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{current?.name || incident.technicianId}</p>
              <p className="text-xs text-slate-600">
                {current?.specialty?.map((s) => FAULT_TYPE[s]).join(', ')}
                {current && ` · ${current.experienceYears} años`}
              </p>
            </div>
            {incident.etaMin != null && !resolved && (
              <span className="shrink-0 rounded-md bg-indigo-600 px-2 py-1 text-xs font-bold text-white">ETA {incident.etaMin} min</span>
            )}
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Asignando…</p>
        )}
      </div>

      {!resolved && canReassign && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Mejores opciones (puntaje)</p>
          {isLoading ? (
            <Loading label="Calculando sugerencias…" />
          ) : (
            <ul className="space-y-1.5">
              {(suggestions || []).map((s, i) => {
                const isCurrent = s.techId === incident.technicianId;
                return (
                  <li key={s.techId} className={cx('flex items-center gap-2 rounded-lg border p-2', isCurrent ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200')}>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        {Math.round(s.score * 100)} pts · {s.distanceKm} km · ETA {s.etaMin} min
                        {s.breakdown?.especialidad === 1 && ' · especialista'}
                      </p>
                    </div>
                    {isCurrent ? (
                      <span className="text-xs font-medium text-indigo-700">Actual</span>
                    ) : (
                      <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setPending(s)}>
                        Reasignar
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Confirmar reasignación"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)} autoFocus>
              Cancelar
            </Button>
            <Button onClick={() => assign.mutate(pending.techId)} disabled={assign.isPending}>
              {assign.isPending ? 'Reasignando…' : 'Reasignar'}
            </Button>
          </>
        }
      >
        {pending && (
          <p>
            ¿Reasignar <strong>{incident.incidentId}</strong> de <strong>{current?.name || '—'}</strong> a{' '}
            <strong>{pending.name}</strong> (ETA {pending.etaMin} min)? Se liberará al técnico anterior y se notificará al nuevo.
          </p>
        )}
      </Modal>
    </div>
  );
}
