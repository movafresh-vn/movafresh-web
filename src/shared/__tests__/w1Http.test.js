import { describe, expect, it, vi } from 'vitest';
import { createHttp, HttpError } from '../api/http';

const ok = (data, status = 200) => ({ ok: true, status, json: async () => ({ status: 'success', data }), text: async () => 'a,b\n1,2', blob: async () => 'blob' });
const fail = (status, error) => ({ ok: false, status, json: async () => ({ status: 'error', error }) });

function make(fetchImpl, extra = {}) {
  let n = 0;
  return createHttp({ baseUrl: 'http://x/', getToken: async () => 'tok', fetchImpl, keyFactory: () => `key-${++n}`, ...extra });
}

describe('W1-01: HTTP client', () => {
  it('W1-01: ghép base + /api/v2 + path + query, gắn Bearer, bỏ giá trị rỗng, mảng thành nhiều tham số', async () => {
    const f = vi.fn(async () => ok({ a: 1 }));
    const h = make(f);
    expect(await h.get('/ops/summary', { query: { day: '2026-12-01', empty: '', nul: null, s: ['a', 'b'] } })).toEqual({ a: 1 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://x/api/v2/ops/summary?day=2026-12-01&s=a&s=b');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['Idempotency-Key']).toBeUndefined();
  });

  it('W1-01: lệnh ghi tự gắn Idempotency-Key mới mỗi lần, hoặc dùng khóa truyền vào để thử lại an toàn', async () => {
    const f = vi.fn(async () => ok({}));
    const h = make(f);
    await h.post('/x', { a: 1 });
    await h.put('/x', { a: 1 });
    await h.patch('/x', {});
    await h.del('/x');
    await h.post('/x', {}, { key: 'fixed-key-1' });
    expect(f.mock.calls.map((c) => c[1].headers['Idempotency-Key'])).toEqual(['key-1', 'key-2', 'key-3', 'key-4', 'fixed-key-1']);
    expect(f.mock.calls[0][1].body).toBe('{"a":1}');
    expect(f.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });

  it('W1-01: lỗi nghiệp vụ ném HttpError có code, status, details', async () => {
    const h = make(async () => fail(409, { code: 'CYCLE_FULL', message: 'Chu kỳ đã đầy', details: { limit: 'truck_kg' } }));
    const e = await h.post('/subscription', {}).catch((x) => x);
    expect(e).toBeInstanceOf(HttpError);
    expect(e).toMatchObject({ code: 'CYCLE_FULL', status: 409, message: 'Chu kỳ đã đầy', details: { limit: 'truck_kg' } });
  });

  it('W1-01: mất mạng thành NETWORK_ERROR; 204 trả null; phản hồi lạ là BAD_RESPONSE', async () => {
    const down = make(async () => { throw new TypeError('fetch failed'); });
    await expect(down.get('/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
    expect(await make(async () => ({ ok: true, status: 204 })).get('/x')).toBeNull();
    await expect(make(async () => ({ ok: true, status: 200, json: async () => ({ hello: 1 }) })).get('/x')).rejects.toMatchObject({ code: 'BAD_RESPONSE' });
  });

  it('W1-01: tải tệp (CSV) trả text/blob, không bóc phong bì; không token thì không gắn Bearer; auth:false bỏ qua token', async () => {
    const f = vi.fn(async () => ok(null));
    const h = make(f);
    expect(await h.get('/ops/finance/journal.csv', { as: 'text' })).toBe('a,b\n1,2');
    expect(await h.get('/ops/finance/journal.csv', { as: 'blob' })).toBe('blob');
    await h.get('/public', { auth: false });
    expect(f.mock.calls[2][1].headers.Authorization).toBeUndefined();
    const anon = createHttp({ baseUrl: 'http://x', getToken: async () => null, fetchImpl: f });
    await anon.get('/y');
    expect(f.mock.calls[3][1].headers.Authorization).toBeUndefined();
  });
});
