import { describe, expect, it } from 'vitest';
import { createOpsApi } from '../api/opsApi';
import { fakeHttp } from './helpers/fakeHttp';
import { read } from './helpers/asyncScan';

const TRACE = {
  via: 'lot',
  lotCode: 'MOVA-TRACE-BO-202611-0912',
  sku: 'NL-BO-01',
  skuName: 'Thịt bò',
  counts: { not_shipped: 1, in_transit: 1, delivered: 1, total: 3 },
  orders: [
    { orderId: 'MV-261201-0001', group: 'not_shipped', held: false, recipient: null },
    { orderId: 'MV-261201-0002', group: 'in_transit', held: true, recipient: { name: 'A', address: 'B', phone: 'C' } },
    { orderId: 'MV-261128-0003', group: 'delivered', held: false, recipient: null }
  ],
  recalls: []
};

describe('W6-02: truy xuất lô trên backend thật', () => {
  it('W6-02: trace nhận chuỗi mã hoặc { input }, gọi GET /ops/hub/trace/lookup?input= và trả nguyên danh sách đơn theo mã đơn', async () => {
    const http = fakeHttp({ 'GET /ops/hub/trace/lookup': TRACE });
    const api = createOpsApi({ http });
    const a = await api.hub.trace(null, '  /q/MOVA-TRACE-BO-202611-0912 ');
    const b = await api.hub.trace(null, { input: 'B-20261201-001' });
    expect(http.calls.map((c) => c.query.input)).toEqual(['/q/MOVA-TRACE-BO-202611-0912', 'B-20261201-001']);
    expect(a.counts.total).toBe(3);
    expect(a.orders.map((o) => o.orderId)).toEqual(['MV-261201-0001', 'MV-261201-0002', 'MV-261128-0003']);
    expect(b.orders).toHaveLength(3);
  });

  it('W6-02: không có mã khách trong đơn; người nhận chỉ có khi máy chủ trả (kho phụ / admin), vai trò khác là null', async () => {
    const api = createOpsApi({ http: fakeHttp({ 'GET /ops/hub/trace/lookup': TRACE }) });
    const t = await api.hub.trace(null, 'x');
    for (const o of t.orders) expect(Object.keys(o)).not.toContain('customerId');
    expect(t.orders.filter((o) => o.recipient).length).toBe(1);
    expect(t.orders[0].recipient).toBeNull();
  });

  it('W6-02: lô không tồn tại là HttpError LOT_NOT_FOUND để màn hiện lỗi', async () => {
    const err = Object.assign(new Error('Không tìm thấy mã lô, mã mẻ hoặc mã QR này'), { code: 'LOT_NOT_FOUND', status: 404 });
    const api = createOpsApi({ http: fakeHttp({ 'GET /ops/hub/trace/lookup': err }) });
    await expect(api.hub.trace(null, 'zzz')).rejects.toMatchObject({ code: 'LOT_NOT_FOUND', status: 404 });
  });

  it('W6-02: màn Truy xuất hiện số đơn theo từng nhóm và bảng đơn (mã đơn, nhóm, giữ hàng)', () => {
    const t = read('ops/views/hub/TraceView.vue');
    expect(t).toContain('t.counts');
    expect(t).toContain('shownOrders');
    expect(t).toContain('o.orderId');
    expect(t).toContain('GROUPS');
  });
});

