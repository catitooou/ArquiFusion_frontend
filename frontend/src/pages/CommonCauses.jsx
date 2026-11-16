import { Link } from 'react-router-dom';
import { useCommonCauses, useMachines } from '../hooks/useData.js';
import { formatDateTime, timeAgo } from '../lib/format.js';
import { Card, Empty, ErrorState, Loading } from '../components/ui.jsx';
import { RiskBadge, StatusBadge } from '../components/Badges.jsx';
import { SimulationPanel } from '../components/SimulationPanel.jsx';

export function CommonCauses() {
  const { data: causes = [], isLoading, error, refetch } = useCommonCauses();
  const { data: machines = [] } = useMachines();

  if (isLoading && !causes.length) return <Loading label="Cargando causas comunes…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const machineById = Object.fromEntries(machines.map((m) => [m.machineId, m]));

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Incidentes Multi-máquina y Causa Común</h1>
          <p className="text-xs text-slate-500">
            Detección automática cuando 3 o más máquinas en una misma zona superan el riesgo ≥ 60 en una ventana de 30 minutos
          </p>
        </div>
        <SimulationPanel />
      </div>

      {causes.length ? (
        <div className="space-y-4">
          {causes.map((c) => (
            <Card
              key={c.groupId}
              className={c.active ? 'border-violet-400 ring-1 ring-violet-300' : ''}
              title={
                <span className="flex items-center gap-2">
                  <span>{c.zone}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.active ? 'bg-violet-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {c.active ? 'Activa ahora' : 'Histórica'}
                  </span>
                </span>
              }
              actions={<span className="text-xs text-slate-500">{timeAgo(c.createdAt)}</span>}
            >
              <div className="space-y-3">
                <div className="rounded-lg bg-violet-50 p-3 text-sm text-violet-950">
                  <p className="text-xs font-semibold uppercase text-violet-700">Causa común sospechada</p>
                  <p className="mt-0.5 font-medium">{c.suspectedCause}</p>
                  <p className="mt-1 text-xs text-violet-700">
                    ID grupo: {c.groupId} · Inicio de ventana: {formatDateTime(c.windowStart)}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                    Máquinas afectadas ({c.machineIds?.length || 0})
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(c.machineIds || []).map((mid) => {
                      const m = machineById[mid];
                      return (
                        <Link
                          key={mid}
                          to={`/maquinas/${mid}`}
                          className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{mid}</p>
                            <p className="text-xs text-slate-500">{m?.model || 'Equipo'}</p>
                            {m && (
                              <div className="mt-1">
                                <StatusBadge status={m.status} />
                              </div>
                            )}
                          </div>
                          {m && <RiskBadge score={m.riskScore} />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Empty>No se registran incidentes grupales de causa común.</Empty>
        </Card>
      )}
    </div>
  );
}
