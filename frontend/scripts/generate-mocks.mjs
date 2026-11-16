// Genera src/mocks/*.json a partir de las secciones 5, 6 y 10 de la documentación.
// Uso: node scripts/generate-mocks.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'mocks');
mkdirSync(out, { recursive: true });

// PRNG determinista para que los mocks no cambien entre ejecuciones
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const noise = (v, pct = 0.03) => +(v * (1 + (rnd() * 2 - 1) * pct)).toFixed(1);

const NOW = '2026-11-14T21:00:00Z';
const minsAgo = (m) => new Date(Date.parse(NOW) - m * 60000).toISOString().replace('.000', '');

const ZONES = {
  'ZONA-NORTE': [-11.98, -77.05],
  'ZONA-SUR': [-12.12, -77.03],
  'ZONA-ESTE': [-12.05, -76.95],
};
const BASE = {
  'EX-320': { temp: 85, vibration: 3.5, pressure: 180, fuel_lph: 28, rpm: 1800, load_kg: 9000, speed_kmh: 6 },
  'CT-740': { temp: 88, vibration: 4.0, pressure: 160, fuel_lph: 55, rpm: 1900, load_kg: 40000, speed_kmh: 25 },
  'CG-210': { temp: 82, vibration: 3.0, pressure: 170, fuel_lph: 22, rpm: 1700, load_kg: 6000, speed_kmh: 10 },
};
const PREFIX = { 'EX-320': 'EXC', 'CT-740': 'CAM', 'CG-210': 'CAR' };

// 15 máquinas: 5 por zona
const plan = [
  ['EXC-014', 'EX-320', 'ZONA-NORTE'], ['CAM-003', 'CT-740', 'ZONA-NORTE'], ['CAR-005', 'CG-210', 'ZONA-NORTE'],
  ['EXC-021', 'EX-320', 'ZONA-NORTE'], ['CAM-009', 'CT-740', 'ZONA-NORTE'],
  ['EXC-002', 'EX-320', 'ZONA-SUR'], ['CAM-007', 'CT-740', 'ZONA-SUR'], ['CAR-011', 'CG-210', 'ZONA-SUR'],
  ['CAR-016', 'CG-210', 'ZONA-SUR'], ['EXC-030', 'EX-320', 'ZONA-SUR'],
  ['EXC-008', 'EX-320', 'ZONA-ESTE'], ['CAM-012', 'CT-740', 'ZONA-ESTE'], ['CAR-001', 'CG-210', 'ZONA-ESTE'],
  ['CAM-018', 'CT-740', 'ZONA-ESTE'], ['CAR-024', 'CG-210', 'ZONA-ESTE'],
];
void PREFIX;

const special = {
  'EXC-014': { riskScore: 48, faultType: 'motor', bump: { temp: 1.08, vibration: 1.25, fuel_lph: 1.1 } }, // en vigilancia
  'CAM-007': { riskScore: 78, faultType: 'hidraulico', status: 'requiere_intervencion', openIncidentId: 'INC-20261114-0002', bump: { pressure: 0.78 } },
  'CAR-016': { status: 'mantenimiento', riskScore: 12 },
  'CAM-018': { status: 'detenida', riskScore: 5 },
  'EXC-008': { riskScore: 35, faultType: 'combustible', bump: { fuel_lph: 1.22 } },
  'CAR-024': { hoursToMaintOverride: 32 }, // próxima a mantenimiento (problema 2)
};

const severityOf = (r) => (r >= 90 ? 'critica' : r >= 75 ? 'alta' : r >= 60 ? 'media' : r >= 40 ? 'baja' : null);

