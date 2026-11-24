import { afterEach, describe, expect, it } from 'vitest';
import { guardNavigation, routeAllowed } from '../../ops/guard';
import { MODULES, modulesFor } from '../../ops/modules';
import { createOpsApi } from '../api/opsApi';
import { clockOffsetMs, serverNow, syncServerTime } from '../utils/time';
import { read } from './helpers/asyncScan';
import { fakeHttp } from './helpers/fakeHttp';

afterEach(() => syncServerTime(new Date(1000).toISOString(), 1000));

const mod = (name) => MODULES.find((m) => m.name === name);
const to = (name, { sub = null, perm = null } = {}) => ({
  name,
  meta: { module: mod(name) },
  matched: [{ meta: { module: mod(name) } }, { meta: { ...(sub ? { roles: sub } : {}), ...(perm ? { perm } : {}) } }]
});
const staff = (role, permissions = []) => ({ role, permissions });

describe('W4-01: app vận hành chặn theo hồ sơ nhân viên của máy chủ', () => {
  it('W4-01: chưa đăng nhập thì về /login; đã đăng nhập mà vào /login thì về trang chủ', () => {
    expect(guardNavigation(null, to('plan'))).toBe('/login');
    expect(guardNavigation(null, { name: 'login', meta: {}, matched: [] })).toBe(true);
    expect(guardNavigation(staff('admin'), { name: 'login', meta: {}, matched: [] })).toBe('/');
  });

  it('W4-01: phân hệ theo vai trò: xưởng vào /xuong, không vào /tai-chinh; admin vào tất cả', () => {
    expect(routeAllowed(staff('workshop'), to('workshop'))).toBe(true);
    expect(routeAllowed(staff('workshop'), to('finance'))).toBe(false);
    expect(guardNavigation(staff('workshop'), to('finance'))).toBe('/');
    for (const m of MODULES) expect(routeAllowed(staff('admin'), to(m.name)), m.name).toBe(true);
  });

  it('W4-01: màn con hẹp quyền hơn phân hệ (meta.roles) và theo quyền cụ thể (meta.perm)', () => {
    expect(routeAllowed(staff('accounting'), to('purchasing', { sub: ['purchasing', 'admin'] }))).toBe(false);
    expect(routeAllowed(staff('purchasing'), to('purchasing', { sub: ['purchasing', 'admin'] }))).toBe(true);
    expect(routeAllowed(staff('workshop', ['factory']), to('workshop', { perm: 'yieldLog' }))).toBe(false);
    expect(routeAllowed(staff('workshop', ['factory', 'yieldLog']), to('workshop', { perm: 'yieldLog' }))).toBe(true);
  });

  it('W4-01: thanh toán muộn chỉ admin (quyền lateException của máy chủ); menu của từng vai trò', () => {
    expect(mod('late-payments').roles).toEqual(['admin']);
    expect(modulesFor('admin').map((m) => m.name)).toContain('late-payments');
    expect(modulesFor('dispatch').map((m) => m.name)).not.toContain('late-payments');
    expect(modulesFor('workshop').map((m) => m.name)).toEqual(['workshop']);
  });

  it('W4-01: truy xuất là phân hệ riêng, không còn là tab con của kho phụ', () => {
    expect(mod('trace').roles).toEqual(['hub', 'purchasing', 'admin']);
    expect(modulesFor('admin').map((m) => m.name)).toContain('trace');
    expect(modulesFor('hub').map((m) => m.name)).toContain('trace');
    expect(modulesFor('purchasing').map((m) => m.name)).toContain('trace');
    const router = read('ops/router.js');
    expect(router).toMatch(/trace:\s*\(\)\s*=> import\('\.\/views\/hub\/TraceView\.vue'\)/);
    expect(router).toMatch(/path:\s*'\/kho\/truy-xuat',\s*redirect:\s*'\/truy-xuat'/);
    const hubLayout = read('ops/views/hub/HubLayout.vue');
    expect(hubLayout).not.toContain('/kho/truy-xuat');
    expect(hubLayout).not.toContain("title: 'Truy xuất'");
  });

  it('W4-01: router dùng guardNavigation và các màn mới có route + quyền; không còn tra PIN hay vai trò cứng', () => {
    const router = read('ops/router.js');
    expect(router).toMatch(/router\.beforeEach\(\(to\) => guardNavigation\(session\.value, to, \{ dev: devToolsEnabled\(\) \}\)\)/);
    expect(router).toMatch(/'late-payments': LatePaymentsView/);
    expect(router).toMatch(/name: 'workshop-yield'[^\n]*perm: 'yieldLog'/);
    expect(router).toMatch(/name: 'finance-costing'[^\n]*perm: 'costing'/);
    expect(read('ops/views/LoginView.vue')).not.toMatch(/\bpin\b/i);
  });

  it('W4-01: App.vue không còn nhịp tick của trình duyệt; đồng hồ lấy từ summary của máy chủ và đăng xuất khi phiên hết hiệu lực', () => {
    const app = read('ops/App.vue');
    expect(app).not.toMatch(/api\.ops\.tick|setInterval|addEventListener\('storage'/);
    expect(app).toMatch(/await api\.ops\.summary\(ctx\.value\)/);
    expect(app).toMatch(/status === 401 \|\| e\.status === 403/);
    expect(app).toMatch(/logoutStaff/);
  });

  it('W4-01: summary đồng bộ đồng hồ web với giờ máy chủ (đồng hồ dev nhảy ngày thì web theo)', async () => {
    const http = fakeHttp({ 'GET /ops/summary': { now: '2026-12-01T01:00:00.000Z', role: 'admin', orders_by_state: { DRAFT: 2, LOCKED: 3 } } });
    const api = createOpsApi({ http });
    const s = await api.summary();
    expect(s).toEqual({ now: '2026-12-01T01:00:00.000Z', role: 'admin', ordersByState: { DRAFT: 2, LOCKED: 3 }, ordersTotal: 5 });
    expect(Math.abs(serverNow().getTime() - Date.parse('2026-12-01T01:00:00.000Z'))).toBeLessThan(2000);
    expect(clockOffsetMs()).not.toBe(0);
  });

  it('W4-01: shipper/nhà cung cấp không có orders_by_state: tổng đơn để trống', async () => {
    const api = createOpsApi({ http: fakeHttp({ 'GET /ops/summary': { now: '2026-12-01T01:00:00.000Z', role: 'supplier' } }) });
    expect(await api.summary()).toMatchObject({ role: 'supplier', ordersByState: null, ordersTotal: undefined });
  });
});
