import { api } from './api.js';

export const analyticsService = {
  maintenance: () => api.get('/maintenance/forecast'),
  commonCauses: () => api.get('/common-causes'),
};

export const aiService = {
  ask: (question) => api.post('/ai/ask', { question }),
};
