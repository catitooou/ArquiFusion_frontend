// Backend simulado en memoria. Respeta los contratos de la sección 5 y emula el
// Step Function de incidentes (sección 7.5) y la sincronización a Firestore (7.4).
// Solo se usa cuando VITE_USE_MOCK=true.
import machinesSeed from '../mocks/machines.json';
import incidentsSeed from '../mocks/incidents.json';
import techniciansSeed from '../mocks/technicians.json';
import partsSeed from '../mocks/parts.json';
import partsDemandSeed from '../mocks/partsDemand.json';
import productivitySeed from '../mocks/productivity.json';
import commonCausesSeed from '../mocks/commonCauses.json';
import { rankTechnicians } from '../lib/logic/tecnicos.js';
import { checkParts } from '../lib/logic/repuestos.js';
import { dashboardSummary, maintenanceForecast, productivityRanking } from '../lib/logic/flota.js';
import { severityFromRisk, INCIDENT_THRESHOLD, FAULT_TYPE } from '../lib/constants.js';

const clone = (x) => structuredClone(x);
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE = {
  'EX-320': { temp: 85, vibration: 3.5, pressure: 180, fuel_lph: 28, rpm: 1800, load_kg: 9000, speed_kmh: 6 },
  'CT-740': { temp: 88, vibration: 4.0, pressure: 160, fuel_lph: 55, rpm: 1900, load_kg: 40000, speed_kmh: 25 },
  'CG-210': { temp: 82, vibration: 3.0, pressure: 170, fuel_lph: 22, rpm: 1700, load_kg: 6000, speed_kmh: 10 },
};

// Deriva por escenario (sección 10.1), por tick de simulación
const DRIFT = {
  motor: { temp: 2.4, vibration: 0.36, fuel_lph: 0.45 },
  hidraulico: { pressure: -6 },
  combustible: { fuel_lph: 1.6 },
};

const SCENARIOS = {
  falla_motor: { label: 'Falla de motor (EXC-014)', machines: ['EXC-014'], faultType: 'motor' },
  falla_zona_norte: { label: 'Falla en ZONA-NORTE (causa común)', machines: ['CAM-003', 'CAR-005', 'EXC-021'], faultType: 'combustible' },
  falla_hidraulica: { label: 'Falla hidráulica (EXC-002)', machines: ['EXC-002'], faultType: 'hidraulico' },
};

// ---------------- estado ----------------
const state = {
  machines: clone(machinesSeed),
  incidents: clone(incidentsSeed),
  technicians: clone(techniciansSeed),
  parts: clone(partsSeed),
  partsDemand: clone(partsDemandSeed),
  productivity: clone(productivitySeed),
  commonCauses: clone(commonCausesSeed),
  telemetry: {}, // machineId -> lecturas (máx 60)
  drifting: {}, // machineId -> { faultType, ticks }
  alerts: [],
  seq: 10,
};

const listeners = new Set();
const emit = (evt) => listeners.forEach((fn) => fn(evt));
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Historial inicial de telemetría para los gráficos
for (const m of state.machines) {
  const base = BASE[m.model];
  const arr = [];
  for (let i = 59; i >= 0; i--) {
    const r = { ts: new Date(Date.now() - i * 10000).toISOString() };
    for (const k of Object.keys(base)) {
      const target = m.last[k];
      r[k] = +(target * (1 + (Math.random() * 2 - 1) * 0.03) * (1 - i * 0.0006)).toFixed(1);
    }
    arr.push(r);
  }
  state.telemetry[m.machineId] = arr;
}

const getMachine = (id) => state.machines.find((m) => m.machineId === id);
const getIncident = (id) => state.incidents.find((i) => i.incidentId === id);
const getTech = (id) => state.technicians.find((t) => t.techId === id);
const publicIncident = (i) => {
  if (!i) return i;
  const { taskToken, executionArn, ...rest } = i;
  void taskToken; void executionArn;
  return rest;
};

