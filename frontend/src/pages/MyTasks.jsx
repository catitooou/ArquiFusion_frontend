import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useIncidents, useParts, useTechnicians } from '../hooks/useData.js';
import { techniciansService } from '../services/technicians.js';
import { useToasts } from '../context/ToastContext.jsx';
import { FAULT_TYPE } from '../lib/constants.js';
import { formatDateTime, timeAgo } from '../lib/format.js';
import { Button, Card, Empty, ErrorState, Loading } from '../components/ui.jsx';
import { IncidentStatusBadge, RiskBadge, SeverityBadge } from '../components/Badges.jsx';
import { ResolveButton } from '../components/ResolveButton.jsx';

export function MyTasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { push } = useToasts();
  const { data: technicians = [], isLoading: loadingTechs } = useTechnicians();
  const { data: incidents = [], isLoading: loadingInc, error, refetch } = useIncidents();
  const { data: parts = [] } = useParts();

  const [selectedTechId, setSelectedTechId] = useState(user?.techId || 'TEC-01');
  const [showAllOpen, setShowAllOpen] = useState(false);

  const activeTech = useMemo(
    () => technicians.find((t) => t.techId === selectedTechId) || technicians[0] || null,
    [technicians, selectedTechId],
  );

  const toggleAvailable = useMutation({
    mutationFn: () => techniciansService.update(activeTech.techId, { available: !activeTech.available }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['technicians'] });
      push({
        title: 'Disponibilidad actualizada',
        message: `${activeTech.name}: ${!activeTech.available ? 'Disponible' : 'No disponible'}.`,
      });
    },
  });

  const partName = (id) => parts.find((p) => p.partId === id)?.name || id;

  const pending = useMemo(
    () =>
      incidents.filter(
        (i) =>
          i.status !== 'resuelto' &&
          (showAllOpen || !activeTech || i.technicianId === activeTech.techId),
      ),
    [incidents, activeTech, showAllOpen],
  );

  const resolvedMine = useMemo(
    () =>
      incidents.filter(
        (i) => i.status === 'resuelto' && (!activeTech || i.technicianId === activeTech.techId),
      ),
    [incidents, activeTech],
  );

  if ((loadingTechs || loadingInc) && !incidents.length) return <Loading label="Cargando tareas…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-5">
      {/* Cabecera mobile-first */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Panel del técnico</p>
            <h1 className="text-xl font-bold text-slate-900">{activeTech?.name || 'Mis tareas'}</h1>
            {activeTech && (
              <p className="mt-0.5 text-xs text-slate-600">
                {activeTech.zone} · Especialidad:{' '}
                {activeTech.specialty?.map((s) => FAULT_TYPE[s] || s).join(', ')} ·{' '}
                {activeTech.activeIncidents} activos
              </p>
            )}
          </div>

          {activeTech && (
            <Button
              variant={activeTech.available ? 'secondary' : 'danger'}
              onClick={() => toggleAvailable.mutate()}
              disabled={toggleAvailable.isPending}
              className="text-xs"
            >
              {activeTech.available ? '🟢 Disponible' : '🔴 No disponible'}
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <label htmlFor="tech-switch" className="text-xs font-medium text-slate-600">
              Ver como técnico:
            </label>
            <select
              id="tech-switch"
              value={activeTech?.techId || ''}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
            >
              {technicians.map((t) => (
                <option key={t.techId} value={t.techId}>
                  {t.name} ({t.zone})
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={showAllOpen}
              onChange={(e) => setShowAllOpen(e.target.checked)}
              className="rounded border-slate-300"
            />
            Mostrar todos los incidentes abiertos
          </label>
        </div>
      </section>

      {/* Pendientes */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Pendientes de atención ({pending.length})
        </h2>

        {pending.length ? (
          pending.map((inc) => (
            <article
              key={inc.incidentId}
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-base font-bold text-slate-900">
                      {inc.machineIds?.join(', ')}
                    </span>
                    <SeverityBadge severity={inc.severity} />
                    <IncidentStatusBadge status={inc.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {inc.incidentId} · {FAULT_TYPE[inc.faultType]} · {inc.zone} · {timeAgo(inc.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {inc.etaMin != null && (
                    <span className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-bold text-white">
                      ETA {inc.etaMin} min
                    </span>
                  )}
                  <RiskBadge score={inc.riskScore} />
                </div>
              </div>

              {inc.messages?.tecnico && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">
                  <p className="text-xs font-semibold uppercase text-indigo-700">Instrucción directa</p>
                  <p className="mt-1">{inc.messages.tecnico}</p>
                </div>
              )}

              {inc.aiDiagnosis && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm">
                  <p className="font-medium text-violet-950">{inc.aiDiagnosis.diagnostico_probable}</p>
                  {inc.aiDiagnosis.acciones_recomendadas?.length > 0 && (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-violet-900">
                      {inc.aiDiagnosis.acciones_recomendadas.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-medium text-slate-600">Repuestos:</span>
                {inc.partsUsed?.map((p) => (
                  <span key={p} className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">
                    ✓ {partName(p)}
                  </span>
                ))}
                {inc.partsMissing?.map((p) => (
                  <span key={p} className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">
                    ⚠ Sin stock: {partName(p)}
                  </span>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <ResolveButton incident={inc} className="flex-1 py-2.5 text-base" />
                <Link
                  to={`/maquinas/${inc.machineIds?.[0]}`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Ver máquina
                </Link>
              </div>
            </article>
          ))
        ) : (
          <Card>
            <Empty>
              No tienes incidentes pendientes en este momento. Puedes activar "Mostrar todos los incidentes abiertos" o disparar un escenario desde Centro de Control.
            </Empty>
          </Card>
        )}
      </section>

      {/* Resueltos recientemente */}
      {resolvedMine.length > 0 && (
        <Card title={`Resueltos recientemente (${resolvedMine.length})`}>
          <ul className="divide-y divide-slate-100 text-sm">
            {resolvedMine.map((inc) => (
              <li key={inc.incidentId} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <Link to={`/incidentes/${inc.incidentId}`} className="font-semibold text-slate-900 hover:underline">
                    {inc.machineIds?.join(', ')} · {inc.incidentId}
                  </Link>
                  <p className="text-xs text-slate-500">
                    Resuelto {formatDateTime(inc.resolvedAt)} · Parada {inc.downtimeMin} min
                  </p>
                </div>
                <IncidentStatusBadge status={inc.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