describe('W6-adapter: tồn kho và thu hồi đúng verb, đường, thân', () => {
  it('W6-adapter: FEFO là GET có sku + qty; xuất / hủy / kiểm kê bỏ trường rỗng', async () => {
    const http = fakeHttp({
      'GET /ops/hub/stock/fefo': { ok: true, allocations: [], shortfall: 0 },
      'POST /ops/hub/stock/issue': { allocations: [] },
      'POST /ops/hub/stock/waste': { id: 'MV-1' },
      'POST /ops/hub/stock/count': { diffs: [], moves: [] }
    });
    const api = createOpsApi({ http });
    await api.hub.fefoPlan(null, { sku: 'NL-BO-01', qty: 12.5 });
    await api.hub.issue(null, { sku: 'NL-BO-01', qty: 5, ref: '' });
    await api.hub.waste(null, { stockId: 'STK-1', qty: 1, reason: 'expired', note: '' });
    await api.hub.count(null, { counted: { 'STK-1': 3 }, reason: 'count' });
    expect(http.calls[0].query).toEqual({ sku: 'NL-BO-01', qty: 12.5 });
    expect(http.calls[1].body).toEqual({ sku: 'NL-BO-01', qty: 5 });
    expect(http.calls[2].body).toEqual({ stockId: 'STK-1', qty: 1, reason: 'expired' });
    expect(http.calls[3].body).toEqual({ counted: { 'STK-1': 3 }, reason: 'count' });
  });

  it('W6-adapter: STOCK_SHORT 409 giữ details.shortfall cho màn hình', async () => {
    const e = Object.assign(new Error('Không đủ tồn'), { code: 'STOCK_SHORT', status: 409, details: { shortfall: 4 } });
    const api = createOpsApi({ http: fakeHttp({ 'POST /ops/hub/stock/issue': e }) });
    await expect(api.hub.issue(null, { sku: 'NL-BO-01', qty: 99 })).rejects.toMatchObject({ code: 'STOCK_SHORT', details: { shortfall: 4 } });
  });

  it('W6-adapter: thu hồi: tạo, giữ, báo, bù, hủy tồn giữ, đóng; thân chỉ có trường có giá trị', async () => {
    const http = fakeHttp({
      'POST /ops/hub/recalls': { id: 'RC-1' },
      'GET /ops/hub/recalls/RC-1': { recall: { id: 'RC-1' } },
      'POST /ops/hub/recalls/RC-1/hold': { held: 2 },
      'POST /ops/hub/recalls/RC-1/notify': { notified: 2 },
      'POST /ops/hub/recalls/RC-1/compensate': { compensated: 2, totalVnd: 60000 },
      'POST /ops/hub/recalls/RC-1/waste-held': { lots: 1, costVnd: 1000 },
      'POST /ops/hub/recalls/RC-1/close': { id: 'RC-1', status: 'closed' }
    });
    const api = createOpsApi({ http });
    await api.hub.createRecall(null, { lotCode: 'MOVA-TRACE-BO-202611-0912', reason: 'test dương tính' });
    await api.hub.recall(null, 'RC-1');
    await api.hub.holdOrders(null, { recallId: 'RC-1' });
    await api.hub.notifyCustomers(null, { recallId: 'RC-1', orderIds: ['MV-1'] });
    await api.hub.compensate(null, { recallId: 'RC-1', amountVnd: null });
    await api.hub.compensate(null, { recallId: 'RC-1', orderIds: ['MV-1'], amountVnd: 30000 });
    await api.hub.wasteHeldStock(null, { recallId: 'RC-1' });
    await api.hub.closeRecall(null, { recallId: 'RC-1', note: 'xong' });
    await api.hub.closeRecall(null, { recallId: 'RC-1', note: '', releaseStock: true });
    const bodies = http.calls.map((c) => c.body);
    expect(bodies[0]).toEqual({ lotCode: 'MOVA-TRACE-BO-202611-0912', reason: 'test dương tính' });
    expect(bodies[2]).toEqual({});
    expect(bodies[3]).toEqual({ orderIds: ['MV-1'] });
    expect(bodies[4]).toEqual({});
    expect(bodies[5]).toEqual({ orderIds: ['MV-1'], amountVnd: 30000 });
    expect(bodies[7]).toEqual({ note: 'xong' }); // mặc định không nhả tồn kho
    expect(bodies[8]).toEqual({ releaseStock: true });
  });

  it('W6-adapter: đợt thu hồi trùng và bù không đủ quyền đi nguyên mã lỗi', async () => {
    const dup = Object.assign(new Error('đã có'), { code: 'RECALL_EXISTS', status: 409, details: { recallId: 'RC-9' } });
    const deny = Object.assign(new Error('cấm'), { code: 'FORBIDDEN', status: 403 });
    const api = createOpsApi({ http: fakeHttp({ 'POST /ops/hub/recalls': dup, 'POST /ops/hub/recalls/RC-9/compensate': deny }) });
    await expect(api.hub.createRecall(null, { lotCode: 'X', reason: 'y' })).rejects.toMatchObject({ code: 'RECALL_EXISTS', details: { recallId: 'RC-9' } });
    await expect(api.hub.compensate(null, { recallId: 'RC-9' })).rejects.toMatchObject({ status: 403 });
  });

  it('W6-adapter: hàm hub của kho phụ trả Promise, ctx không còn dùng', () => {
    const api = createOpsApi({ http: fakeHttp({ 'GET /ops/hub/stock': { lots: [] } }) });
    for (const k of ['stock', 'fefoPlan', 'issue', 'waste', 'count', 'traceLots', 'trace', 'recalls', 'createRecall', 'recall', 'holdOrders', 'notifyCustomers', 'compensate', 'wasteHeldStock', 'closeRecall'])
      expect(typeof api.hub[k], k).toBe('function');
    expect(api.hub.stock()).toBeInstanceOf(Promise);
  });
});
