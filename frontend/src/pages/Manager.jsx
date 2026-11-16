import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCommonCauses,
  useIncidents,
  useMachines,
  useSummary,
  useTechnicians,
} from '../hooks/useData.js';
import { MACHINE_STATUS, MODELS, VARIABLES } from '../lib/constants.js';
import { cx, formatNumber, timeAgo } from '../lib/format.js';
import { dashboardSummary } from '../lib/logic/flota.js';
import { Card, Empty, ErrorState, Loading, StatCard } from '../components/ui.jsx';
import { MaintenanceBadge, RiskBadge, SeverityBadge, StatusBadge } from '../components/Badges.jsx';
import { MapView } from '../components/MapView.jsx';
import { IncidentList } from '../components/IncidentList.jsx';
import { IncidentDetail } from '../components/IncidentDetail.jsx';
import { CommonCauseBanner } from '../components/CommonCauseBanner.jsx';
import { SimulationPanel } from '../components/SimulationPanel.jsx';
import { AskAI } from '../components/AskAI.jsx';

const asArray = (v) => (Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : []);

export function Manager() {
  const { data: machinesRaw, isLoading: loadingMachines, error: machinesError, refetch } = useMachines();
  const { data: incidentsRaw, isLoading: loadingIncidents } = useIncidents();
  const { data: summaryData } = useSummary();
  const { data: commonCausesRaw } = useCommonCauses();
  const { data: techniciansRaw } = useTechnicians();

  const machines = asArray(machinesRaw);
  const incidents = asArray(incidentsRaw);
  const commonCauses = asArray(commonCausesRaw);
  const technicians = asArray(techniciansRaw);

  const [statusKpiFilter, setStatusKpiFilter] = useState('');
  const [leftTab, setLeftTab] = useState('incidents'); // 'incidents' | 'machines'
  const [rightTab, setRightTab] = useState('incident'); // 'incident' | 'machine' | 'ai'
  const [incStatusFilter, setIncStatusFilter] = useState('');
  const [incSevFilter, setIncSevFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [highlightIds, setHighlightIds] = useState([]);

  const summary = useMemo(
    () => summaryData || dashboardSummary(machines, incidents),
    [summaryData, machines, incidents],
  );

  const filteredIncidents = useMemo(
    () =>
      incidents.filter(
        (i) =>
          (!incStatusFilter || i.status === incStatusFilter) &&
          (!incSevFilter || i.severity === incSevFilter),
      ),
    [incidents, incStatusFilter, incSevFilter],
  );

  const activeIncident = useMemo(() => {
    if (selectedIncidentId) {
      const found = incidents.find((i) => i.incidentId === selectedIncidentId);
      if (found) return found;
    }
    return incidents.find((i) => i.status !== 'resuelto') || incidents[0] || null;
  }, [incidents, selectedIncidentId]);

  const activeMachine = useMemo(() => {
    if (selectedMachineId) {
      const found = machines.find((m) => m.machineId === selectedMachineId);
      if (found) return found;
    }
    if (activeIncident?.machineIds?.[0]) {
      return machines.find((m) => m.machineId === activeIncident.machineIds[0]) || null;
    }
    return machines[0] || null;
  }, [machines, selectedMachineId, activeIncident]);

  const mapMachines = useMemo(
    () => (statusKpiFilter ? machines.filter((m) => m.status === statusKpiFilter) : machines),
    [machines, statusKpiFilter],
  );

  const filteredMachinesList = useMemo(
    () =>
      machines
        .filter((m) => (!zoneFilter || m.zone === zoneFilter) && (!statusKpiFilter || m.status === statusKpiFilter))
        .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)),
    [machines, zoneFilter, statusKpiFilter],
  );

  const effectiveHighlight = highlightIds.length
    ? highlightIds
    : activeIncident?.machineIds || [];

  const handleSelectIncident = (inc) => {
    setSelectedIncidentId(inc.incidentId);
    setHighlightIds(inc.machineIds || []);
    if (inc.machineIds?.[0]) setSelectedMachineId(inc.machineIds[0]);
    setRightTab('incident');
  };

  const handleSelectMachine = (m) => {
    setSelectedMachineId(m.machineId);
    if (m.openIncidentId) {
      setSelectedIncidentId(m.openIncidentId);
      setRightTab('incident');
    } else {
      setRightTab('machine');
    }
    setHighlightIds([]);
  };

  const toggleStatusKpi = (status) => {
    setStatusKpiFilter((prev) => (prev === status ? '' : status));
  };

  if (loadingMachines && !machines.length) return <Loading label="Cargando centro de control…" />;
  if (machinesError) return <ErrorState error={machinesError} onRetry={refetch} />;

  return (
    <div className="flex min-h-full flex-col gap-3 p-3 sm:p-4 lg:h-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Centro de Control de Operaciones</h1>
          <p className="text-xs text-slate-500">
            Monitoreo en vivo de flota, anomalías multivariables, asignación técnica y causas comunes ·{' '}
            <Link to="/mantenimiento" className="font-medium text-indigo-700 hover:underline">
              Ver pronóstico preventivo ({summary.maintSoon ?? 0} próximas) →
            </Link>
          </p>
        </div>
        <SimulationPanel />
      </div>

      {/* KPIs superiores */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Operativas"
          value={summary.byStatus?.operativa ?? 0}
          color={MACHINE_STATUS.operativa.color}
          hint={statusKpiFilter === 'operativa' ? 'Filtro activo (clic para quitar)' : 'Clic para filtrar mapa'}
          active={statusKpiFilter === 'operativa'}
          onClick={() => toggleStatusKpi('operativa')}
        />
        <StatCard
          label="Requieren intervención"
          value={summary.byStatus?.requiere_intervencion ?? 0}
          color={MACHINE_STATUS.requiere_intervencion.color}
          hint={`${summary.openIncidents ?? 0} incidentes abiertos`}
          active={statusKpiFilter === 'requiere_intervencion'}
          onClick={() => toggleStatusKpi('requiere_intervencion')}
        />
        <StatCard
          label="Mantenimiento"
          value={summary.byStatus?.mantenimiento ?? 0}
          color={MACHINE_STATUS.mantenimiento.color}
          hint={`${summary.maintSoon ?? 0} próximas (<50 h)`}
          active={statusKpiFilter === 'mantenimiento'}
          onClick={() => toggleStatusKpi('mantenimiento')}
        />
        <StatCard
          label="Detenidas"
          value={summary.byStatus?.detenida ?? 0}
          color={MACHINE_STATUS.detenida.color}
          hint="Sin actividad"
          active={statusKpiFilter === 'detenida'}
          onClick={() => toggleStatusKpi('detenida')}
        />
        <StatCard
          label="Riesgo promedio"
          value={`${summary.avgRisk ?? 0}/100`}
          color="#eab308"
          hint={`${summary.highRisk ?? 0} riesgo ≥60 · ${summary.watch ?? 0} vigilancia`}
        />
      </div>

      {/* 3 paneles estilo centro de emergencias */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Panel Izquierdo: Incidentes / Máquinas */}
        <Card
          className="min-h-80 max-h-96 lg:col-span-3 lg:max-h-none"
          bodyClassName="flex min-h-0 flex-col p-0"
          title={
            <span className="flex gap-1" role="tablist" aria-label="Listas de monitoreo">
              <button
                type="button"
                role="tab"
                aria-selected={leftTab === 'incidents'}
                onClick={() => setLeftTab('incidents')}
                className={cx(
                  'rounded-md px-2 py-1 text-xs font-semibold transition',
                  leftTab === 'incidents' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                Incidentes ({summary.openIncidents ?? 0} activos)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={leftTab === 'machines'}
                onClick={() => setLeftTab('machines')}
                className={cx(
                  'rounded-md px-2 py-1 text-xs font-semibold transition',
                  leftTab === 'machines' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                Flota ({machines.length})
              </button>
            </span>
          }
        >
          {leftTab === 'incidents' ? (
            <>
              <div className="flex gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                <select
                  aria-label="Filtrar por estado de incidente"
                  value={incStatusFilter}
                  onChange={(e) => setIncStatusFilter(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="">Todos los estados</option>
                  <option value="abierto">Abierto</option>
                  <option value="en_atencion">En atención</option>
                  <option value="resuelto">Resuelto</option>
                </select>
                <select
                  aria-label="Filtrar por severidad"
                  value={incSevFilter}
                  onChange={(e) => setIncSevFilter(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="">Severidad</option>
                  <option value="critica">Crítica</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                </select>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {loadingIncidents && !incidents.length ? (
                  <Loading label="Cargando incidentes…" />
                ) : filteredIncidents.length ? (
                  <IncidentList
                    incidents={filteredIncidents}
                    selectedId={activeIncident?.incidentId}
                    onSelect={handleSelectIncident}
                    technicians={technicians}
                  />
                ) : (
                  <Empty>Sin incidentes para los filtros aplicados.</Empty>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                <select
                  aria-label="Filtrar máquinas por zona"
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="">Todas las zonas</option>
                  <option value="ZONA-NORTE">ZONA-NORTE</option>
                  <option value="ZONA-SUR">ZONA-SUR</option>
                  <option value="ZONA-ESTE">ZONA-ESTE</option>
                </select>
              </div>
              <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                {filteredMachinesList.map((m) => (
                  <li key={m.machineId}>
                    <button
                      type="button"
                      onClick={() => handleSelectMachine(m)}
                      className={cx(
                        'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50',
                        activeMachine?.machineId === m.machineId && 'bg-indigo-50',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{m.machineId}</p>
                        <p className="truncate text-xs text-slate-500">
                          {MODELS[m.model] || m.model} · {m.zone}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <StatusBadge status={m.status} />
                          {m.hoursToMaint < 50 && <MaintenanceBadge hoursToMaint={m.hoursToMaint} />}
                        </div>
                      </div>
                      <RiskBadge score={m.riskScore} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        {/* Panel Central: Mapa en vivo */}
        <Card
          className="min-h-80 lg:col-span-5"
          bodyClassName="h-96 p-0 lg:h-full"
          title="Mapa de flota en vivo"
          actions={
            statusKpiFilter ? (
              <button
                type="button"
                onClick={() => setStatusKpiFilter('')}
                className="text-xs font-medium text-indigo-700 hover:underline"
              >
                Mostrar todas
              </button>
            ) : (
              <span className="text-xs text-slate-500">{mapMachines.length} máquinas visibles</span>
            )
          }
        >
          <MapView
            machines={mapMachines}
            selectedId={activeMachine?.machineId}
            highlightIds={effectiveHighlight}
            onSelect={handleSelectMachine}
          >
            <CommonCauseBanner
              causes={commonCauses}
              onFocus={(c) => {
                setHighlightIds(c.machineIds || []);
                if (c.machineIds?.[0]) setSelectedMachineId(c.machineIds[0]);
              }}
            />
          </MapView>
        </Card>

        {/* Panel Derecho: Detalle del Incidente / Máquina / Asistente IA */}
        <Card
          className="min-h-80 lg:col-span-4"
          bodyClassName="min-h-0 flex-1 overflow-y-auto p-4"
          title={
            <span className="flex gap-1" role="tablist" aria-label="Panel de detalle">
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === 'incident'}
                onClick={() => setRightTab('incident')}
                className={cx(
                  'rounded-md px-2 py-1 text-xs font-semibold transition',
                  rightTab === 'incident' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                Incidente
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === 'machine'}
                onClick={() => setRightTab('machine')}
                className={cx(
                  'rounded-md px-2 py-1 text-xs font-semibold transition',
                  rightTab === 'machine' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                Máquina
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === 'ai'}
                onClick={() => setRightTab('ai')}
                className={cx(
                  'rounded-md px-2 py-1 text-xs font-semibold transition',
                  rightTab === 'ai' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                Asistente IA
              </button>
            </span>
          }
        >
          {rightTab === 'incident' &&
            (activeIncident ? (
              <IncidentDetail incident={activeIncident} compact />
            ) : (
              <Empty>Selecciona un incidente para ver el diagnóstico y reasignar técnico.</Empty>
            ))}

          {rightTab === 'machine' &&
            (activeMachine ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{activeMachine.machineId}</h3>
                    <p className="text-xs text-slate-500">
                      {MODELS[activeMachine.model] || activeMachine.model} ({activeMachine.model}) · {activeMachine.zone}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusBadge status={activeMachine.status} />
                      <SeverityBadge severity={activeMachine.severity} />
                      <MaintenanceBadge hoursToMaint={activeMachine.hoursToMaint} />
                    </div>
                  </div>
                  <RiskBadge score={activeMachine.riskScore} size="lg" />
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(VARIABLES).map(([k, meta]) => (
                    <div key={k} className="rounded-lg border border-slate-200 px-3 py-2">
                      <dt className="text-xs text-slate-500">{meta.label}</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">
                        {formatNumber(activeMachine.last?.[k])} {meta.unit}
                      </dd>
                    </div>
                  ))}
                  <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <dt className="text-xs text-slate-500">Horas acumuladas</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">
                      {formatNumber(activeMachine.hours)} h
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">
                    Última lectura {timeAgo(activeMachine.lastReadingAt)}
                  </span>
                  <Link
                    to={`/maquinas/${activeMachine.machineId}`}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    Ver ficha completa e historial →
                  </Link>
                </div>
              </div>
            ) : (
              <Empty>Selecciona una máquina en el mapa.</Empty>
            ))}

          {rightTab === 'ai' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Consulta en lenguaje natural sobre las máquinas de mayor riesgo, incidentes abiertos y stock de repuestos.
              </p>
              <AskAI />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
