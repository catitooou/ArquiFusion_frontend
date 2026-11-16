import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiService } from '../services/analytics.js';
import { Button } from './ui.jsx';

const EXAMPLES = ['¿Qué máquina debo priorizar hoy?', '¿Qué repuestos debo reponer?', '¿Hay algún patrón por zona?'];

/** Asistente del gerente (POST /ai/ask, opcional). */
export function AskAI() {
  const [q, setQ] = useState('');
  const ask = useMutation({ mutationFn: (question) => aiService.ask(question) });

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) ask.mutate(q.trim());
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="ask-ai" className="sr-only">Pregunta al asistente</label>
        <input
          id="ask-ai"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pregunta sobre tu flota…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        />
        <Button type="submit" disabled={ask.isPending || !q.trim()}>{ask.isPending ? '…' : 'Preguntar'}</Button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => { setQ(ex); ask.mutate(ex); }} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200">
            {ex}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {ask.isError && <p className="text-sm text-red-700">{ask.error.message}</p>}
        {ask.data && (
          <div className="whitespace-pre-line rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
            {ask.data.answer}
            {ask.data.provider && <p className="mt-2 text-xs text-violet-600">Fuente: {ask.data.provider}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
