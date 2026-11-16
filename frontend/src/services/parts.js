import { api } from './api.js';

export const partsService = {
  list: () => api.get('/parts'),
  demand: () => api.get('/parts/demand'),
  restock: (id, qty, locationId) => api.post(`/parts/${encodeURIComponent(id)}/restock`, locationId ? { qty, locationId } : { qty }),
};
