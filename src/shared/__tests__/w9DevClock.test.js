import { describe, expect, it, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BANK_SCENARIOS, createDevApi, DEV_ROUTES, devToolsEnabled, isDevMissing, JUMP_KINDS } from '../api/devApi';
import { clockOffsetMs, serverNow, syncServerTime } from '../utils/time';
import { guardNavigation } from '../../ops/guard';
import { modulesFor } from '../../ops/modules';
import { bankSummary, demoSummary } from '../../ops/views/demoText';

const fake = (impl) => {
  const calls = [];
  return { calls, http: { request: vi.fn(async (verb, path, o) => { calls.push({ verb, path, body: o && o.body }); return impl(verb, path, o); }) } };
};

describe('W9-01: bảng demo dùng công cụ dev của máy chủ', () => {
  it('W9-01: bảng ẩn khi không có VITE_DEV_TOOLS=true: không menu, không vào được /demo, không gọi máy chủ', async () => {
    expect(devToolsEnabled({})).toBe(false);
    expect(devToolsEnabled({ VITE_DEV_TOOLS: 'false' })).toBe(false);
    expect(devToolsEnabled({ VITE_DEV_TOOLS: 'true' })).toBe(true);
    expect(modulesFor('admin', {}).some((m) => m.name === 'demo')).toBe(false);
    expect(modulesFor('admin', { VITE_DEV_TOOLS: 'true' }).some((m) => m.name === 'demo')).toBe(true);
    expect(modulesFor('workshop', { VITE_DEV_TOOLS: 'true' }).some((m) => m.name === 'demo')).toBe(false);
    const admin = { role: 'admin', permissions: [] };
    expect(guardNavigation(admin, { name: 'demo', meta: { module: { roles: ['admin'] } }, matched: [] })).toBe('/');
    expect(guardNavigation(admin, { name: 'demo', meta: { module: { roles: ['admin'] } }, matched: [] }, { dev: true })).toBe(true);
    const f = fake(() => ({}));
    const api = createDevApi({ http: f.http, enabled: false });
    expect(await api.available()).toBe(false);
    expect(f.calls).toEqual([]);
  });

  it('W9-01: máy chủ trả 404/401/403 cho /dev thì bảng ẩn đi (không phải lỗi); lỗi mạng vẫn ném', async () => {
    const mk = (status) => createDevApi({ http: fake(() => { throw Object.assign(new Error('x'), { status }); }).http, enabled: true });
    expect(await mk(404).available()).toBe(false);
    expect(await mk(403).available()).toBe(false);
    await expect(mk(0).available()).rejects.toMatchObject({ status: 0 });
    expect(isDevMissing({ status: 404 })).toBe(true);
    expect(isDevMissing({ status: 500 })).toBe(false);
    const ok = createDevApi({ http: fake(() => ({ now: '2026-12-01T00:00:00.000Z' })).http, enabled: true });
    expect(await ok.available()).toBe(true);
  });

  it('W9-01: nhảy mốc, đặt giờ, chạy job, dữ liệu mẫu và tiền ngân hàng gọi đúng đường + thân lệnh của backend', async () => {
    const f = fake(() => ({ now: '2026-12-01T00:00:00.000Z', fired: [] }));
    const api = createDevApi({ http: f.http, enabled: true });
    await api.jumpTo('cutoff');
    await api.setNow(new Date('2026-12-02T01:00:00.000Z'), { allowBackward: true, freeze: false });
    await api.setNow('2026-12-03T01:00:00.000Z');
    await api.runJobs(['charge-due']);
    await api.runJobs();
    await api.seedTrips('2026-12-04');
    await api.seedTrace();
    await api.bankTransfer({ scenario: 'weeks', userId: 'u-1' });
    await api.bankTransfer({ scenario: 'stranger' });
    await api.resetClock();
    await api.sampleAccounts();
    expect(f.calls.map((c) => `${c.verb} ${c.path}`)).toEqual([
      'POST /dev/clock/jump', 'POST /dev/clock', 'POST /dev/clock', 'POST /dev/jobs/run', 'POST /dev/jobs/run', 'POST /dev/seed/trips',
      'POST /dev/seed/trace', 'POST /dev/bank-transfer', 'POST /dev/bank-transfer', 'POST /dev/clock/reset', 'GET /dev/sample-accounts'
    ]);
    expect(f.calls[0].body).toEqual({ kind: 'cutoff' });
    expect(f.calls[1].body).toEqual({ at: '2026-12-02T01:00:00.000Z', freeze: false, allow_backward: true });
    expect(f.calls[2].body).toEqual({ at: '2026-12-03T01:00:00.000Z' }); // mặc định chỉ đi tới
    expect(f.calls[3].body).toEqual({ jobs: ['charge-due'] });
    expect(f.calls[4].body).toEqual({});
    expect(f.calls[5].body).toEqual({ day: '2026-12-04' });
    expect(f.calls[7].body).toEqual({ scenario: 'weeks', user_id: 'u-1' });
    expect(f.calls[8].body).toEqual({ scenario: 'stranger' });
    expect(() => api.jumpTo('khong-co')).toThrow();
    expect(() => api.bankTransfer({ scenario: 'khong-co' })).toThrow();
  });

  it('W9-01: giờ máy chủ từ /dev/clock được đồng bộ vào đồng hồ web (mọi màn dùng chung một "bây giờ")', async () => {
    syncServerTime(new Date(1000).toISOString(), 1000);
    const api = createDevApi({ http: fake(() => ({ now: '2026-12-05T10:00:00.000Z', offset_ms: 1 })).http, enabled: true });
    await api.clock();
    expect(serverNow(Date.now()).getTime() - Date.now()).toBeGreaterThan(24 * 3600_000);
    expect(clockOffsetMs()).not.toBe(0);
    syncServerTime(new Date(1000).toISOString(), 1000);
    await api.jumpTo('hub');
    expect(serverNow(Date.now()).toISOString().slice(0, 13)).toBe(new Date(Date.now() + clockOffsetMs()).toISOString().slice(0, 13));
    syncServerTime(new Date(1000).toISOString(), 1000);
  });

  it('W9-01: câu thông báo: tên job thật của máy chủ, không còn charge|cutoff|remind của bản giả lập', () => {
    expect(demoSummary({ fired: [{ job: 'charge-due' }, { job: 'lock-due-batches' }] })).toBe('Đã chạy: lần trừ tiền, lần chốt sổ.');
    expect(demoSummary({ fired: [] })).toMatch(/không có job/);
    expect(demoSummary({ target: null })).toMatch(/Không còn mốc/);
    expect(bankSummary({ transaction: { amount_vnd: 1500000, content: 'MV123 thanh toan' }, webhook: { http_status: 200, body: { result: 'pack_credited' } } })).toBe(
      'Ngân hàng báo 1.500.000đ nội dung "MV123 thanh toan": pack_credited.'
    );
  });

  it('W9-01: bảng đường dev khớp mã nguồn backend và không còn nút reset dữ liệu', () => {
    expect(JUMP_KINDS).toEqual(['charge', 'cutoff', 'delivery', 'hub']);
    expect(BANK_SCENARIOS).toEqual(['pack', 'weeks', 'stranger']);
    const view = readFileSync(resolve(process.cwd(), 'src/ops/views/DemoView.vue'), 'utf8');
    expect(view).not.toMatch(/demo\.reset\(|Reset dữ liệu/);
    expect(view).toMatch(/stack:down/);
    const file = resolve(process.cwd(), '../movafresh-platform/backend/src/dev/routes.ts');
    if (!existsSync(file)) return;
    const src = readFileSync(file, 'utf8');
    const have = new Set([...src.matchAll(/\br\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map((m) => `${m[1].toUpperCase()} /dev${m[2]}`));
    for (const [name, [verb, path]] of Object.entries(DEV_ROUTES)) expect(have.has(`${verb} ${path}`), `${name}: ${verb} ${path}`).toBe(true);
  });
});
