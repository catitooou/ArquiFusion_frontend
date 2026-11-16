import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCommonCauses, useIncidents, useMachines } from '../hooks/useData.js';
import { MACHINE_STATUS, MODELS, VARIABLES } from '../lib/constants.js';
import { formatNumber, timeAgo } from '../lib/format.js';
import { Card, Empty, ErrorState, Loading } from '../components/ui.jsx';
import { MaintenanceBadge, RiskBadge, SeverityBadge, StatusBadge } from '../components/Badges.jsx';
import { MapView } from '../components/MapView.jsx';
import { CommonCauseBanner } from '../components/CommonCauseBanner.jsx';

export function FleetMap() {
  const { user } = useAuth();
  const { data: rawMachines, isLoading, error, refetch } = useMachines();
  const { data: rawIncidents } = useIncidents();
  const { data: rawCommonCauses } = useCommonCauses();
  const machines = Array.isArray(rawMachines) ? rawMachines : [];
  const incidents = Array.isArray(rawIncidents) ? rawIncidents : [];
  const commonCauses = Array.isArray(rawCommonCauses) ? rawCommonCauses : [];

  const [zoneFilter, setZoneFilter] = useState(user?.role === 'operador' && user.zone ? user.zone : '');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const visibleMachines = useMemo(
    () =>
      machines.filter(
        (m) => (!zoneFilter || m.zone === zoneFilter) && (!statusFilter || m.status === statusFilter),
      ),
    [machines, zoneFilter, statusFilter],
  );

  const operatorAlerts = useMemo(
    () =>
      incidents.filter(
        (i) =>
          i.status !== 'resuelto' &&
          i.messages?.operador &&
          (!zoneFilter || i.zone === zoneFilter),
      ),
    [incidents, zoneFilter],
  );

  const selected = useMemo(
    () => visibleMachines.find((m) => m.machineId === selectedId) || visibleMachines[0] || null,
    [visibleMachines, selectedId],
  );

  if (isLoading && !machines.length) return <Loading label="Cargando mapa de flota…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Mapa de Flota</h1>
          <p className="text-xs text-slate-500">
            Ubicación, estado operativo y alertas activas en tiempo real
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filtrar por zona"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Todas las zonas</option>
            <option value="ZONA-NORTE">ZONA-NORTE</option>
            <option value="ZONA-SUR">ZONA-SUR</option>
            <option value="ZONA-ESTE">ZONA-ESTE</option>
          </select>
          <select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Todos los estados</option>
            {Object.entries(MACHINE_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        <Card className="min-h-80 lg:col-span-8" bodyClassName="h-96 p-0 lg:h-full">
          <MapView
            machines={visibleMachines}
            selectedId={selected?.machineId}
            onSelect={(m) => setSelectedId(m.machineId)}
          >
            <CommonCauseBanner
              causes={commonCauses.filter((c) => !zoneFilter || c.zone === zoneFilter)}
              onFocus={(c) => c.machineIds?.[0] && setSelectedId(c.machineIds[0])}
            />
          </MapView>
        </Card>

        <div className="flex min-h-0 flex-col gap-3 lg:col-span-4">
          {operatorAlerts.length > 0 && (
            <Card title="Indicaciones operativas activas" className="border-red-200">
              <ul className="space-y-2">
                {operatorAlerts.map((inc) => (
                  <li key={inc.incidentId} className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-red-900">{inc.machineIds?.join(', ')}</span>
                      <SeverityBadge severity={inc.severity} />
                    </div>
                    <p className="mt-1 text-red-900">{inc.messages.operador}</p>
                    <p className="mt-1 text-[11px] text-red-700">{timeAgo(inc.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card
            title={`Máquinas (${visibleMachines.length})`}
            className="min-h-0 flex-1"
            bodyClassName="min-h-0 flex-1 overflow-y-auto p-0"
          >
            {visibleMachines.length ? (
              <ul className="divide-y divide-slate-100">
                {visibleMachines.map((m) => (
                  <li key={m.machineId}>
                    <div
                      onClick={() => setSelectedId(m.machineId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedId(m.machineId)}
                      className={`cursor-pointer space-y-2 px-4 py-3 transition hover:bg-slate-50 ${
                        selected?.machineId === m.machineId ? 'bg-indigo-50/70' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-900">{m.machineId}</span>
                          <span className="ml-2 text-xs text-slate-500">
                            {MODELS[m.model] || m.model} · {m.zone}
                          </span>
                        </div>
                        <RiskBadge score={m.riskScore} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={m.status} />
                        <MaintenanceBadge hoursToMaint={m.hoursToMaint} />
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[11px] text-slate-600">
                        <span>{VARIABLES.temp.label}: {formatNumber(m.last?.temp)}°C</span>
                        <span>Vib: {formatNumber(m.last?.vibration)}</span>
                        <span>Pres: {formatNumber(m.last?.pressure)}</span>
                        <span>Comb: {formatNumber(m.last?.fuel_lph)}</span>
                      </div>
                      <Link
                        to={`/maquinas/${m.machineId}`}
                        className="inline-block text-xs font-medium text-indigo-700 hover:underline"
                      >
                        Ver ficha e historial →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No hay máquinas que coincidan con el filtro.</Empty>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
