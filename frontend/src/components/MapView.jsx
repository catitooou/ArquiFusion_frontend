import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { MACHINE_STATUS, MAP_CENTER, MODELS } from '../lib/constants.js';
import { RiskBadge, StatusBadge, SeverityBadge } from './Badges.jsx';

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [target?.lat, target?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export function MachineMarker({ machine, selected, highlighted, onSelect }) {
  const st = MACHINE_STATUS[machine.status] || MACHINE_STATUS.operativa;
  const risk = machine.riskScore || 0;
  const hot = risk >= 60 || machine.status === 'requiere_intervencion' || highlighted;
  const radius = 7 + Math.min(risk, 100) / 12 + (selected ? 3 : 0);
  return (
    <>
      {hot && (
        <CircleMarker
          key={`${machine.machineId}-pulse`}
          center={[machine.lat, machine.lng]}
          radius={radius}
          interactive={false}
          pathOptions={{ color: highlighted ? '#7c3aed' : '#dc2626', fill: false, className: 'pulse-marker' }}
        />
      )}
      <CircleMarker
        center={[machine.lat, machine.lng]}
        radius={radius}
        eventHandlers={{ click: () => onSelect?.(machine) }}
        pathOptions={{
          color: selected ? '#0f172a' : '#ffffff',
          weight: selected ? 3 : 2,
          fillColor: st.color,
          fillOpacity: 0.95,
        }}
      >
        <Tooltip direction="top" offset={[0, -radius]}>
          <strong>{machine.machineId}</strong> · riesgo {Math.round(risk)}
        </Tooltip>
        <Popup>
          <div className="min-w-44 space-y-1.5 text-slate-800">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm">{machine.machineId}</strong>
              <RiskBadge score={risk} />
            </div>
            <div className="text-xs text-slate-500">
              {MODELS[machine.model] || machine.model} {machine.model} · {machine.zone}
            </div>
            <div className="flex flex-wrap gap-1">
              <StatusBadge status={machine.status} />
              {machine.severity && <SeverityBadge severity={machine.severity} />}
            </div>
            <Link to={`/maquinas/${machine.machineId}`} className="block text-xs font-medium text-indigo-700 underline">
              Ver detalle
            </Link>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

export function MapLegend() {
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-xs shadow ring-1 ring-slate-200">
      <p className="mb-1 font-semibold text-slate-700">Estado</p>
      <ul className="space-y-0.5">
        {Object.entries(MACHINE_STATUS).map(([k, s]) => (
          <li key={k} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] text-slate-500">Tamaño = riesgo · halo = riesgo ≥ 60</p>
    </div>
  );
}

/**
 * Mapa Leaflet con marcadores por estado (problema 4).
 */
export function MapView({ machines = [], selectedId, highlightIds = [], onSelect, children, className = 'h-full' }) {
  const selected = machines.find((m) => m.machineId === selectedId);
  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <MapContainer center={MAP_CENTER} zoom={11} className="size-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InvalidateOnResize />
        <FlyTo target={selected} />
        {machines
          .filter((m) => m.lat != null && m.lng != null)
          .map((m) => (
            <MachineMarker
              key={m.machineId}
              machine={m}
              selected={m.machineId === selectedId}
              highlighted={highlightIds.includes(m.machineId)}
              onSelect={onSelect}
            />
          ))}
      </MapContainer>
      <MapLegend />
      {children}
    </div>
  );
}