const machines = plan.map(([machineId, model, zone], i) => {
  const sp = special[machineId] || {};
  const [clat, clng] = ZONES[zone];
  const base = BASE[model];
  const status = sp.status || 'operativa';
  const working = status === 'operativa' || status === 'requiere_intervencion';
  const last = {};
  for (const [k, v] of Object.entries(base)) {
    let val = noise(v) * (sp.bump?.[k] || 1);
    if (!working && ['rpm', 'speed_kmh', 'load_kg', 'fuel_lph'].includes(k)) val = 0;
    last[k] = +val.toFixed(1);
  }
  const hours = Math.round(2000 + rnd() * 4000);
  const maintIntervalH = 500;
  const lastMaintHours = hours - Math.round(100 + rnd() * 300);
  const riskScore = sp.riskScore ?? Math.round(5 + rnd() * 22);
  const hoursToMaint = sp.hoursToMaintOverride ?? Math.round(maintIntervalH - (hours - lastMaintHours) * (1 + riskScore / 100));
  return {
    machineId, model, zone,
    lat: +(clat + (rnd() - 0.5) * 0.04).toFixed(5),
    lng: +(clng + (rnd() - 0.5) * 0.04).toFixed(5),
    status, hours, last,
    riskScore, severity: severityOf(riskScore), faultType: sp.faultType || null,
    riskUpdatedAt: minsAgo(1 + i), lastReadingAt: minsAgo(0.2 + i * 0.05),
    lastMaintHours, maintIntervalH, hoursToMaint,
    openIncidentId: sp.openIncidentId || null,
  };
});

const technicians = [
  { techId: 'TEC-01', name: 'Luis Ramírez', zone: 'ZONA-NORTE', specialty: ['motor', 'electrico'], experienceYears: 8, activeIncidents: 0, available: true },
  { techId: 'TEC-02', name: 'María Quispe', zone: 'ZONA-NORTE', specialty: ['hidraulico'], experienceYears: 5, activeIncidents: 0, available: true },
  { techId: 'TEC-03', name: 'Jorge Huamán', zone: 'ZONA-SUR', specialty: ['hidraulico', 'combustible'], experienceYears: 11, activeIncidents: 1, available: true },
  { techId: 'TEC-04', name: 'Ana Torres', zone: 'ZONA-SUR', specialty: ['motor'], experienceYears: 3, activeIncidents: 0, available: true },
  { techId: 'TEC-05', name: 'Carlos Mendoza', zone: 'ZONA-ESTE', specialty: ['electrico', 'combustible'], experienceYears: 6, activeIncidents: 2, available: false },
  { techId: 'TEC-06', name: 'Rosa Paredes', zone: 'ZONA-ESTE', specialty: ['motor', 'hidraulico'], experienceYears: 9, activeIncidents: 0, available: true },
].map((t) => {
  const [clat, clng] = ZONES[t.zone];
  return { ...t, lat: +(clat + (rnd() - 0.5) * 0.05).toFixed(5), lng: +(clng + (rnd() - 0.5) * 0.05).toFixed(5) };
});

const PARTS = [
  ['P-FIL-ACE', 'Filtro de aceite', 'motor', 18, 6, 45],
  ['P-ROD-MOT', 'Rodamiento de motor', 'motor', 4, 3, 320],
  ['P-SEN-TMP', 'Sensor de temperatura', 'motor', 7, 3, 85],
  ['P-MAN-HID', 'Manguera hidráulica', 'hidraulico', 2, 4, 140],
  ['P-SEL-HID', 'Sello hidráulico', 'hidraulico', 12, 5, 30],
  ['P-BOM-HID', 'Bomba hidráulica', 'hidraulico', 1, 2, 1450],
  ['P-INY', 'Inyector', 'combustible', 9, 4, 260],
  ['P-FIL-COM', 'Filtro de combustible', 'combustible', 22, 8, 38],
  ['P-SEN-RPM', 'Sensor de rpm', 'electrico', 5, 2, 95],
  ['P-ALT', 'Alternador', 'electrico', 3, 2, 780],
  ['P-KIT-INS', 'Kit de inspección', 'general', 10, 3, 60],
];
const parts = PARTS.map(([partId, name, faultType, stock, minStock, unitCost]) => ({
  partId, locationId: 'ALM-CENTRAL', name, faultType, stock, minStock, unitCost,
  consumption7d: 0, irregular: false,
}));

