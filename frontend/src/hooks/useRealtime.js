import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { FIREBASE_ENABLED, USE_MOCK } from '../config/env.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToasts } from '../context/ToastContext.jsx';

/** ¿Esta alerta le corresponde al usuario? (filtrado por rol, sección 8.6) */
export function alertForUser(alert, user, machines = []) {
  if (!user || !alert?.messages) return null;
  if (user.role === 'gerente') return alert.messages.gerente || alert.messages.tecnico;
  if (user.role === 'tecnico') {
    return !user.techId || alert.technicianId === user.techId ? alert.messages.tecnico : null;
  }
  if (user.role === 'operador') {
    if (!user.zone) return alert.messages.operador;
    const zones = machines.filter((m) => alert.machineIds?.includes(m.machineId)).map((m) => m.zone);
    return zones.length === 0 || zones.includes(user.zone) ? alert.messages.operador : null;
  }
  return null;
}

function mergeMachine(qc, machine) {
  qc.setQueryData(['machines'], (prev) => {
    if (!Array.isArray(prev)) return prev;
    const i = prev.findIndex((m) => m.machineId === machine.machineId);
    if (i === -1) return [...prev, machine];
    const next = prev.slice();
    next[i] = { ...prev[i], ...machine };
    return next;
  });
}

/**
 * Puente de tiempo real. Se monta una vez (en Layout).
 * - Modo mock: escucha el bus del mockServer (emula DynamoDB Streams -> Firestore).
 * - Modo real con Firebase: onSnapshot de machines, incidents y alerts.
 * - Sin Firebase: solo queda el refetchInterval de TanStack Query.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { push } = useToasts();
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    const notify = (alert) => {
      const rawMachines = qc.getQueryData(['machines']);
      const machines = Array.isArray(rawMachines) ? rawMachines : [];
      const msg = alertForUser(alert, userRef.current, machines);
      if (!msg) return;
      push({
        title: `Incidente ${alert.incidentId} · ${alert.machineIds?.join(', ')}`,
        message: msg,
        severity: alert.severity,
        incidentId: alert.incidentId,
      });
    };

    if (USE_MOCK) {
      let unsub = () => {};
      let cancelled = false;
      import('../services/mockServer.js').then(({ subscribe }) => {
        if (cancelled) return;
        unsub = subscribe((evt) => {
          if (evt.type === 'machine') {
            mergeMachine(qc, evt.machine);
            qc.invalidateQueries({ queryKey: ['summary'] });
            qc.invalidateQueries({ queryKey: ['machine', evt.machine.machineId] });
          } else if (evt.type === 'incident') {
            qc.setQueryData(['incident', evt.incident.incidentId], evt.incident);
            qc.invalidateQueries({ queryKey: ['incidents'] });
            qc.invalidateQueries({ queryKey: ['summary'] });
          } else if (evt.type === 'alert') {
            notify(evt.alert);
            qc.invalidateQueries({ queryKey: ['parts'] });
            qc.invalidateQueries({ queryKey: ['technicians'] });
          } else if (evt.type === 'commonCause') {
            qc.invalidateQueries({ queryKey: ['commonCauses'] });
          }
        });
      });
      return () => { cancelled = true; unsub(); };
    }

    if (!FIREBASE_ENABLED || !user) return undefined;
    const mountedAt = new Date().toISOString();
    const unsubs = [
      onSnapshot(collection(db, 'machines'), (snap) => {
        snap.docChanges().forEach((ch) => {
          if (ch.type !== 'removed') mergeMachine(qc, { machineId: ch.doc.id, ...ch.doc.data() });
        });
        qc.invalidateQueries({ queryKey: ['summary'] });
      }, (e) => console.warn('Firestore machines', e)),
      onSnapshot(collection(db, 'incidents'), () => {
        qc.invalidateQueries({ queryKey: ['incidents'] });
        qc.invalidateQueries({ queryKey: ['incident'] });
      }, (e) => console.warn('Firestore incidents', e)),
      onSnapshot(query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(20)), (snap) => {
        snap.docChanges().forEach((ch) => {
          const a = { id: ch.doc.id, ...ch.doc.data() };
          const created = typeof a.createdAt === 'string' ? a.createdAt : a.createdAt?.toDate?.().toISOString();
          if (ch.type === 'added' && created && created >= mountedAt) notify(a);
        });
      }, (e) => console.warn('Firestore alerts', e)),
    ];
    return () => unsubs.forEach((u) => u());
  }, [qc, push, user]);
}