// ---------------- motor de simulación ----------------
function tick() {
  for (const m of state.machines) {
    const working = m.status === 'operativa' || m.status === 'requiere_intervencion';
    if (!working) continue;
    const base = BASE[m.model];
    const d = state.drifting[m.machineId];
    const reading = { ts: nowIso() };
    for (const k of Object.keys(base)) {
      let v = m.last[k];
      if (d && DRIFT[d.faultType]?.[k]) v += m.openIncidentId ? 0 : DRIFT[d.faultType][k];
      else v = v + (base[k] - v) * 0.15; // vuelve hacia su línea base
      v = v * (1 + (Math.random() * 2 - 1) * 0.015);
      reading[k] = +v.toFixed(1);
    }
    m.last = { ...reading };
    delete m.last.ts;
    m.lastReadingAt = reading.ts;
    m.hours = +(m.hours + 0.003).toFixed(3);
    const arr = state.telemetry[m.machineId];
    arr.push(reading);
    if (arr.length > 60) arr.shift();

    const prevSeverity = m.severity;
    const prevDecile = Math.floor((m.riskScore || 0) / 10);
    if (d && !m.openIncidentId) {
      d.ticks += 1;
      m.riskScore = Math.min(97, m.riskScore + 7);
      m.faultType = d.faultType;
    } else if (!m.openIncidentId) {
      m.riskScore = Math.max(4, Math.round(m.riskScore + (Math.random() * 4 - 2.4)));
    }
    m.severity = severityFromRisk(m.riskScore);
    m.riskUpdatedAt = reading.ts;

    if (prevSeverity !== m.severity || prevDecile !== Math.floor(m.riskScore / 10)) {
      emit({ type: 'machine', machine: clone(m) });
    }
  }
  // Primero causa común por zona (problema 11), luego incidentes individuales
  const hot = state.machines.filter((m) => m.riskScore >= INCIDENT_THRESHOLD && !m.openIncidentId && state.drifting[m.machineId]);
  for (const zone of new Set(hot.map((m) => m.zone))) checkCommonCause(zone);
  for (const m of hot) {
    if (!m.openIncidentId) startIncidentFlow([m.machineId], { faultType: state.drifting[m.machineId].faultType });
  }
  emit({ type: 'tick' });
}

let timer = null;
function ensureRunning() {
  if (!timer) timer = setInterval(tick, 3000);
}
ensureRunning();

function checkCommonCause(zone) {
  const hot = state.machines.filter(
    (m) => m.zone === zone && m.riskScore >= INCIDENT_THRESHOLD && !m.openIncidentId && state.drifting[m.machineId],
  );
  if (hot.length < 3) return;
  const groupId = `${zone}#${nowIso().slice(0, 13)}`;
  if (state.commonCauses.some((c) => c.groupId === groupId)) return;
  const cc = {
    groupId, zone, machineIds: hot.map((m) => m.machineId), windowStart: nowIso(), createdAt: nowIso(),
    active: true, suspectedCause: 'Consumo de combustible anómalo simultáneo: posible lote de combustible contaminado.',
  };
  state.commonCauses.unshift(cc);
  emit({ type: 'commonCause', commonCause: clone(cc) });
  startIncidentFlow(cc.machineIds, { faultType: 'combustible', groupId });
}

