import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIncident, useIncidents, useTechnicians } from '../hooks/useData.js';
import { Card, Empty, ErrorState, Loading } from '../components/ui.jsx';
import { IncidentList } from '../components/IncidentList.jsx';
import { IncidentDetail } from '../components/IncidentDetail.jsx';

export function Incidents() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: incidents = [], isLoading, error, refetch } = useIncidents();
  const { data: detail } = useIncident(id);
  const { data: technicians = [] } = useTechnicians();

  const [statusFilter, setStatusFilter] = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return incidents.filter((inc) => {
      if (statusFilter && inc.status !== statusFilter) return false;
      if (sevFilter && inc.severity !== sevFilter) return false;
      if (!q) return true;
      return (
        inc.incidentId.toLowerCase().includes(q) ||
        inc.zone.toLowerCase().includes(q) ||
        inc.machineIds?.some((m) => m.toLowerCase().includes(q))
      );
    });
  }, [incidents, statusFilter, sevFilter, search]);

  const selected = useMemo(() => {
    if (id) return detail || incidents.find((i) => i.incidentId === id) || null;
    return filtered[0] || incidents[0] || null;
  }, [id, detail, incidents, filtered]);

  if (isLoading && !incidents.length) return <Loading label="Cargando incidentes…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="flex min-h-full flex-col gap-3 p-3 sm:p-4 lg:h-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Historial y Gestión de Incidentes</h1>
          <p className="text-xs text-slate-500">
            Diagnóstico generado por IA, asignación de técnicos, repuestos y línea de tiempo completa
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar máquina, ID o zona…"
            aria-label="Buscar incidente"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          />
          <select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="abierto">Abierto</option>
            <option value="en_atencion">En atención</option>
            <option value="resuelto">Resuelto</option>
            <option value="error_flujo">Error de flujo</option>
          </select>
          <select
            aria-label="Filtrar por severidad"
            value={sevFilter}
            onChange={(e) => setSevFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
          >
            <option value="">Todas las severidades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
          </select>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        <Card
          title={`Incidentes (${filtered.length})`}
          className="min-h-72 max-h-96 lg:col-span-4 lg:max-h-none"
          bodyClassName="min-h-0 flex-1 overflow-y-auto p-0"
        >
          {filtered.length ? (
            <IncidentList
              incidents={filtered}
              selectedId={selected?.incidentId}
              technicians={technicians}
              onSelect={(inc) => navigate(`/incidentes/${inc.incidentId}`)}
            />
          ) : (
            <Empty>No se encontraron incidentes con esos criterios.</Empty>
          )}
        </Card>

        <Card
          title={selected ? `Detalle · ${selected.incidentId}` : 'Detalle'}
          className="min-h-80 lg:col-span-8"
          bodyClassName="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"
        >
          {selected ? (
            <IncidentDetail incident={selected} />
          ) : (
            <Empty>Selecciona un incidente de la lista.</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}
