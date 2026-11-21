// Client HTTP duy nhất của web: base URL, Bearer của Supabase, Idempotency-Key tự động cho lệnh ghi, bóc phong bì {status, data}.
// Lỗi nghiệp vụ ném HttpError { code, status, details, message }; mã lỗi là mã trong docs/api-contract.json.
import { getAccessToken } from '../../services/supabase';

export class HttpError extends Error {
  constructor(message, { code = 'HTTP_ERROR', status = 0, details = null } = {}) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function newKey() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function buildQuery(query) {
  if (!query) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) for (const x of v) p.append(k, String(x));
    else p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

/**
 * @param {{ baseUrl?: string, getToken?: () => Promise<string|null>, fetchImpl?: typeof fetch, keyFactory?: () => string }} [opts]
 */
export function createHttp(opts = {}) {
  const baseUrl = String(opts.baseUrl ?? import.meta.env?.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
  const tokenOf = opts.getToken || getAccessToken;
  const keyOf = opts.keyFactory || newKey;

  /**
   * @param {string} method
   * @param {string} path  đường dẫn sau /api/v2, vd '/ops/summary'
   * @param {{ query?: object, body?: any, key?: string, auth?: boolean, as?: 'json'|'text'|'blob'|'download', headers?: object }} [o]
   */
  async function request(method, path, o = {}) {
    const m = method.toUpperCase();
    const f = opts.fetchImpl || globalThis.fetch;
    const auth = o.auth !== false;
    const token = auth ? await tokenOf() : null;
    const headers = { ...(o.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (o.body !== undefined && !(o.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (WRITE.has(m)) headers['Idempotency-Key'] = o.key || keyOf();
    let res;
    try {
      res = await f(`${baseUrl}/api/v2${path}${buildQuery(o.query)}`, {
        method: m,
        headers,
        ...(o.body !== undefined ? { body: o.body instanceof FormData ? o.body : JSON.stringify(o.body) } : {})
      });
    } catch (e) {
      throw new HttpError('Không kết nối được máy chủ MOVA', { code: 'NETWORK_ERROR', status: 0, details: { cause: String(e?.message || e) } });
    }
    if (res.status === 204) return null;
    if (res.ok && o.as === 'download') return { text: await res.text(), headers: res.headers };
    if (res.ok && (o.as === 'text' || o.as === 'blob')) return o.as === 'text' ? res.text() : res.blob();
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const err = payload?.error || {};
      throw new HttpError(err.message || `Yêu cầu thất bại (HTTP ${res.status})`, { code: err.code || 'HTTP_ERROR', status: res.status, details: err.details ?? null });
    }
    if (payload && payload.status === 'success') return payload.data;
    throw new HttpError('Máy chủ trả dữ liệu không hợp lệ', { code: 'BAD_RESPONSE', status: res.status });
  }

  return {
    request,
    get: (path, o) => request('GET', path, o),
    post: (path, body, o) => request('POST', path, { ...o, body: body ?? {} }),
    put: (path, body, o) => request('PUT', path, { ...o, body: body ?? {} }),
    patch: (path, body, o) => request('PATCH', path, { ...o, body: body ?? {} }),
    del: (path, o) => request('DELETE', path, o)
  };
}

let shared = null;
export function http() {
  return (shared ||= createHttp());
}
