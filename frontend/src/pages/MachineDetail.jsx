import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  useMachine,
  useMachineIncidents,
  useMachineRisk,
  useMachineTelemetry,
} from '../hooks/useData.js';
import { FAULT_TYPE, MODELS, VARIABLES } from '../lib/constants.js';
import { formatDateTime, formatNumber, formatTime, timeAgo } from '../lib/format.js';
import { Card, Empty, ErrorState, Loading } from '../components/ui.jsx';
import {
  IncidentStatusBadge,
  MaintenanceBadge,
  RiskBadge,
  SeverityBadge,
  StatusBadge,
} from '../components/Badges.jsx';
import { IncidentTimeline } from '../components/IncidentTimeline.jsx';

const CHART_SERIES = [
  { key: 'temp', label: 'Temperatura (°C)', color: '#dc2626' },
  { key: 'vibration', label: 'Vibración (mm/s)', color: '#7c3aed' },
  { key: 'pressure', label: 'Presión (bar)', color: '#2563eb' },
  { key: 'fuel_lph', label: 'Combustible (L/h)', color: '#d97706' },
];

export function MachineDetail() {
  const { id } = useParams();
  const { data: machine, isLoading, error, refetch } = useMachine(id);
  const { data: risk } = useMachineRisk(id);
  const { data: telemetry = [] } = useMachineTelemetry(id);
  const { data: incidents = [] } = useMachineIncidents(id);
  const [focusSeries, setFocusSeries] = useState('all');

  const chartData = useMemo(
    () =>
      telemetry.map((t) => ({
        ...t,
        hora: formatTime(t.ts),
      })),
    [telemetry],
  );

  const anomalies = useMemo(
    () => (risk?.variables || []).filter((v) => Math.abs(v.z) >= 2 || v.peerDeviation),
    [risk],
  );

  const fuelDeviation = anomalies.find((v) => v.name === 'fuel_lph' && v.peerDeviation);

  if (isLoading) return <Loading label={`Cargando máquina ${id}…`} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!machine) return <Empty>Máquina no encontrada.</Empty>;

  const riskByVar = Object.fromEntries((risk?.variables || []).map((v) => [v.name, v]));
  const hoursUsedSinceMaint =
    machine.hours != null && machine.lastMaintHours != null
      ? Math.round(machine.hours - machine.lastMaintHours)
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <Link to="/" className="font-medium text-indigo-700 hover:underline">
          ← Volver a la vista principal
        </Link>
        <span>Última lectura: {timeAgo(machine.lastReadingAt)} ({formatDateTime(machine.lastReadingAt)})</span>
      </div>

      {/* Cabecera de máquina */}
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{machine.machineId}</h1>
            <StatusBadge status={machine.status} />
            <SeverityBadge severity={machine.severity} />
            <MaintenanceBadge hoursToMaint={machine.hoursToMaint} />
          </div>
          <p className="text-sm text-slate-600">
            {MODELS[machine.model] || machine.model} ({machine.model}) · {machine.zone} ·{' '}
            {formatNumber(machine.hours)} horas acumuladas · Coordenadas{' '}
            <span className="tabular-nums">
              {machine.lat?.toFixed(4)}, {machine.lng?.toFixed(4)}
            </span>
          </p>
          {hoursUsedSinceMaint != null && (
            <p className="text-xs text-slate-500">
              Mantenimiento preventivo (cada {machine.maintIntervalH || 500} h): {hoursUsedSinceMaint} h desde la última intervención
              {machine.hoursToMaint != null && ` · restan ${Math.round(machine.hoursToMaint)} h ajustadas por riesgo`}.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium uppercase text-slate-500">Puntaje de riesgo</p>
            {machine.faultType && (
              <p className="text-xs text-slate-600">Falla probable: {FAULT_TYPE[machine.faultType]}</p>
            )}
          </div>
          <RiskBadge score={machine.riskScore} size="lg" />
        </div>
      </section>

      {machine.openIncidentId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <span>
            Esta máquina tiene el incidente abierto <strong>{machine.openIncidentId}</strong>.
          </span>
          <Link
            to={`/incidentes/${machine.openIncidentId}`}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
          >
            Ver incidente y diagnóstico IA →
          </Link>
        </div>
      )}

      {/* Problemas 6 y 8: Consumo de combustible y comportamiento inusual vs historial y pares */}
      {anomalies.length > 0 && (
        <section className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h2 className="font-semibold">Comportamiento inusual detectado (vs historial propio y pares {machine.model})</h2>
          {fuelDeviation && (
            <p className="rounded-lg bg-amber-100/80 px-3 py-2 text-xs font-medium text-amber-950">
              ⛽ Alerta de combustible: consume {formatNumber(fuelDeviation.value)} L/h frente a{' '}
              {formatNumber(fuelDeviation.peerAvg)} L/h promedio en otras {machine.model} (línea base propia:{' '}
              {formatNumber(fuelDeviation.baseline)} L/h).
            </p>
          )}
          <ul className="grid gap-2 sm:grid-cols-2">
            {anomalies.map((v) => (
              <li key={v.name} className="rounded-lg bg-white/80 px-3 py-2 text-xs ring-1 ring-amber-200">
                <strong>{VARIABLES[v.name]?.label || v.name}:</strong> {formatNumber(v.value)}{' '}
                {VARIABLES[v.name]?.unit} (base {formatNumber(v.baseline)}, z-score {v.z}
                {v.peerAvg != null && `, promedio pares ${formatNumber(v.peerAvg)}`})
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Telemetría actual */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Object.entries(VARIABLES).map(([k, meta]) => {
          const r = riskByVar[k];
          const flagged = r && (Math.abs(r.z) >= 2 || r.peerDeviation);
          return (
            <div
              key={k}
              className={`rounded-xl border bg-white p-3 shadow-sm ${
                flagged ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'
              }`}
            >
              <p className="text-xs text-slate-500">{meta.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                {formatNumber(machine.last?.[k])}{' '}
                <span className="text-xs font-normal text-slate-500">{meta.unit}</span>
              </p>
              {r && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Base {formatNumber(r.baseline)} · z {r.z}
                  {r.peerAvg != null && ` · pares ${formatNumber(r.peerAvg)}`}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Gráfico de telemetría */}
      <Card
        title="Evolución reciente de telemetría"
        actions={
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setFocusSeries('all')}
              className={`rounded-md px-2 py-1 text-xs ${
                focusSeries === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Todas
            </button>
            {CHART_SERIES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setFocusSeries(s.key)}
                className={`rounded-md px-2 py-1 text-xs ${
                  focusSeries === s.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {VARIABLES[s.key].label}
              </button>
            ))}
          </div>
        }
      >
        {chartData.length ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hora" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip />
                <Legend />
                {CHART_SERIES.filter((s) => focusSeries === 'all' || focusSeries === s.key).map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty>Sin serie histórica de telemetría disponible para graficar.</Empty>
        )}
      </Card>

      {/* Problema 10: Historial completo de incidentes */}
      <Card title={`Historial de incidentes (${incidents.length})`}>
        {incidents.length ? (
          <div className="space-y-4">
            {incidents.map((inc) => (
              <article key={inc.incidentId} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/incidentes/${inc.incidentId}`}
                      className="font-semibold text-indigo-700 hover:underline"
                    >
                      {inc.incidentId}
                    </Link>
                    <SeverityBadge severity={inc.severity} />
                    <IncidentStatusBadge status={inc.status} />
                    <span className="text-xs text-slate-500">{FAULT_TYPE[inc.faultType]}</span>
                    {inc.isRecurrence && (
                      <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs font-medium text-fuchsia-800">
                        ↻ Reincidencia
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(inc.createdAt)}
                    {inc.downtimeMin != null && ` · Parada: ${inc.downtimeMin} min`}
                  </div>
                </div>

                {inc.aiDiagnosis?.diagnostico_probable && (
                  <p className="mt-2 text-sm text-slate-800">{inc.aiDiagnosis.diagnostico_probable}</p>
                )}

                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>Repuestos usados: {inc.partsUsed?.length ? inc.partsUsed.join(', ') : 'ninguno'}</span>
                  {inc.partsMissing?.length > 0 && (
                    <span className="text-red-700">· Faltantes: {inc.partsMissing.join(', ')}</span>
                  )}
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900">
                    Ver línea de tiempo ({inc.timeline?.length || 0} eventos)
                  </summary>
                  <div className="mt-3">
                    <IncidentTimeline timeline={inc.timeline} />
                  </div>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <Empty>Esta máquina no registra incidentes previos.</Empty>
        )}
      </Card>
    </div>
  );
}
