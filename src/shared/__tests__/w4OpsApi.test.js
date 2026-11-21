import { describe, expect, it, vi } from 'vitest';
import { createOpsApi } from '../api/opsApi';
import { api } from '../api';
import { fakeHttp } from './helpers/fakeHttp';

describe('W4-api: api.ops trên backend thật', () => {
  it('W4-api: tên hàm giữ như bản giả lập; nhóm chưa chuyển vẫn ở bản giả lập; hàm đã chuyển trả Promise', () => {
    for (const k of ['planning', 'factory', 'listOrders', 'summary', 'listProductionPlans', 'getProductionPlan', 'substituteDish', 'saveLot', 'listLots']) expect(api.ops[k], k).toBeDefined();
    for (const k of ['batches', 'paymentExceptions', 'shortPick', 'uploads', 'costing', 'handovers', 'transitionOrder']) expect(api.ops[k], k).toBeDefined();
    // chưa chuyển (C14-C18): vẫn là bản giả lập đồng bộ
    for (const k of ['procurement', 'hub', 'logistics', 'finance', 'routes', 'shipper']) expect(api.ops[k], k).toBeDefined();
    const real = createOpsApi({ http: fakeHttp({ 'GET /ops/me': { role: 'admin' } }) });
    expect(real.me()).toBeInstanceOf(Promise);
  });

  it('W4-api: danh sách đơn gửi ngày + trạng thái; ctx không còn dùng', async () => {
    const http = fakeHttp({ 'GET /ops/orders': [{ order_code: 'MV-1' }] });
    const api2 = createOpsApi({ http });
    await api2.listOrders({ role: 'workshop' }, { day: '2026-11-25', orderState: 'LOCKED' });
    expect(http.calls[0].query).toEqual({ date: '2026-11-25', status: null, order_state: 'LOCKED' });
    expect(http.calls[0].headers).toBeUndefined();
  });

  it('W4-api: chuyển trạng thái đơn qua cửa duy nhất (id tuần, lý do, cách xử lý khi FAILED)', async () => {
    const http = fakeHttp({ 'POST /ops/orders/w-1/transition': { order_state: 'FAILED' } });
    await createOpsApi({ http }).transitionOrder(null, { weekId: 'w-1', to: 'FAILED', reason: 'khách vắng', resolution: 'none_customer_fault' });
    expect(http.calls[0].body).toEqual({ to: 'FAILED', reason: 'khách vắng', resolution: 'none_customer_fault' });
    await createOpsApi({ http: fakeHttp({ 'POST /ops/orders/w-2/transition': {} }) }).transitionOrder(null, { weekId: 'w-2', to: 'PREPPING', reason: 'bắt đầu' });
  });

  it('W4-api: đổi món gửi thân snake_case, chỉ gồm trường có giá trị; opId đủ dài thành khóa idempotency', async () => {
    const http = fakeHttp({ 'POST /ops/orders/MV-261125-0001/substitutions': { orderId: 'MV-261125-0001', compensationVnd: 5000, duplicate: false } });
    const api2 = createOpsApi({ http });
    await api2.substituteDish(null, { orderId: 'MV-261125-0001', mealIndex: 2, kind: 'protein', toDishId: 'D-PRO-003', reason: 'thiếu bò', shortageId: 'SH-20261125-001', opId: 'op-abcdef-1' });
    expect(http.calls[0].body).toEqual({ meal_index: 2, kind: 'protein', to_dish_id: 'D-PRO-003', reason: 'thiếu bò', shortage_id: 'SH-20261125-001', op_id: 'op-abcdef-1' });
    expect(http.calls[0].key).toBe('op-abcdef-1');
    await api2.substituteDish(null, { orderId: 'MV-261125-0001', mealIndex: 2, kind: 'protein', toDishId: 'D-PRO-003', compensationVnd: 0 });
    expect(http.calls[1].body).toEqual({ meal_index: 2, kind: 'protein', to_dish_id: 'D-PRO-003', compensation_vnd: 0 });
    expect(http.calls[1].key).toBeUndefined();
  });

  it('W4-api: thao tác xưởng gửi nguyên thân op và dùng opId làm khóa idempotency (gửi lại không tạo hai lần)', async () => {
    const http = fakeHttp({ 'POST /ops/factory/ops': { ok: true, duplicate: false } });
    const op = { type: 'tick', opId: 'op-aaaa-bbbb-1', orderId: 'MV-1', key: 'NL-BO-01', count: 1, at: '2026-11-25T00:00:00.000Z' };
    expect(await createOpsApi({ http }).factory.apply(null, op)).toEqual({ ok: true, duplicate: false });
    expect(http.calls[0]).toMatchObject({ body: op, key: 'op-aaaa-bbbb-1' });
  });

  it('W4-api: kế hoạch sản xuất: không có lô thì null (không ném lỗi), lỗi khác vẫn ném', async () => {
    const nf = Object.assign(new Error('x'), { code: 'BATCH_NOT_FOUND', status: 404 });
    const api2 = createOpsApi({ http: fakeHttp({ 'GET /ops/batches/2026-11-25': nf, 'GET /ops/batches/2026-11-26': Object.assign(new Error('x'), { code: 'FORBIDDEN' }) }) });
    expect(await api2.getProductionPlan(null, '2026-11-25')).toBeNull();
    await expect(api2.getProductionPlan(null, '2026-11-26')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('W4-api: sổ bàn giao chuỗi lạnh gửi nhiệt độ + đường dẫn ảnh đã tải lên; vé tải ảnh gửi mục đích + loại tệp', async () => {
    const http = fakeHttp({ 'POST /ops/handovers': { id: 1 }, 'POST /ops/uploads': { path: 'handover/202611/a.jpg', upload_url: 'https://s/x' } });
    const api2 = createOpsApi({ http });
    await api2.handovers.create(null, { date: '2026-11-25', tripCode: 'T1', kind: 'factory_loading', temperatureC: 3, photoPath: 'handover/202611/a.jpg' });
    expect(http.calls[0].body).toEqual({ date: '2026-11-25', trip_code: 'T1', kind: 'factory_loading', temperature_c: 3, photo_path: 'handover/202611/a.jpg' });
    await api2.uploads.ticket(null, { purpose: 'handover', contentType: 'image/jpeg' });
    expect(http.calls[1].body).toEqual({ purpose: 'handover', content_type: 'image/jpeg' });
    expect(api2.uploads.purposeOf('depart')).toBe('handover');
    expect(api2.uploads.purposeOf('tick')).toBeNull();
  });

  it('W4-api: sức chứa chu kỳ: đọc theo khoảng ngày và ghi từng ngày', async () => {
    const http = fakeHttp({ 'GET /ops/logistics/cycle-capacity': { cycles: [] }, 'PUT /ops/logistics/cycle-capacity/2026-11-25': { remaining: 3 } });
    const api2 = createOpsApi({ http });
    await api2.cycleCapacity.list(null, { from: '2026-11-25', days: 7 });
    await api2.cycleCapacity.put(null, '2026-11-25', { factory_max_boxes: 100 });
    expect(http.calls[0].query).toEqual({ from: '2026-11-25', days: 7 });
    expect(http.calls[1].body).toEqual({ factory_max_boxes: 100 });
  });

  it('W4-api: không có mạng tới máy chủ thì lỗi NETWORK_ERROR đến nơi gọi (hàng đợi giữ thao tác)', async () => {
    const { createHttp } = await import('../api/http');
    const h = createHttp({ baseUrl: 'http://x', getToken: async () => 't', fetchImpl: vi.fn(async () => { throw new TypeError('fetch failed'); }) });
    await expect(createOpsApi({ http: h }).factory.catalog()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
