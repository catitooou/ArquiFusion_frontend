import axios from 'axios';
import { API_URL, API_KEY, USE_MOCK } from '../config/env.js';

export class ApiError extends Error {
  constructor(message, { code = 'ERROR', status } = {}) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const http = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
});

/** Desenvuelve la respuesta estándar { ok, data, error } (sección 5.4). */
function unwrap(payload, status) {
  if (payload && typeof payload === 'object' && 'ok' in payload) {
    if (payload.ok) return payload.data;
    throw new ApiError(payload.error?.message || 'Error de API', { code: payload.error?.code, status });
  }
  return payload; // tolerante si algún endpoint devuelve el dato directo
}

let mockModule;
const loadMock = () => (mockModule ??= import('./mockServer.js'));

export async function request(method, url, body) {
  if (USE_MOCK) {
    const { mockRequest } = await loadMock();
    try {
      return await mockRequest(method, url, body);
    } catch (e) {
      throw new ApiError(e.message, { code: e.code, status: e.status });
    }
  }
  try {
    const res = await http.request({ method, url, data: body });
    return unwrap(res.data, res.status);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const res = e.response;
    if (res?.data) {
      try { return unwrap(res.data, res.status); } catch (inner) { throw inner; }
    }
    throw new ApiError(e.message || 'No se pudo conectar con la API', { code: 'NETWORK', status: res?.status });
  }
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  patch: (url, body) => request('PATCH', url, body),
};

export const qs = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
  return s ? `?${s}` : '';
};
