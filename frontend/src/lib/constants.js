// Enums y estilos compartidos (sección 5.2 y 8.5 de la documentación)

export const MACHINE_STATUS = {
  operativa: { label: 'Operativa', color: '#16a34a', badge: 'bg-green-100 text-green-800 ring-green-600/20' },
  detenida: { label: 'Detenida', color: '#6b7280', badge: 'bg-gray-100 text-gray-700 ring-gray-500/20' },
  requiere_intervencion: { label: 'Requiere intervención', color: '#dc2626', badge: 'bg-red-100 text-red-800 ring-red-600/20' },
  mantenimiento: { label: 'Mantenimiento', color: '#2563eb', badge: 'bg-blue-100 text-blue-800 ring-blue-600/20' },
};

export const SEVERITY = {
  baja: { label: 'Vigilancia', color: '#0891b2', badge: 'bg-cyan-50 text-cyan-800 ring-cyan-600/20' },
  media: { label: 'Media', color: '#eab308', badge: 'bg-yellow-100 text-yellow-800 ring-yellow-600/30' },
  alta: { label: 'Alta', color: '#f97316', badge: 'bg-orange-100 text-orange-800 ring-orange-600/30' },
  critica: { label: 'Crítica', color: '#991b1b', badge: 'bg-red-800 text-white ring-red-900/30' },
};

export const INCIDENT_STATUS = {
  abierto: { label: 'Abierto', badge: 'bg-amber-100 text-amber-800 ring-amber-600/20' },
  en_atencion: { label: 'En atención', badge: 'bg-indigo-100 text-indigo-800 ring-indigo-600/20' },
  resuelto: { label: 'Resuelto', badge: 'bg-green-100 text-green-800 ring-green-600/20' },
  error_flujo: { label: 'Error de flujo', badge: 'bg-red-100 text-red-800 ring-red-600/20' },
};

export const FAULT_TYPE = {
  motor: 'Motor',
  hidraulico: 'Hidráulico',
  combustible: 'Combustible',
  electrico: 'Eléctrico',
  general: 'General',
};

export const ROLES = {
  operador: { label: 'Operador', home: '/mapa' },
  tecnico: { label: 'Técnico', home: '/mis-tareas' },
  gerente: { label: 'Gerente', home: '/gerente' },
};

export const MODELS = {
  'EX-320': 'Excavadora',
  'CT-740': 'Camión',
  'CG-210': 'Cargador',
};

export const VARIABLES = {
  temp: { label: 'Temperatura', unit: '°C' },
  vibration: { label: 'Vibración', unit: 'mm/s' },
  pressure: { label: 'Presión', unit: 'bar' },
  fuel_lph: { label: 'Combustible', unit: 'L/h' },
  rpm: { label: 'RPM', unit: 'rpm' },
  load_kg: { label: 'Carga', unit: 'kg' },
  speed_kmh: { label: 'Velocidad', unit: 'km/h' },
};

export const TIMELINE_TYPES = {
  creado: { label: 'Creado', color: 'bg-slate-500' },
  diagnostico: { label: 'Diagnóstico IA', color: 'bg-violet-500' },
  tecnico_asignado: { label: 'Técnico asignado', color: 'bg-indigo-500' },
  repuestos: { label: 'Repuestos', color: 'bg-amber-500' },
  notificado: { label: 'Notificado', color: 'bg-sky-500' },
  reasignado: { label: 'Reasignado', color: 'bg-fuchsia-500' },
  resuelto: { label: 'Resuelto', color: 'bg-green-600' },
  error: { label: 'Error', color: 'bg-red-600' },
};

export const INCIDENT_THRESHOLD = 60;

export const severityFromRisk = (r) =>
  r >= 90 ? 'critica' : r >= 75 ? 'alta' : r >= 60 ? 'media' : r >= 40 ? 'baja' : null;

export const MAP_CENTER = [-12.05, -77.01];
