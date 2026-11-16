import { useQuery } from '@tanstack/react-query';
import { machinesService } from '../services/machines.js';
import { incidentsService } from '../services/incidents.js';
import { techniciansService } from '../services/technicians.js';
import { partsService } from '../services/parts.js';
import { analyticsService } from '../services/analytics.js';

// refetchInterval: respaldo si el tiempo real (Firestore) falla (sección 8.6)
const POLL = 10000;

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    for (const key of ['items', 'data', 'machines', 'incidents', 'technicians', 'parts', 'causes', 'suggestions']) {
      if (Array.isArray(value[key])) return value[key];
    }
  }
  return [];
}

export const useMachines = () =>
  useQuery({ queryKey: ['machines'], queryFn: async () => asArray(await machinesService.list()), refetchInterval: POLL });

export const useMachine = (id) =>
  useQuery({ queryKey: ['machine', id], queryFn: () => machinesService.get(id), enabled: !!id, refetchInterval: POLL });

export const useMachineRisk = (id) =>
  useQuery({ queryKey: ['machineRisk', id], queryFn: () => machinesService.risk(id), enabled: !!id, refetchInterval: 5000 });

export const useMachineTelemetry = (id) =>
  useQuery({
    queryKey: ['telemetry', id],
    queryFn: async () => asArray(await machinesService.telemetry(id)),
    enabled: !!id,
    refetchInterval: 5000,
    retry: false, // endpoint propuesto: si no existe aún, no insistir
  });

export const useMachineIncidents = (id) =>
  useQuery({ queryKey: ['incidents', 'machine', id], queryFn: async () => asArray(await machinesService.incidents(id)), enabled: !!id });

export const useSummary = () =>
  useQuery({ queryKey: ['summary'], queryFn: () => machinesService.summary(), refetchInterval: POLL });

export const useIncidents = (params = {}) =>
  useQuery({ queryKey: ['incidents', 'list', params], queryFn: async () => asArray(await incidentsService.list(params)), refetchInterval: POLL });

export const useIncident = (id) =>
  useQuery({ queryKey: ['incident', id], queryFn: () => incidentsService.get(id), enabled: !!id, refetchInterval: POLL });

export const useSuggestions = (id, enabled = true) =>
  useQuery({ queryKey: ['suggestions', id], queryFn: async () => asArray(await incidentsService.suggestions(id)), enabled: !!id && enabled });

export const useTechnicians = () =>
  useQuery({ queryKey: ['technicians'], queryFn: async () => asArray(await techniciansService.list()), refetchInterval: POLL });

export const useParts = () =>
  useQuery({ queryKey: ['parts'], queryFn: async () => asArray(await partsService.list()), refetchInterval: 15000 });

export const usePartsDemand = () =>
  useQuery({ queryKey: ['parts', 'demand'], queryFn: async () => asArray(await partsService.demand()) });

export const useProductivity = () =>
  useQuery({ queryKey: ['productivity'], queryFn: async () => asArray(await machinesService.productivity()), refetchInterval: 30000 });

export const useCommonCauses = () =>
  useQuery({ queryKey: ['commonCauses'], queryFn: async () => asArray(await analyticsService.commonCauses()), refetchInterval: POLL });

export const useMaintenance = () =>
  useQuery({ queryKey: ['maintenance'], queryFn: async () => asArray(await analyticsService.maintenance()), refetchInterval: 30000 });
