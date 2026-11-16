import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useParts, useTechnicians } from '../hooks/useData.js';
import { FAULT_TYPE, ROLES, VARIABLES } from '../lib/constants.js';
import { formatDateTime, formatNumber, timeAgo } from '../lib/format.js';
import { IncidentStatusBadge, RiskBadge, SeverityBadge } from './Badges.jsx';
import { IncidentTimeline } from './IncidentTimeline.jsx';
import { TechnicianPicker } from './TechnicianPicker.jsx';
import { ResolveButton } from './ResolveButton.jsx';

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

export function IncidentDetail({ incident, compact = false }) {
  const { user } = useAuth();
  const { data: technicians = [] } = useTechnicians();
  const { data: parts = [] } = useParts();
  const partName = (id) => parts.find((p) => p.partId === id)?.name || id;
  const role = user?.role;
  const isAssignedTech = role === 'tecnico' && (!user.techId || user.techId === incident.technicianId);
  const ai = incident.aiDiagnosis;

  // Cada rol ve su mensaje; el gerente ve los tres (comunicación por rol, problema 9)
  const messageRoles = role === 'gerente' ? ['operador', 'tecnico', 'gerente'] : [role];

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <RiskBadge score={incident.riskScore} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">{incident.incidentId}{incident.type === 'grupal' && ' · incidente grupal'}</p>
          <h2 className="text-lg font-bold text-slate-900">
            {incident.machineIds?.map((id, i) => (
              <span key={id}>
                {i > 0 && ', '}
                <Link to={`/maquinas/${id}`} className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-700">{id}</Link>
              </span>
            ))}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={incident.severity} />
            <IncidentStatusBadge status={incident.status} />
            <span className="text-xs text-slate-600">{FAULT_TYPE[incident.faultType]} · {incident.zone}</span>
            {incident.isRecurrence && <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs font-medium text-fuchsia-800">↻ Reincidencia</span>}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Creado {timeAgo(incident.createdAt)}
            {incident.resolvedAt && ` · resuelto ${formatDateTime(incident.resolvedAt)} · parada ${incident.downtimeMin} min`}
          </p>
        </div>
      </header>

      {isAssignedTech && incident.status !== 'resuelto' && <ResolveButton incident={incident} className="w-full py-3 text-base" />}

      <Section title="Diagnóstico de IA">
        {ai ? (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm">
            <p className="font-medium text-violet-950">{ai.diagnostico_probable}</p>
            {ai.acciones_recomendadas?.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-violet-900">
                {ai.acciones_recomendadas.map((a) => <li key={a}>{a}</li>)}
              </ul>
            )}
          </div>
        ) : (
          <p className="animate-pulse text-sm text-slate-500">Generando diagnóstico…</p>
        )}
      </Section>

      {incident.variables?.length > 0 && (
        <Section title="Variables desviadas">
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {incident.variables.map((v) => (
              <li key={v.name} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium">{VARIABLES[v.name]?.label || v.name}</span>{' '}
                <span className="tabular-nums">{formatNumber(v.value)} {VARIABLES[v.name]?.unit}</span>
                <span className="block text-xs text-slate-500">
                  base {formatNumber(v.baseline)} · z {v.z}{v.peerDeviation && ' · desvío vs pares'}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {messageRoles.some((r) => incident.messages?.[r]) && (
        <Section title={role === 'gerente' ? 'Mensajes enviados por rol' : 'Tu mensaje'}>
          <ul className="space-y-1.5">
            {messageRoles.filter((r) => incident.messages?.[r]).map((r) => (
              <li key={r} className="rounded-lg bg-slate-50 p-2.5 text-sm">
                <span className="text-xs font-semibold uppercase text-slate-500">{ROLES[r]?.label}</span>
                <p className="text-slate-800">{incident.messages[r]}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Repuestos">
        <div className="flex flex-wrap gap-1.5 text-xs">
          {incident.partsUsed?.map((p) => (
            <span key={p} className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">✓ {partName(p)}</span>
          ))}
          {incident.partsMissing?.map((p) => (
            <span key={p} className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">⚠ Reponer: {partName(p)}</span>
          ))}
          {!incident.partsUsed?.length && !incident.partsMissing?.length && <span className="text-slate-500">Pendiente de verificación</span>}
        </div>
        {ai?.repuestos_sugeridos?.length > 0 && (
          <p className="text-xs text-slate-500">Sugeridos por IA: {ai.repuestos_sugeridos.join(', ')}</p>
        )}
      </Section>

      <Section title="Asignación">
        <TechnicianPicker incident={incident} technicians={technicians} canReassign={role === 'gerente'} />
      </Section>

      {!compact && (
        <Section title="Línea de tiempo">
          <IncidentTimeline timeline={incident.timeline} />
        </Section>
      )}
      {compact && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">Línea de tiempo</summary>
          <div className="mt-2"><IncidentTimeline timeline={incident.timeline} /></div>
        </details>
      )}
    </div>
  );
}