// Demanda de 7 días (PartsConsumption agregado). P-FIL-COM con consumo irregular.
const days = [...Array(7)].map((_, i) => new Date(Date.parse(NOW) - (6 - i) * 86400000).toISOString().slice(0, 10));
const partsDemand = parts.map((p) => {
  const daily = days.map(() => Math.round(rnd() * 2));
  if (p.partId === 'P-FIL-COM') { daily[5] = 6; daily[6] = 8; }
  if (p.partId === 'P-MAN-HID') { daily[6] = 3; }
  const total = daily.reduce((a, b) => a + b, 0);
  return { partId: p.partId, name: p.name, days, daily, total };
});
const totals = partsDemand.map((d) => d.total);
const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
const sd = Math.sqrt(totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length);
for (const d of partsDemand) {
  d.irregular = d.total > mean + 2 * sd || d.partId === 'P-FIL-COM';
  const p = parts.find((x) => x.partId === d.partId);
  p.consumption7d = d.total; p.irregular = d.irregular;
}

const productivity = machines.map((m) => {
  const readings = 2880;
  const util = m.status === 'detenida' ? 0.05 : m.status === 'mantenimiento' ? 0.12 : 0.55 + rnd() * 0.4;
  const activeReadings = Math.round(readings * util);
  const fuelSum = Math.round(activeReadings * (m.last.fuel_lph || BASE[m.model].fuel_lph) / 360);
  return {
    machineId: m.machineId, model: m.model, zone: m.zone, date: NOW.slice(0, 10),
    readings, activeReadings, fuelSum, utilization: +(activeReadings / readings).toFixed(3),
  };
});