const RULE_TEMPLATES = {
  motor: {
    diagnostico_probable: 'Sobrecalentamiento progresivo del motor con aumento de vibración: posible desgaste de rodamientos y falla de refrigeración.',
    acciones_recomendadas: ['Reducir la carga de inmediato', 'Revisar nivel de refrigerante y radiador', 'Inspeccionar rodamientos del motor'],
    repuestos_sugeridos: ['Rodamiento de motor', 'Sensor de temperatura', 'Filtro de aceite'],
  },
  hidraulico: {
    diagnostico_probable: 'Caída sostenida de presión hidráulica: probable fuga en manguera o sello del circuito principal.',
    acciones_recomendadas: ['Detener movimientos hidráulicos', 'Inspeccionar mangueras de alta presión', 'Revisar sellos y bomba'],
    repuestos_sugeridos: ['Manguera hidráulica', 'Sello hidráulico'],
  },
  combustible: {
    diagnostico_probable: 'Consumo de combustible muy por encima de sus pares sin aumento de carga: inyectores o filtro saturado.',
    acciones_recomendadas: ['Verificar calidad del combustible', 'Cambiar filtro de combustible', 'Revisar inyectores'],
    repuestos_sugeridos: ['Filtro de combustible', 'Inyector'],
  },
  electrico: {
    diagnostico_probable: 'RPM inestables: posible falla del sensor de rpm o del alternador.',
    acciones_recomendadas: ['Revisar conexiones eléctricas', 'Medir salida del alternador'],
    repuestos_sugeridos: ['Sensor de rpm', 'Alternador'],
  },
  general: {
    diagnostico_probable: 'Comportamiento atípico multivariable sin patrón claro.',
    acciones_recomendadas: ['Inspección general'],
    repuestos_sugeridos: ['Kit de inspección'],
  },
};

const VAR_BY_FAULT = { motor: ['temp', 'vibration', 'fuel_lph'], hidraulico: ['pressure'], combustible: ['fuel_lph'], electrico: ['rpm'], general: ['temp'] };

function deviatedVariables(m, faultType) {
  const base = BASE[m.model];
  return (VAR_BY_FAULT[faultType] || ['temp']).map((k) => {
    const value = m.last[k];
    const z = +(((value - base[k]) / (base[k] * 0.04)) * 0.6745).toFixed(1);
    return { name: k, value, baseline: base[k], z, peerDeviation: Math.abs(z) > 2 };
  });
}

function nextIncidentId() {
  const d = nowIso().slice(0, 10).replaceAll('-', '');
  state.seq += 1;
  return `INC-${d}-${String(state.seq).padStart(4, '0')}`;
}

