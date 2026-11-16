import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMachines, useProductivity } from '../hooks/useData.js';
import { MODELS } from '../lib/constants.js';
import { formatNumber, pct } from '../lib/format.js';
import { productivityRanking } from '../lib/logic/flota.js';
import { Card, ErrorState, Loading, StatCard } from '../components/ui.jsx';
import { StatusBadge } from '../components/Badges.jsx';

const MODEL_EXPECTED_FUEL_PER_ACTIVE_H = {
  'EX-320': 28,
  'CT-740': 55,
  'CG-210': 22,
};

function classifyMachine(row) {
  const activeHours = (row.activeReadings || 0) / 360;
  const fuelPerHour = activeHours > 0 ? row.fuelSum / activeHours : 0;
  const expected = MODEL_EXPECTED_FUEL_PER_ACTIVE_H[row.model] || 30;
  const highFuel = fuelPerHour > expected * 1.15;

  if (row.utilization < 0.35 && highFuel) {
    return { label: 'Baja prod. + alto costo', badge: 'bg-red-100 text-red-800', color: '#dc2626' };
  }
  if (row.utilization < 0.35) {
    return { label: 'Baja utilización', badge: 'bg-amber-100 text-amber-800', color: '#d97706' };
  }
  if (row.utilization > 0.85) {
    return { label: 'Sobrecargada (>85%)', badge: 'bg-orange-100 text-orange-800', color: '#ea580c' };
  }
  return { label: 'Eficiente', badge: 'bg-green-100 text-green-800', color: '#16a34a' };
}

export function Productivity() {
  const { data: rows = [], isLoading, error, refetch } = useProductivity();
  const { data: machines = [] } = useMachines();

  const ranked = useMemo(() => {
    const machineMap = Object.fromEntries(machines.map((m) => [m.machineId, m]));
    return productivityRanking(rows).map((r) => ({
      ...r,
      utilPct: Math.round(r.utilization * 100),
      status: machineMap[r.machineId]?.status,
      diag: classifyMachine(r),
    }));
  }, [rows, machines]);

  const avgUtil = ranked.length
    ? ranked.reduce((s, r) => s + r.utilization, 0) / ranked.length
    : 0;
  const underUtilized = ranked.filter((r) => r.utilization < 0.35).length;
  const overloaded = ranked.filter((r) => r.utilization > 0.85).length;
  const lowProdHighCost = ranked.filter((r) => r.diag.label.startsWith('Baja prod.')).length;

  if (isLoading && !rows.length) return <Loading label="Cargando productividad de la flota…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Productividad y Utilización de la Flota</h1>
        <p className="text-xs text-slate-500">
          Contadores incrementales FleetKPI (activeReadings / readings) para detectar subutilización, sobrecarga y alto costo operativo
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Utilización promedio" value={pct(avgUtil)} color="#2563eb" hint={`${ranked.length} máquinas`} />
        <StatCard label="Baja utilización (<35%)" value={underUtilized} color="#d97706" hint="Inactivas prolongadas" />
        <StatCard label="Sobrecargadas (>85%)" value={overloaded} color="#ea580c" hint="Riesgo de desgaste acelerado" />
        <StatCard label="Baja prod. + alto costo" value={lowProdHighCost} color="#dc2626" hint="Revisar asignación" />
      </div>

      <Card title="Porcentaje de utilización por máquina">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ranked} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="machineId" tick={{ fontSize: 11 }} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <ChartTooltip formatter={(v) => [`${v}%`, 'Utilización']} />
              <Bar dataKey="utilPct" name="Utilización" radius={[4, 4, 0, 0]}>
                {ranked.map((r) => (
                  <Cell key={r.machineId} fill={r.diag.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Ranking operativo de la flota" bodyClassName="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Máquina</th>
              <th className="px-4 py-2.5">Modelo / Zona</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Utilización</th>
              <th className="px-4 py-2.5 text-right">Lecturas activas</th>
              <th className="px-4 py-2.5 text-right">Combustible hoy</th>
              <th className="px-4 py-2.5">Clasificación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ranked.map((r) => (
              <tr key={r.machineId} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-semibold">
                  <Link to={`/maquinas/${r.machineId}`} className="text-indigo-700 hover:underline">
                    {r.machineId}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-600">
                  {MODELS[r.model] || r.model} ({r.model}) · {r.zone}
                </td>
                <td className="px-4 py-2.5">{r.status && <StatusBadge status={r.status} />}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${r.utilPct}%`, background: r.diag.color }}
                      />
                    </div>
                    <span className="font-semibold tabular-nums">{r.utilPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-600">
                  {formatNumber(r.activeReadings)} / {formatNumber(r.readings)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(r.fuelSum)} L</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.diag.badge}`}>
                    {r.diag.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
