// Simulador de telemetría ArquiGuard (sección 10.1)
// Uso: node simulator.js --machines 15 --interval 10 --scenario falla_motor --speed 5 [--dry-run]
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

// Carga sencilla de .env sin dependencias externas
const envPath = join(dir, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  }
}

function parseArgs(argv) {
  const out = { machines: 15, interval: 10, scenario: 'normal', speed: 1, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--machines') out.machines = Number(argv[++i]) || 15;
    else if (a === '--interval') out.interval = Number(argv[++i]) || 10;
    else if (a === '--scenario') out.scenario = argv[++i] || 'normal';
    else if (a === '--speed') out.speed = Number(argv[++i]) || 1;
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}

const BASE = {
  'EX-320': { temp: 85, vibration: 3.5, pressure: 180, fuel_lph: 28, rpm: 1800, load_kg: 9000, speed_kmh: 6 },
  'CT-740': { temp: 88, vibration: 4.0, pressure: 160, fuel_lph: 55, rpm: 1900, load_kg: 40000, speed_kmh: 25 },
  'CG-210': { temp: 82, vibration: 3.0, pressure: 170, fuel_lph: 22, rpm: 1700, load_kg: 6000, speed_kmh: 10 },
};

// Ruido gaussiano aproximado (Box-Muller) con desviación estándar ~3%
function gaussianNoise(mean, pct = 0.03) {
  const u1 = Math.max(1e-7, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean * (1 + z * pct);
}

const args = parseArgs(process.argv.slice(2));
const fleet = JSON.parse(readFileSync(join(dir, 'fleet.json'), 'utf8')).slice(0, args.machines);
const scenarios = JSON.parse(readFileSync(join(dir, 'scenarios.json'), 'utf8'));
const activeScenario = scenarios[args.scenario] || scenarios.normal;

const API_URL = (process.env.API_URL || '').replace(/\/$/, '');
const INGEST_API_KEY = process.env.INGEST_API_KEY || '';

if (!args.dryRun && (!API_URL || !INGEST_API_KEY)) {
  console.error('Falta API_URL o INGEST_API_KEY en simulator/.env. Usa --dry-run para probar en consola.');
  process.exit(1);
}

const startedAt = Date.now();

async function sendReading(machine) {
  const base = BASE[machine.model];
  const elapsedMin = ((Date.now() - startedAt) / 60000) * args.speed;
  const isTarget = activeScenario.targets.includes(machine.machineId);
  const working = machine.status === 'operativa';

  // Pequeña deriva de posición si trabaja
  if (working) {
    machine.lat = +(machine.lat + (Math.random() - 0.5) * 0.0002).toFixed(5);
    machine.lng = +(machine.lng + (Math.random() - 0.5) * 0.0002).toFixed(5);
    machine.hours = +(machine.hours + (args.interval / 3600) * args.speed).toFixed(2);
  }

  const payload = {
    machineId: machine.machineId,
    model: machine.model,
    zone: machine.zone,
    ts: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    lat: machine.lat,
    lng: machine.lng,
    hours: machine.hours,
    status: machine.status,
  };

  for (const [k, mean] of Object.entries(base)) {
    if (!working && ['rpm', 'speed_kmh', 'load_kg', 'fuel_lph'].includes(k)) {
      payload[k] = 0;
      continue;
    }
    let v = gaussianNoise(mean, 0.03);
    if (isTarget && activeScenario.driftPerMin?.[k]) {
      v += activeScenario.driftPerMin[k] * elapsedMin;
    }
    payload[k] = +Math.max(0, v).toFixed(1);
  }

  if (args.dryRun) {
    if (isTarget) console.log('[DRY-RUN target]', JSON.stringify(payload));
    return true;
  }

  const res = await fetch(`${API_URL}/ingest`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': INGEST_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} en ${machine.machineId}: ${text}`);
  }
  return true;
}

async function cycle() {
  const ts = new Date().toISOString();
  try {
    await Promise.all(fleet.map(sendReading));
    console.log(`[${ts}] Ciclo enviado (${fleet.length} máquinas · escenario=${args.scenario} · speed=${args.speed}x)`);
  } catch (err) {
    console.error(`[${ts}] Error en ciclo:`, err.message);
  }
}

console.log(`Iniciando simulador ArquiGuard: ${fleet.length} máquinas, intervalo=${args.interval}s, escenario=${args.scenario}, speed=${args.speed}x${args.dryRun ? ' [DRY-RUN]' : ''}`);
cycle();
setInterval(cycle, args.interval * 1000);
