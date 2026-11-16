import { api, qs } from './api.js';

export const machinesService = {
  list: (params) => api.get(`/machines${qs(params)}`),
  get: (id) => api.get(`/machines/${encodeURIComponent(id)}`),
  risk: (id) => api.get(`/machines/${encodeURIComponent(id)}/risk`),
  // Propuesto a Keyra: últimas 60 lecturas de Telemetry para el gráfico del detalle.
  telemetry: (id) => api.get(`/machines/${encodeURIComponent(id)}/telemetry`),
  incidents: (id) => api.get(`/machines/${encodeURIComponent(id)}/incidents`),
  productivity: () => api.get('/fleet/productivity'),
  summary: () => api.get('/dashboard/summary'),
};