async function startIncidentFlow(machineIds, { faultType, groupId = null }) {
  const main = getMachine(machineIds[0]);
  const id = nextIncidentId();
  const riskScore = Math.max(...machineIds.map((mid) => getMachine(mid).riskScore));
  const recurrence = state.incidents.some(
    (i) => i.machineIds.includes(main.machineId) && i.faultType === faultType && Date.now() - Date.parse(i.createdAt) < 30 * 86400000,
  );
  const inc = {
    incidentId: id, type: machineIds.length > 1 ? 'grupal' : 'individual', machineIds, zone: main.zone,
    severity: severityFromRisk(riskScore), status: 'abierto', riskScore, faultType,
    variables: deviatedVariables(main, faultType), createdAt: nowIso(), resolvedAt: null, downtimeMin: null,
    technicianId: null, etaMin: null, partsUsed: [], partsMissing: [], aiDiagnosis: null,
    messages: null, timeline: [], isRecurrence: recurrence, commonCauseId: groupId, taskToken: 'mock-token',
  };
  const push = (type, text) => {
    inc.timeline.push({ ts: nowIso(), type, text });
    emit({ type: 'incident', incident: publicIncident(clone(inc)) });
  };
  // 1 CreateIncident (+ escritura condicional de openIncidentId)
  for (const mid of machineIds) {
    const m = getMachine(mid);
    m.openIncidentId = id;
    emit({ type: 'machine', machine: clone(m) });
  }
  state.incidents.unshift(inc);
  push('creado', `Anomalía detectada (riesgo ${riskScore})${inc.type === 'grupal' ? ` en ${machineIds.length} máquinas de ${inc.zone}` : ''}. Incidente creado.`);
  if (recurrence) push('creado', 'Reincidencia: falla similar en los últimos 30 días.');

  // 3 GenerateDiagnosis
  await sleep(1800);
  inc.aiDiagnosis = clone(RULE_TEMPLATES[faultType] || RULE_TEMPLATES.general);
  push('diagnostico', `Diagnóstico IA: ${inc.aiDiagnosis.diagnostico_probable}`);

  // 4 Parallel: AssignTechnician || CheckParts
  await sleep(1500);
  const { winner, sinDisponibles } = rankTechnicians(state.technicians, { lat: main.lat, lng: main.lng, faultType });
  if (winner) {
    inc.technicianId = winner.techId;
    inc.etaMin = winner.etaMin;
    getTech(winner.techId).activeIncidents += 1;
    push('tecnico_asignado', `Asignado ${winner.name} (ETA ${winner.etaMin} min)${sinDisponibles ? ' · sin técnicos disponibles, se eligió el de menor carga' : ''}.`);
  }
  const parts = checkParts(state.parts, faultType);
  state.parts = parts.parts;
  inc.partsUsed = parts.partsUsed;
  inc.partsMissing = parts.partsMissing;
  const name = (pid) => state.parts.find((p) => p.partId === pid)?.name || pid;
  push('repuestos', `Reservados: ${parts.partsUsed.map(name).join(', ') || 'ninguno'}.${parts.partsMissing.length ? ` Alerta de reposición: ${parts.partsMissing.map(name).join(', ')}.` : ''}`);

  // 5 Parallel: NotifyRoles
  await sleep(1200);
  const tech = winner ? getTech(winner.techId) : null;
  const ids = machineIds.join(', ');
  inc.messages = {
    operador: `${ids}: ${FAULT_TYPE[faultType].toLowerCase()} con riesgo ${inc.severity}. ${inc.aiDiagnosis.acciones_recomendadas[0]}. Técnico en camino (ETA ${inc.etaMin} min).`,
    tecnico: `${ids} (${inc.zone}): ${inc.aiDiagnosis.diagnostico_probable} Lleva: ${inc.aiDiagnosis.repuestos_sugeridos.join(', ')}. Ubicación: ${main.lat.toFixed(4)}, ${main.lng.toFixed(4)}.`,
    gerente: `Riesgo ${inc.severity.toUpperCase()} en ${ids} (${inc.zone}). ${inc.type === 'grupal' ? 'Posible causa común en la zona. ' : ''}Asignado ${tech?.name || '—'}.${inc.partsMissing.length ? ' Hay repuestos bajo stock mínimo.' : ''}`,
  };
  const roles = ['operador', 'tecnico'].concat(['alta', 'critica'].includes(inc.severity) || inc.type === 'grupal' ? ['gerente'] : []);
  push('notificado', `Notificados: ${roles.join(', ')} (SNS email + Azure Function).`);
  const alert = {
    id: `ALR-${Date.now()}`, incidentId: id, machineIds, severity: inc.severity, roles,
    technicianId: inc.technicianId, messages: inc.messages, createdAt: nowIso(),
  };
  state.alerts.unshift(alert);
  emit({ type: 'alert', alert: clone(alert) });

  // 6 UpdateIncident
  inc.status = 'en_atencion';
  for (const mid of machineIds) {
    const m = getMachine(mid);
    m.status = 'requiere_intervencion';
    emit({ type: 'machine', machine: clone(m) });
  }
  emit({ type: 'incident', incident: publicIncident(clone(inc)) });
  // 7 WaitForResolution: queda esperando POST /incidents/{id}/resolve
}

