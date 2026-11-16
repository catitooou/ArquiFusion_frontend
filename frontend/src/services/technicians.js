import { api } from './api.js';

export const techniciansService = {
  list: () => api.get('/technicians'),
  update: (id, body) => api.patch(`/technicians/${encodeURIComponent(id)}`, body),
};
