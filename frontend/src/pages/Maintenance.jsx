import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMachines, useMaintenance } from '../hooks/useData.js';
import { MODELS } from '../lib/constants.js';
import { formatNumber } from '../lib/format.js';
import { maintenanceForecast, maintenanceState } from '../lib/logic/flota.js';
import { Card, Empty, ErrorState, Loading, StatCard } from '../components/ui.jsx';
import { MaintenanceBadge, RiskBadge, StatusBadge } from '../components/Badges.jsx';

const STATE_STYLE = {
  vencido: { label: 'Vencido', color: '#dc2626', badge: 'bg-red-100 text-red-800' },
  proximo: { label: 'Próximo (<50 h)', color: '#d97706', badge: 'bg-amber-100 text-amber-800' },
  ok: { label: 'Al día', color: '#16a34a', badge: 'bg-green-100 text-green-800' },
};

export function Maintenance() {
  const { data: forecast = [], isLoading, error, refetch } = useMaintenance();
  const { data: machines = [] } = useMachines();
  const [zoneFilter, setZoneFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // Si /maintenance/forecast devuelve 404 temporalmente en un backend parcial pero /machines existe, respalda con cálculo local
  const usingFallback = !!error && error.status === 404 && machines.length > 0;

  const rows = useMemo(() => {
    const machineMap = Object.fromEntries(machines.map((m) => [m.machineId, m]));
    const source = forecast.length ? forecast : usingFallback || !isLoading ? maintenanceForecast(machines) : [];
    return source
      .map((r) => {
        const m = machineMap[r.machineId];
        const hoursToMaint = r.hoursToMaint ?? m?.hoursToMaint ?? null;
        const st = r.state || maintenanceState(hoursToMaint) || 'ok';
        return {
          ...r,
          model: r.model || m?.model,
          zone: r.zone || m?.zone,
          hours: m?.hours ?? r.hours,
          lastMaintHours: m?.lastMaintHours,
          maintIntervalH: m?.maintIntervalH,
          status: m?.status,
          riskScore: m?.riskScore,
          hoursToMaint,
          state: st,
          meta: STATE_STYLE[st] || STATE_STYLE.ok,
        };
      })
      .sort((a, b) => (a.hoursToMaint ?? 9999) - (b.hoursToMaint ?? 9999));
  }, [forecast, machines, usingFallback, isLoading]);

  const zones = useMemo(
    () => [...new Set(rows.map((r) => r.zone).filter(Boolean))].sort(),
    [rows],
  );

  const overdueCount = rows.filter((r) => r.state === 'vencido').length;
  const soonCount = rows.filter((r) => r.state === 'proximo').length;
  const okCount = rows.filter((r) => r.state === 'ok').length;

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => (!zoneFilter || r.zone === zoneFilter) && (!stateFilter || r.state === stateFilter),
      ),
    [rows, zoneFilter, stateFilter],
  );

  const toggleState = (st) => setStateFilter((prev) => (prev === st ? '' : st));

  if (isLoading && !rows.length && !usingFallback) {
    return <Loading label="Cargando pronóstico de mantenimiento…" />;
  }
  if (error && !usingFallback) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pronóstico de Mantenimiento Preventivo</h1>
          <p className="text-xs text-slate-500">
            Horas restantes ajustadas por factor de desgaste (riesgo reciente) para intervenir antes de una falla crítica
          </p>
        </div>
      </div>

      {usingFallback && (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          El endpoint <code>/maintenance/forecast</code> devolvió 404; mostrando pronóstico calculado con los datos actuales de flota.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Mantenimiento vencido"
          value={overdueCount}
          color="#dc2626"
          hint={stateFilter === 'vencido' ? 'Filtro activo (clic para quitar)' : 'Clic para filtrar'}
          active={stateFilter === 'vencido'}
          onClick={() => toggleState('vencido')}
        />
        <StatCard
          label="Próximo (<50 h)"
          value={soonCount}
          color="#d97706"
          hint={stateFilter === 'proximo' ? 'Filtro activo (clic para quitar)' : 'Programar intervención'}
          active={stateFilter === 'proximo'}
          onClick={() => toggleState('proximo')}
        />
        <StatCard
          label="Al día (≥50 h)"
          value={okCount}
          color="#16a34a"
          hint={stateFilter === 'ok' ? 'Filtro activo (clic para quitar)' : 'Sin urgencia'}
          active={stateFilter === 'ok'}
          onClick={() => toggleState('ok')}
        />
        <StatCard label="Equipos evaluados" value={rows.length} color="#2563eb" hint="Ordenados por prioridad" />
      </div>

      {filtered.length > 0 && (
        <Card title="Horas restantes hasta el próximo mantenimiento">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filtered} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="machineId" tick={{ fontSize: 11 }} />
                <YAxis unit=" h" tick={{ fontSize: 11 }} />
                <ReferenceLine y={50} stroke="#d97706" strokeDasharray="4 4" />
                <ReferenceLine y={0} stroke="#dc2626" />
                <ChartTooltip formatter={(v) => [`${formatNumber(v)} h`, 'Horas restantes']} />
                <Bar dataKey="hoursToMaint" name="Horas restantes" radius={[4, 4, 0, 0]}>
                  {filtered.map((r) => (
                    <Cell key={r.machineId} fill={r.meta.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card
        title={`Cola de mantenimiento (${filtered.length})`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por zona"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
            >
              <option value="">Todas las zonas</option>
              {zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <select
              aria-label="Filtrar por estado de mantenimiento"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
            >
              <option value="">Todos los estados</option>
              <option value="vencido">Vencido</option>
              <option value="proximo">Próximo (&lt;50 h)</option>
              <option value="ok">Al día</option>
            </select>
          </div>
        }
        bodyClassName="p-0"
      >
        {filtered.length ? (
          <div tabIndex={0} role="region" aria-labelledby="maintenance-table-caption" className="responsive-table-wrap">
            <table className="responsive-table maint-table w-full text-left text-sm">
              <caption id="maintenance-table-caption" className="sr-only">
                Pronóstico de mantenimiento preventivo ordenado por urgencia
              </caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Máquina</th>
                  <th scope="col" className="px-4 py-2.5">Modelo / Zona</th>
                  <th scope="col" className="px-4 py-2.5">Estado operativo</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Horas totales</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Horas restantes</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Riesgo</th>
                  <th scope="col" className="px-4 py-2.5">Mantenimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.machineId} className="hover:bg-slate-50">
                    <th scope="row" className="px-4 py-2.5 font-semibold">
                      <Link to={`/maquinas/${r.machineId}`} className="text-indigo-700 hover:underline">
                        {r.machineId}
                      </Link>
                    </th>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {MODELS[r.model] || r.model} ({r.model}) · {r.zone}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.status ? <StatusBadge status={r.status} /> : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {r.hours != null ? `${formatNumber(r.hours)} h` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {r.hoursToMaint != null ? `${formatNumber(r.hoursToMaint)} h` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.riskScore != null ? <RiskBadge score={r.riskScore} /> : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <MaintenanceBadge hoursToMaint={r.hoursToMaint} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No hay máquinas para los filtros seleccionados.</Empty>
        )}
      </Card>
    </div>
  );
}