// ---------------- API simulada ----------------
class MockError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function routeMatch(pattern, path) {
  const p = pattern.split('/'); const a = path.split('/');
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

const routes = [
  ['GET', '/machines', (_, q) => state.machines.filter((m) => !q.zone || m.zone === q.zone)],
  ['GET', '/machines/:id', ({ id }) => getMachine(id) || notFound('Máquina')],
  ['GET', '/machines/:id/risk', ({ id }) => {
    const m = getMachine(id) || notFound('Máquina');
    const base = BASE[m.model];
    const peers = state.machines.filter((x) => x.model === m.model && x.machineId !== id && x.status !== 'detenida');
    const variables = ['temp', 'vibration', 'pressure', 'fuel_lph'].map((k) => {
      const z = +(((m.last[k] - base[k]) / (base[k] * 0.04)) * 0.6745).toFixed(1);
      const peerAvg = peers.length ? peers.reduce((s, p) => s + p.last[k], 0) / peers.length : null;
      return {
        name: k, value: m.last[k], baseline: base[k], z,
        peerAvg: peerAvg && +peerAvg.toFixed(1),
        peerDeviation: peers.length >= 3 && peerAvg && Math.abs(m.last[k] - peerAvg) > base[k] * 0.08,
      };
    });
    return { machineId: id, riskScore: m.riskScore, severity: m.severity, faultType: m.faultType, variables, hoursToMaint: m.hoursToMaint, riskUpdatedAt: m.riskUpdatedAt };
  }],
  ['GET', '/machines/:id/telemetry', ({ id }) => state.telemetry[id] || []],
  ['GET', '/machines/:id/incidents', ({ id }) => state.incidents.filter((i) => i.machineIds.includes(id)).map(publicIncident)],
  ['GET', '/fleet/productivity', () => productivityRanking(state.productivity)],
  ['GET', '/dashboard/summary', () => dashboardSummary(state.machines, state.incidents)],
  ['GET', '/maintenance/forecast', () => maintenanceForecast(state.machines)],
  ['GET', '/common-causes', () => state.commonCauses],
  ['GET', '/incidents', (_, q) => state.incidents
    .filter((i) => (!q.status || i.status === q.status) && (!q.severity || i.severity === q.severity) && (!q.technicianId || i.technicianId === q.technicianId))
    .map(publicIncident)],
  ['GET', '/incidents/:id', ({ id }) => publicIncident(getIncident(id)) || notFound('Incidente')],
  ['POST', '/incidents/:id/resolve', ({ id }, _, body) => {
    const inc = getIncident(id) || notFound('Incidente');
    if (inc.status === 'resuelto') throw new MockError(409, 'ALREADY_RESOLVED', 'El incidente ya estaba resuelto');
    inc.status = 'resuelto';
    inc.resolvedAt = nowIso();
    inc.downtimeMin = Math.max(1, Math.round((Date.parse(inc.resolvedAt) - Date.parse(inc.createdAt)) / 60000));
    if (body?.notes) inc.resolutionNotes = body.notes;
    const tech = getTech(inc.technicianId);
    if (tech) tech.activeIncidents = Math.max(0, tech.activeIncidents - 1);
    inc.timeline.push({ ts: nowIso(), type: 'resuelto', text: `Resuelto por ${tech?.name || 'técnico'}. Parada: ${inc.downtimeMin} min.` });
    for (const mid of inc.machineIds) {
      const m = getMachine(mid);
      delete state.drifting[mid];
      Object.assign(m, { status: 'operativa', openIncidentId: null, riskScore: 12, severity: null, faultType: null, last: { ...BASE[m.model] } });
      emit({ type: 'machine', machine: clone(m) });
    }
    state.commonCauses.forEach((c) => { if (c.groupId === inc.commonCauseId) c.active = false; });
    emit({ type: 'incident', incident: publicIncident(clone(inc)) });
    return publicIncident(inc);
  }],
  ['PATCH', '/incidents/:id/assign', ({ id }, _, body) => {
    const inc = getIncident(id) || notFound('Incidente');
    const next = getTech(body?.techId) || notFound('Técnico');
    const prev = getTech(inc.technicianId);
    if (prev) prev.activeIncidents = Math.max(0, prev.activeIncidents - 1);
    next.activeIncidents += 1;
    const m = getMachine(inc.machineIds[0]);
    const ranked = rankTechnicians([{ ...next, available: true }], { lat: m.lat, lng: m.lng, faultType: inc.faultType });
    inc.technicianId = next.techId;
    inc.etaMin = ranked.winner.etaMin;
    inc.timeline.push({ ts: nowIso(), type: 'reasignado', text: `Reasignado de ${prev?.name || '—'} a ${next.name} (ETA ${inc.etaMin} min). Técnico notificado.` });
    emit({ type: 'incident', incident: publicIncident(clone(inc)) });
    return publicIncident(inc);
  }],
  ['GET', '/incidents/:id/suggestions', ({ id }) => {
    const inc = getIncident(id) || notFound('Incidente');
    const m = getMachine(inc.machineIds[0]);
    const { winner, alternatives } = rankTechnicians(state.technicians, { lat: m.lat, lng: m.lng, faultType: inc.faultType });
    return [winner, ...alternatives].filter(Boolean).map((s) => ({ ...s, ...pickTech(s.techId) }));
  }],
  ['GET', '/technicians', () => state.technicians],
  ['PATCH', '/technicians/:id', ({ id }, _, body) => {
    const t = getTech(id) || notFound('Técnico');
    if (typeof body?.available === 'boolean') t.available = body.available;
    return t;
  }],
  ['GET', '/parts', () => state.parts],
  ['GET', '/parts/demand', () => state.partsDemand],
  ['POST', '/parts/:id/restock', ({ id }, _, body) => {
    const p = state.parts.find((x) => x.partId === id && (!body?.locationId || x.locationId === body.locationId)) || notFound('Repuesto');
    p.stock += Number(body?.qty) || 5;
    return p;
  }],
  ['POST', '/ai/ask', (_, __, body) => askManager(body?.question || '')],
];

function pickTech(id) {
  const t = getTech(id);
  return t ? { specialty: t.specialty, activeIncidents: t.activeIncidents, experienceYears: t.experienceYears, available: t.available, zone: t.zone } : {};
}

function notFound(what) {
  throw new MockError(404, 'NOT_FOUND', `${what} no encontrado`);
}

function askManager(question) {
  const top = [...state.machines].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);
  const open = state.incidents.filter((i) => i.status !== 'resuelto');
  const low = state.parts.filter((p) => p.stock < p.minStock);
  const answer = [
    `Resumen para: "${question}"`,
    `• Máquinas de mayor riesgo: ${top.map((m) => `${m.machineId} (${m.riskScore})`).join(', ')}.`,
    `• Incidentes abiertos: ${open.length}${open.length ? ` (${open.map((i) => `${i.incidentId} en ${i.machineIds.join('/')}`).join('; ')})` : ''}.`,
    `• Repuestos bajo stock mínimo: ${low.map((p) => p.name).join(', ') || 'ninguno'}.`,
    `Recomendación: priorizar ${top[0].machineId} y reponer ${low[0]?.name || 'stock crítico'}.`,
  ].join('\n');
  return { answer, provider: 'rules (mock)' };
}

export async function mockRequest(method, url, body) {
  await sleep(120 + Math.random() * 180); // latencia realista
  const [path, qs = ''] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue;
    const params = routeMatch(pattern, path);
    if (!params) continue;
    return clone(handler(params, query, body));
  }
  throw new MockError(404, 'ROUTE_NOT_FOUND', `${method} ${path} no existe en el mock`);
}

// ---------------- controles de simulación (solo demo) ----------------
export const scenarios = Object.entries(SCENARIOS).map(([id, s]) => ({ id, ...s }));

export function runScenario(id) {
  const s = SCENARIOS[id];
  if (!s) return;
  for (const mid of s.machines) {
    const m = getMachine(mid);
    if (m.openIncidentId) continue;
    m.status = 'operativa';
    m.riskScore = 32;
    state.drifting[mid] = { faultType: s.faultType, ticks: 0 };
  }
  ensureRunning();
}

export function getAlerts() {
  return clone(state.alerts);
}
