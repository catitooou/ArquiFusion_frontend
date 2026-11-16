import { api, qs } from './api.js';

export const incidentsService = {
  list: (params) => api.get(`/incidents${qs(params)}`),
  get: (id) => api.get(`/incidents/${encodeURIComponent(id)}`),
  resolve: (id, body = {}) => api.post(`/incidents/${encodeURIComponent(id)}/resolve`, body),
  assign: (id, techId) => api.patch(`/incidents/${encodeURIComponent(id)}/assign`, { techId }),
  suggestions: (id) => api.get(`/incidents/${encodeURIComponent(id)}/suggestions`),
};
