import { TIMELINE_TYPES } from '../lib/constants.js';
import { formatDateTime } from '../lib/format.js';

export function IncidentTimeline({ timeline = [] }) {
  if (!timeline.length) return <p className="text-sm text-slate-500">Sin eventos todavía.</p>;
  return (
    <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4">
      {timeline.map((ev, i) => {
        const t = TIMELINE_TYPES[ev.type] || { label: ev.type, color: 'bg-slate-400' };
        return (
          <li key={`${ev.ts}-${i}`} className="relative">
            <span className={`absolute -left-[23px] top-1 size-3 rounded-full ring-4 ring-white ${t.color}`} aria-hidden="true" />
            <p className="text-xs text-slate-500">
              <time dateTime={ev.ts}>{formatDateTime(ev.ts)}</time> · <span className="font-medium text-slate-700">{t.label}</span>
            </p>
            <p className="text-sm text-slate-800">{ev.text}</p>
          </li>
        );
      })}
    </ol>
  );
}