const tl = (ts, type, text) => ({ ts, type, text });
const incidents = [
  {
    incidentId: 'INC-20261114-0002', type: 'individual', machineIds: ['CAM-007'], zone: 'ZONA-SUR',
    severity: 'alta', status: 'en_atencion', riskScore: 78, faultType: 'hidraulico',
    variables: [
      { name: 'pressure', value: 124.6, baseline: 160, z: -5.1, peerDeviation: true },
      { name: 'temp', value: 93.2, baseline: 88, z: 2.2, peerDeviation: false },
    ],
    createdAt: minsAgo(42), resolvedAt: null, downtimeMin: null,
    technicianId: 'TEC-03', etaMin: 18, partsUsed: ['P-SEL-HID'], partsMissing: ['P-MAN-HID'],
    aiDiagnosis: {
      diagnostico_probable: 'Fuga en el circuito hidráulico principal: la presión cayó 22% respecto a su línea base y a sus pares CT-740.',
      acciones_recomendadas: ['Detener el levante de tolva', 'Inspeccionar mangueras de alta presión', 'Revisar sellos del cilindro principal'],
      repuestos_sugeridos: ['Manguera hidráulica', 'Sello hidráulico'],
    },
    messages: {
      operador: 'CAM-007: baja presión hidráulica. Detén el levante de tolva y espera al técnico (ETA 18 min).',
      tecnico: 'CAM-007 (ZONA-SUR): presión 124.6 bar vs 160 base. Probable fuga en manguera de alta. Lleva sello hidráulico; manguera sin stock en almacén central.',
      gerente: 'Riesgo ALTO en CAM-007 (camión, ZONA-SUR). Parada estimada 2 h. Falta stock de manguera hidráulica: se recomienda reposición urgente.',
    },
    timeline: [
      tl(minsAgo(42), 'creado', 'Anomalía detectada (riesgo 78). Incidente creado.'),
      tl(minsAgo(41.5), 'diagnostico', 'Diagnóstico IA: fuga en circuito hidráulico.'),
      tl(minsAgo(41), 'tecnico_asignado', 'Asignado Jorge Huamán (ETA 18 min).'),
      tl(minsAgo(41), 'repuestos', 'Sello hidráulico reservado. Falta manguera hidráulica.'),
      tl(minsAgo(40.5), 'notificado', 'Notificados operador, técnico y gerente.'),
    ],
    isRecurrence: false, commonCauseId: null,
  },
  {
    incidentId: 'INC-20261110-0007', type: 'individual', machineIds: ['EXC-014'], zone: 'ZONA-NORTE',
    severity: 'media', status: 'resuelto', riskScore: 66, faultType: 'motor',
    variables: [{ name: 'temp', value: 101.3, baseline: 85, z: 3.9, peerDeviation: true }],
    createdAt: '2026-11-10T14:12:00Z', resolvedAt: '2026-11-10T16:02:00Z', downtimeMin: 110,
    technicianId: 'TEC-01', etaMin: 14, partsUsed: ['P-SEN-TMP'], partsMissing: [],
    aiDiagnosis: {
      diagnostico_probable: 'Sobrecalentamiento del motor por sensor de temperatura defectuoso y radiador obstruido.',
      acciones_recomendadas: ['Cambiar sensor de temperatura', 'Limpiar radiador'],
      repuestos_sugeridos: ['Sensor de temperatura'],
    },
    messages: { operador: 'EXC-014: temperatura alta. Reduce carga.', tecnico: 'EXC-014: revisar sensor de temperatura y radiador.', gerente: 'Riesgo medio en EXC-014.' },
    timeline: [
      tl('2026-11-10T14:12:00Z', 'creado', 'Anomalía detectada (riesgo 66).'),
      tl('2026-11-10T14:13:00Z', 'tecnico_asignado', 'Asignado Luis Ramírez (ETA 14 min).'),
      tl('2026-11-10T16:02:00Z', 'resuelto', 'Resuelto por Luis Ramírez. Parada: 110 min.'),
    ],
    isRecurrence: false, commonCauseId: null,
  },
  {
    incidentId: 'INC-20261112-0003', type: 'individual', machineIds: ['CAR-011'], zone: 'ZONA-SUR',
    severity: 'media', status: 'resuelto', riskScore: 63, faultType: 'combustible',
    variables: [{ name: 'fuel_lph', value: 29.4, baseline: 22, z: 3.4, peerDeviation: true }],
    createdAt: '2026-11-12T09:40:00Z', resolvedAt: '2026-11-12T10:55:00Z', downtimeMin: 75,
    technicianId: 'TEC-03', etaMin: 11, partsUsed: ['P-FIL-COM'], partsMissing: [],
    aiDiagnosis: {
      diagnostico_probable: 'Consumo de combustible 34% sobre sus pares sin aumento de carga: filtro de combustible saturado.',
      acciones_recomendadas: ['Cambiar filtro de combustible', 'Revisar inyectores'],
      repuestos_sugeridos: ['Filtro de combustible'],
    },
    messages: { operador: 'CAR-011: consumo alto.', tecnico: 'CAR-011: cambiar filtro de combustible.', gerente: 'Riesgo medio en CAR-011.' },
    timeline: [
      tl('2026-11-12T09:40:00Z', 'creado', 'Anomalía detectada (riesgo 63).'),
      tl('2026-11-12T10:55:00Z', 'resuelto', 'Resuelto. Parada: 75 min.'),
    ],
    isRecurrence: false, commonCauseId: null,
  },
];

const commonCauses = [
  {
    groupId: 'ZONA-SUR#2026-11-13T16', zone: 'ZONA-SUR', machineIds: ['EXC-002', 'CAR-011', 'CAM-007'],
    windowStart: '2026-11-13T16:00:00Z', createdAt: '2026-11-13T16:24:00Z', active: false,
    suspectedCause: 'Combustible contaminado del mismo lote de abastecimiento.',
  },
];

const write = (name, data) => writeFileSync(join(out, name), JSON.stringify(data, null, 2) + '\n');
write('machines.json', machines);
write('technicians.json', technicians);
write('parts.json', parts);
write('partsDemand.json', partsDemand);
write('productivity.json', productivity);
write('incidents.json', incidents);
write('commonCauses.json', commonCauses);
console.log('Mocks generados en', out);
