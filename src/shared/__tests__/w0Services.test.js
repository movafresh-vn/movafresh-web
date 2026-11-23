import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabase', () => ({
  getAccessToken: vi.fn(async () => 'tok-123')
}));

describe('W0-01: aiApi dùng backend thật', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8787/');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('W0-01: ghép ${base}/api/v2${path}, gắn Bearer và bóc phong bì success', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: { hello: 'world' } })
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { getAiConsents } = await import('../../services/aiApi');
    const data = await getAiConsents();
    expect(data).toEqual({ hello: 'world' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8787/api/v2/account/consents');
    expect(init.headers.Authorization).toBe('Bearer tok-123');
  });

  it('W0-01: lỗi backend được ném với message của backend', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ status: 'error', error: { message: 'Khung giờ đã đầy' } })
    })));
    const { getAiConsents } = await import('../../services/aiApi');
    await expect(getAiConsents()).rejects.toThrow('Khung giờ đã đầy');
  });
});
