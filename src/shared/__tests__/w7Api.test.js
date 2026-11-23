import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createOpsApi } from '../api/opsApi';
import { OPS_ROUTES, SHIPPER_ROUTES } from '../api/opsRoutes';
import { api } from '../api';
import { fakeHttp } from './helpers/fakeHttp';

const BACKEND = resolve(process.cwd(), '../movafresh-platform');
const have = existsSync(join(BACKEND, 'backend/src/routes/ops'));
const PHOTO = 'data:image/jpeg;base64,AAAA';
const TICKET = { path: 'handover/202612/x.jpg', upload_url: 'https://storage.test/up' };

const sources = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith('.ts') ? [p] : [];
  });
const routesOf = (file, prefix) => [...readFileSync(file, 'utf8').matchAll(/\br\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map((m) => `${m[1].toUpperCase()} ${prefix}${m[2]}`);

describe('W7-api: logistics, tuyến, kho phụ nhận xe, shipper trên backend thật', () => {
  it('W7-04: mọi đường logistics / tuyến / nhận xe / shipper trong bảng có thật trong mã nguồn backend', () => {
    if (!have) return;
    const ops = new Set(sources(join(BACKEND, 'backend/src/routes/ops')).flatMap((f) => routesOf(f, '/ops')));
    for (const [name, [method, path]] of Object.entries(OPS_ROUTES)) {
      if (!/^(log|route|hubArrival|hubSeafood|hubSort|hubDispatch|hubRouteSheet|hubArrivals|cycle)/.test(name)) continue;
      expect(ops.has(`${method} ${path}`), `${name}: ${method} ${path}`).toBe(true);
    }
    const ship = new Set(routesOf(join(BACKEND, 'backend/src/routes/shipper.ts'), ''));
    for (const [name, [method, path]] of Object.entries(SHIPPER_ROUTES)) {
      expect(path.startsWith('/shipper/'), name).toBe(true);
      expect(ship.has(`${method} ${path}`), `${name}: ${method} ${path}`).toBe(true);
    }
  });

  it('W7-04: nhóm logistics, routes, shipper và các hàm kho phụ nhận xe / chia tuyến đều là hàm thật (trả Promise), tên giữ như bản giả lập', async () => {
    const real = createOpsApi({ http: fakeHttp({}) });
    for (const g of ['logistics', 'routes', 'shipper']) expect(real[g], g).toBeDefined();
    for (const k of ['config', 'capacityBoard', 'setCapacity', 'trips', 'saveTrip', 'exceptions', 'resolveException', 'coldChain', 'decideCold', 'costs', 'saveHubCost', 'publishedCosts', 'kpis']) expect(typeof real.logistics[k], k).toBe('function');
    for (const k of ['board', 'plan', 'moveStop']) expect(typeof real.routes[k], k).toBe('function');
    for (const k of ['board', 'callCustomer', 'deliver', 'fail']) expect(typeof real.shipper[k], k).toBe('function');
    for (const k of ['arrivals', 'scanArrival', 'closeArrival', 'seafood', 'tickSeafood', 'closeSeafood', 'sortBox', 'dispatchRoute', 'routeSheet']) expect(typeof real.hub[k], k).toBe('function');
    // facade chung: bản thật phủ bản giả lập
    const p1 = api.ops.shipper.board(null, {});
    const p2 = api.ops.hub.arrivals(null, null);
    expect(p1).toBeInstanceOf(Promise);
    expect(p2).toBeInstanceOf(Promise);
    await Promise.allSettled([p1, p2]); // không có máy chủ trong test: chỉ cần là Promise, lỗi mạng được nuốt
  });

  it('W7-04: mã tuyến ghép ":" được mã hóa trong đường dẫn khi chia thùng, xuất kho, in phiếu', async () => {
    const id = 'BATCH-20261203:early_morning_06_08:R-Q2-THAODIEN~2';
    const enc = encodeURIComponent(id);
    const http = fakeHttp({
      [`POST /ops/hub/routes/${enc}/sort`]: { 'MV-1': { at: 'x', location: 'K-E1' } },
      [`POST /ops/hub/routes/${enc}/dispatch`]: { routeId: id, status: 'dispatched', breaches: [] },
      [`GET /ops/hub/routes/${enc}/sheet`]: { id }
    });
    const a = createOpsApi({ http });
    await a.hub.sortBox(null, { routeId: id, orderId: 'MV-1', location: 'K-E1' });
    await a.hub.sortBox(null, { routeId: id, orderId: 'MV-1', clear: true }).catch(() => {});
    await a.hub.dispatchRoute(null, { routeId: id, tempC: 3.5, frozenTempC: null });
    await a.hub.routeSheet(null, id);
    expect(http.calls[0].body).toEqual({ orderId: 'MV-1', location: 'K-E1' });
    expect(http.calls[0].path).toBe(`/ops/hub/routes/${enc}/sort`);
    expect(http.calls[1].body).toEqual({ orderId: 'MV-1', clear: true });
    expect(http.calls[2].body).toEqual({ tempC: 3.5 }); // frozenTempC null không gửi (máy chủ chỉ nhận "vắng mặt")
  });

  it('W7-04: QC quyết định gửi mã số đo trong THÂN (mã có dấu "|"), không đặt vào đường dẫn', async () => {
    const http = fakeHttp({ 'POST /ops/logistics/cold-chain/decision': { decision: { decision: 'discard' }, exceptions: ['EX-1'] } });
    await createOpsApi({ http }).logistics.decideCold(null, { id: 'FD|2026-12-03|T1', decision: 'discard', note: 'hỏng' });
    expect(http.calls[0].path).toBe('/ops/logistics/cold-chain/decision');
    expect(http.calls[0].body).toEqual({ id: 'FD|2026-12-03|T1', decision: 'discard', note: 'hỏng' });
  });

  it('W7-04: đặt sức chứa khung: day trống = mọi ngày (null), capacityBoxes null = bỏ ghi đè, allowBelowUsed chỉ gửi khi true', async () => {
    const http = fakeHttp({ 'PUT /ops/logistics/capacity': { key: 'k', capacityBoxes: 10 } });
    const a = createOpsApi({ http });
    await a.logistics.setCapacity(null, { zoneId: 'Z1', day: '*', slotId: 'early_morning_06_08', capacityBoxes: 40 });
    await a.logistics.setCapacity(null, { zoneId: 'Z1', day: '2026-12-03', slotId: 'early_morning_06_08', capacityBoxes: null });
    await a.logistics.setCapacity(null, { zoneId: 'Z1', day: '', slotId: 's_s_s', capacityBoxes: 5, allowBelowUsed: true });
    expect(http.calls[0].body).toEqual({ zoneId: 'Z1', day: '*', slotId: 'early_morning_06_08', capacityBoxes: 40 });
    expect(http.calls[1].body).toEqual({ zoneId: 'Z1', day: '2026-12-03', slotId: 'early_morning_06_08', capacityBoxes: null });
    expect(http.calls[2].body).toEqual({ zoneId: 'Z1', day: null, slotId: 's_s_s', capacityBoxes: 5, allowBelowUsed: true });
  });

  it('W7-04: xử lý ngoại lệ chỉ gửi trường có giá trị; chuyến xe bỏ trường rỗng; chi phí kho phụ là số nguyên', async () => {
    const http = fakeHttp({
      'POST /ops/logistics/exceptions/EX-7/resolve': { id: 'EX-7', status: 'resolved' },
      'PUT /ops/logistics/trips': { id: 1 },
      'PUT /ops/logistics/hub-costs': { day: 'd' }
    });
    const a = createOpsApi({ http });
    await a.logistics.resolveException(null, { id: 'EX-7', kind: 'redeliver', day: '2026-12-05', slotId: 'early_morning_06_08' });
    await a.logistics.resolveException(null, { id: 'EX-7', kind: 'compensate' }).catch(() => {});
    expect(http.calls[0].body).toEqual({ kind: 'redeliver', day: '2026-12-05', slotId: 'early_morning_06_08' });
    await a.logistics.saveTrip(null, { day: '2026-12-05', tripId: 'T1', carrier: 'Nhà xe A', plate: '47C-123.45', capacityBoxes: 120, costVnd: 4500000, note: '' });
    expect(http.calls.find((c) => c.path === '/ops/logistics/trips').body).toEqual({ day: '2026-12-05', tripId: 'T1', carrier: 'Nhà xe A', plate: '47C-123.45', capacityBoxes: 120, costVnd: 4500000 });
    await a.logistics.saveHubCost(null, { day: '2026-12-05', laborVnd: 100000, rentVnd: 0, iceVnd: 5000, otherVnd: undefined });
    expect(http.calls.find((c) => c.path === '/ops/logistics/hub-costs').body).toEqual({ day: '2026-12-05', laborVnd: 100000, rentVnd: 0, iceVnd: 5000 });
  });

  it('W7-04: bảng tuyến, lập tuyến, chuyển điểm giao', async () => {
    const http = fakeHttp({
      'GET /ops/routes/board': { day: '2026-12-03', slots: [] },
      'POST /ops/routes/plan': { routes: [] },
      'POST /ops/routes/move-stop': { from: 'a', to: 'b' }
    });
    const a = createOpsApi({ http });
    await a.routes.board(null, '2026-12-03');
    await a.routes.plan(null, { day: '2026-12-03', slotId: 'early_morning_06_08', shipperIds: ['SP1'] });
    await a.routes.plan(null, { day: '2026-12-03', slotId: 'early_morning_06_08' });
    await a.routes.moveStop(null, { orderId: 'MV-1', toRouteId: 'B:s:R-1' });
    expect(http.calls[0].query).toEqual({ day: '2026-12-03' });
    expect(http.calls[1].body).toEqual({ day: '2026-12-03', slotId: 'early_morning_06_08', shipperIds: ['SP1'] });
    expect(http.calls[2].body).toEqual({ day: '2026-12-03', slotId: 'early_morning_06_08' });
    expect(http.calls[3].body).toEqual({ orderId: 'MV-1', toRouteId: 'B:s:R-1' });
  });

  it('W7-04: shipper thật không gửi as_shipper_id; điều phối / admin xem thử bằng as_shipper_id', async () => {
    const http = fakeHttp({ 'GET /shipper/board': { routes: [] } });
    const a = createOpsApi({ http });
    await a.shipper.board(null, {});
    await a.shipper.board(null, { asShipperId: 'SP2', day: '2026-12-03' });
    expect(http.calls[0].query).toEqual({ as_shipper_id: null, day: null });
    expect(http.calls[1].query).toEqual({ as_shipper_id: 'SP2', day: '2026-12-03' });
    expect(http.calls[0].body).toBeUndefined();
  });

  it('W7-04: ảnh tải lên bằng vé một lần với đúng mục đích rồi mới gửi đường dẫn (nhận xe: handover; giao hàng: delivery_proof)', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));
    const http = fakeHttp({
      'POST /ops/uploads': (o) => ({ path: `${o.body.purpose}/202612/x.jpg`, upload_url: 'https://storage.test/up' }),
      'POST /ops/hub/arrivals/close': { missing: [], damaged: [], extra: [], exceptions: [], tempBad: false },
      'POST /shipper/stops/MV-1/deliver': { to: 'COMPLETED', routeDone: false }
    });
    const a = createOpsApi({ http, fetchImpl });
    await a.hub.closeArrival(null, { scope: '2026-12-03|T1', tempC: 3.2, frozenTempC: null, photo: PHOTO, note: '' });
    expect(http.calls[0]).toMatchObject({ path: '/ops/uploads', body: { purpose: 'handover', content_type: 'image/jpeg' } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(http.calls[1].body).toEqual({ scope: '2026-12-03|T1', tempC: 3.2, photo: 'handover/202612/x.jpg' });
    await a.shipper.deliver(null, { orderId: 'MV-1', photo: PHOTO, tempC: 4, recovered: { foam: 1, gel: 0 }, asShipperId: null });
    expect(http.calls[2]).toMatchObject({ path: '/ops/uploads', body: { purpose: 'delivery_proof' } });
    expect(http.calls[3].body).toEqual({ photo_path: 'delivery_proof/202612/x.jpg', temp_c: 4, recovered: { foam: 1, gel: 0 } });
  });

  it('W7-04: đã có đường dẫn ảnh (hàng đợi đã tải) thì không tải lại; không có ảnh thì không gửi photo_path (máy chủ quyết định có bắt buộc không)', async () => {
    const fetchImpl = vi.fn();
    const http = fakeHttp({ 'POST /shipper/stops/MV-2/deliver': { to: 'COMPLETED' }, 'POST /shipper/stops/MV-3/fail': { status: 'failed' }, 'POST /shipper/stops/MV-3/call': { calls: 1 } });
    const a = createOpsApi({ http, fetchImpl });
    await a.shipper.deliver(null, { orderId: 'MV-2', photo: 'delivery_proof/202612/saved.jpg' });
    expect(http.calls[0].body).toEqual({ photo_path: 'delivery_proof/202612/saved.jpg' });
    await a.shipper.deliver(null, { orderId: 'MV-2' });
    expect(http.calls[1].body).toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
    await a.shipper.fail(null, { orderId: 'MV-3', reason: 'unreachable', note: 'gọi 3 lần', asShipperId: 'SP1' });
    expect(http.calls[2].body).toEqual({ reason: 'unreachable', note: 'gọi 3 lần', as_shipper_id: 'SP1' });
    await a.shipper.callCustomer(null, { orderId: 'MV-3' });
    expect(http.calls[3].body).toEqual({});
  });

  it('W7-04: nhận xe: quét và ghi seafood gửi đúng thân; tick hải sản có số nguyên', async () => {
    const http = fakeHttp({ 'POST /ops/hub/arrivals/scan': { result: 'ok', code: 'MV-1' }, 'POST /ops/hub/seafood/tick': {}, 'POST /ops/hub/seafood/close': { lots: [], shortKg: 0 }, 'GET /ops/hub/arrivals': { days: [] } });
    const a = createOpsApi({ http });
    await a.hub.scanArrival(null, { scope: '2026-12-03|T1', code: 'MV-1', state: 'damaged' });
    await a.hub.scanArrival(null, { scope: '2026-12-03|T1', code: 'MV-1' });
    await a.hub.tickSeafood(null, { orderId: 'MV-1', key: 'NL-TOM', count: 2 });
    await a.hub.closeSeafood(null, { orderId: 'MV-1' });
    await a.hub.arrivals(null, '2026-12-03');
    expect(http.calls[0].body).toEqual({ scope: '2026-12-03|T1', code: 'MV-1', state: 'damaged' });
    expect(http.calls[1].body.state).toBe('ok');
    expect(http.calls[2].body).toEqual({ orderId: 'MV-1', key: 'NL-TOM', count: 2 });
    expect(http.calls[4].query).toEqual({ day: '2026-12-03' });
  });

  it('W7-04: lỗi nghiệp vụ của máy chủ tới nơi gọi nguyên mã (ARRIVAL_CLOSED, NOT_YOUR_STOP...)', async () => {
    const err = Object.assign(new Error('x'), { code: 'NOT_YOUR_STOP', status: 403 });
    const a = createOpsApi({ http: fakeHttp({ 'POST /shipper/stops/MV-9/fail': err }) });
    await expect(a.shipper.fail(null, { orderId: 'MV-9', reason: 'unreachable' })).rejects.toMatchObject({ code: 'NOT_YOUR_STOP', status: 403 });
  });
});
