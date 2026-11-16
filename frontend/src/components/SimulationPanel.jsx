import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config/env.js';
import { Button } from './ui.jsx';

/**
 * Controles del simulador embebido (solo VITE_USE_MOCK=true). Emula los escenarios
 * de simulator/ (sección 10.1) para probar el flujo completo sin backend.
 */
export function SimulationPanel() {
  const [mod, setMod] = useState(null);
  const [ran, setRan] = useState({});
  useEffect(() => {
    if (USE_MOCK) import('../services/mockServer.js').then(setMod);
  }, []);
  if (!USE_MOCK || !mod) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-amber-400 bg-amber-50 px-3 py-2">
      <span className="text-xs font-semibold text-amber-900">Simulador (mock):</span>
      {mod.scenarios.map((s) => (
        <Button
          key={s.id}
          variant="secondary"
          className="px-2 py-1 text-xs"
          disabled={ran[s.id]}
          onClick={() => { mod.runScenario(s.id); setRan((r) => ({ ...r, [s.id]: true })); }}
        >
          ▶ {s.label}
        </Button>
      ))}
    </div>
  );
}
