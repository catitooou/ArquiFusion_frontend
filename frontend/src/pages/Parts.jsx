import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useParts, usePartsDemand } from '../hooks/useData.js';
import { partsService } from '../services/parts.js';
import { useToasts } from '../context/ToastContext.jsx';
import { FAULT_TYPE } from '../lib/constants.js';
import { flagIrregular } from '../lib/logic/repuestos.js';
import { Button, Card, Empty, ErrorState, Loading, StatCard } from '../components/ui.jsx';

export function Parts() {
  const qc = useQueryClient();
  const { push } = useToasts();
  const { data: parts = [], isLoading, error, refetch } = useParts();
  const { data: demandRaw = [] } = usePartsDemand();

  const [faultFilter, setFaultFilter] = useState('');
  const [onlyAlerts, setOnlyAlerts] = useState(false);

  const demand = useMemo(() => flagIrregular(demandRaw), [demandRaw]);

  const restock = useMutation({
    mutationFn: ({ partId, locationId, qty }) => partsService.restock(partId, qty, locationId),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['parts'] });
      push({
        title: 'Stock actualizado',
        message: `${updated.name}: ahora hay ${updated.stock} unidades en ${updated.locationId}.`,
      });
    },
    onError: (e) => push({ title: 'Error al reponer', message: e.message, severity: 'alta' }),
  });

  const lowStockCount = parts.filter((p) => p.stock < p.minStock).length;
  const irregularCount = parts.filter((p) => p.irregular).length;
  const total7d = parts.reduce((acc, p) => acc + (p.consumption7d || 0), 0);

  const filteredParts = useMemo(
    () =>
      parts.filter((p) => {
        if (faultFilter && p.faultType !== faultFilter) return false;
        if (onlyAlerts && p.stock >= p.minStock && !p.irregular) return false;
        return true;
      }),
    [parts, faultFilter, onlyAlerts],
  );

  if (isLoading && !parts.length) return <Loading label="Cargando inventario de repuestos…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Repuestos y Demanda</h1>
          <p className="text-xs text-slate-500">
            Control de stock por ubicación, alertas de reposición y detección de consumo irregular (7 días)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Repuestos en catálogo" value={parts.length} hint="Almacén central" />
        <StatCard
          label="Bajo stock mínimo"
          value={lowStockCount}
          color="#dc2626"
          hint="Requieren reposición inmediata"
        />
        <StatCard
          label="Consumo irregular"
          value={irregularCount}
          color="#f97316"
          hint="Supera media + 2σ semanal"
        />
        <StatCard label="Demanda 7 días" value={total7d} color="#2563eb" hint="Unidades consumidas" />
      </div>

      {demand.length > 0 && (
        <Card title="Demanda de los últimos 7 días (rojo = consumo irregular)">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demand} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={55} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip />
                <Bar dataKey="total" name="Consumo 7 días" radius={[4, 4, 0, 0]}>
                  {demand.map((entry) => (
                    <Cell key={entry.partId} fill={entry.irregular ? '#ea580c' : '#334155'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card
        title="Inventario por almacén y sistema"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por tipo de falla"
              value={faultFilter}
              onChange={(e) => setFaultFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
            >
              <option value="">Todos los sistemas</option>
              {Object.entries(FAULT_TYPE).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={onlyAlerts}
                onChange={(e) => setOnlyAlerts(e.target.checked)}
                className="rounded border-slate-300"
              />
              Solo alertas
            </label>
          </div>
        }
        bodyClassName="overflow-x-auto p-0"
      >
        {filteredParts.length ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Repuesto</th>
                <th className="px-4 py-2.5">Sistema</th>
                <th className="px-4 py-2.5">Ubicación</th>
                <th className="px-4 py-2.5 text-right">Stock / Mín</th>
                <th className="px-4 py-2.5 text-right">Consumo 7d</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5 text-right">Costo unit.</th>
                <th className="px-4 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.map((p) => {
                const low = p.stock < p.minStock;
                return (
                  <tr key={`${p.partId}-${p.locationId}`} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.partId}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {FAULT_TYPE[p.faultType] || p.faultType}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{p.locationId}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={low ? 'font-bold text-red-700' : 'font-semibold text-slate-900'}>
                        {p.stock}
                      </span>{' '}
                      <span className="text-xs text-slate-400">/ {p.minStock}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{p.consumption7d}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {low && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            Bajo stock
                          </span>
                        )}
                        {p.irregular && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Irregular
                          </span>
                        )}
                        {!low && !p.irregular && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Óptimo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">${p.unitCost}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="secondary"
                        className="px-2.5 py-1 text-xs"
                        disabled={restock.isPending}
                        onClick={() => restock.mutate({ partId: p.partId, locationId: p.locationId, qty: 5 })}
                      >
                        + Reponer (5)
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Empty>No hay repuestos para el filtro seleccionado.</Empty>
        )}
      </Card>
    </div>
  );
}
