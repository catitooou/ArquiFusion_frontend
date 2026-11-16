import { MACHINE_STATUS, SEVERITY, INCIDENT_STATUS } from '../lib/constants.js';
import { cx } from '../lib/format.js';
import { maintenanceState } from '../lib/logic/flota.js';

const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap';

export function StatusBadge({ status }) {
  const s = MACHINE_STATUS[status];
  if (!s) return null;
  return (
    <span className={cx(pill, s.badge)}>
      <span className="size-1.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const s = SEVERITY[severity];
  if (!s) return <span className={cx(pill, 'bg-slate-50 text-slate-600 ring-slate-500/20')}>Normal</span>;
  return <span className={cx(pill, s.badge)}>{s.label}</span>;
}

export function IncidentStatusBadge({ status }) {
  const s = INCIDENT_STATUS[status];
  return s ? <span className={cx(pill, s.badge)}>{s.label}</span> : null;
}

export function RiskBadge({ score, size = 'md' }) {
  const v = Math.round(score ?? 0);
  const color = v >= 90 ? '#991b1b' : v >= 75 ? '#f97316' : v >= 60 ? '#eab308' : v >= 40 ? '#0891b2' : '#16a34a';
  const big = size === 'lg';
  return (
    <span
      className={cx('inline-flex items-center justify-center rounded-full font-bold tabular-nums text-white', big ? 'size-16 text-xl' : 'h-6 min-w-9 px-2 text-xs')}
      style={{ background: color }}
      title={`Riesgo ${v} de 100`}
    >
      {v}
      <span className="sr-only"> de 100 de riesgo</span>
    </span>
  );
}

export function MaintenanceBadge({ hoursToMaint }) {
  const st = maintenanceState(hoursToMaint);
  if (!st) return null;
  const map = {
    ok: ['bg-slate-50 text-slate-700 ring-slate-500/20', `Mant. en ${Math.round(hoursToMaint)} h`],
    proximo: ['bg-amber-100 text-amber-800 ring-amber-600/30', `Mant. próximo: ${Math.round(hoursToMaint)} h`],
    vencido: ['bg-red-100 text-red-800 ring-red-600/30', `Mant. vencido (${Math.abs(Math.round(hoursToMaint))} h)`],
  };
  const [cls, label] = map[st];
  return <span className={cx(pill, cls)}>🔧 {label}</span>;
}
