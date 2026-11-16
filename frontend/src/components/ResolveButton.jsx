import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentsService } from '../services/incidents.js';
import { useToasts } from '../context/ToastContext.jsx';
import { Button } from './ui.jsx';
import { Modal } from './Modal.jsx';

/** Botón Resolver del técnico: POST /incidents/{id}/resolve (envía el taskToken al Step Function). */
export function ResolveButton({ incident, className, onResolved }) {
  const qc = useQueryClient();
  const { push } = useToasts();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const resolve = useMutation({
    mutationFn: () => incidentsService.resolve(incident.incidentId, notes ? { notes } : {}),
    onSuccess: (inc) => {
      if (inc?.incidentId && inc?.machineIds) qc.setQueryData(['incident', incident.incidentId], inc);
      qc.invalidateQueries({ queryKey: ['incident', incident.incidentId] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['machines'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      push({ title: 'Incidente resuelto', message: `${incident.incidentId}: la máquina vuelve a operativa.`, tone: 'success' });
      setOpen(false);
      setNotes('');
      onResolved?.(inc);
    },
    onError: (e) => {
      push({ title: e.status === 409 ? 'Ya estaba resuelto' : 'No se pudo resolver', message: e.message, severity: 'alta' });
      setOpen(false);
    },
  });

  if (incident.status === 'resuelto') return null;
  const notReady = !incident.technicianId;

  return (
    <>
      <Button variant="success" className={className} onClick={() => setOpen(true)} disabled={notReady}>
        ✓ Resolver
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Resolver ${incident.incidentId}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="success" onClick={() => resolve.mutate()} disabled={resolve.isPending}>
              {resolve.isPending ? 'Cerrando…' : 'Confirmar resolución'}
            </Button>
          </>
        }
      >
        <p>Se cerrará el incidente, se calculará el tiempo de parada y {incident.machineIds?.join(', ')} volverá a estado operativa.</p>
        <label className="mt-3 block text-sm font-medium text-slate-700" htmlFor={`notes-${incident.incidentId}`}>
          Notas de la intervención (opcional)
        </label>
        <textarea
          id={`notes-${incident.incidentId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          autoFocus
          className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
          placeholder="Ej.: se cambió el sensor de temperatura y se limpió el radiador."
        />
      </Modal>
    </>
  );
}
