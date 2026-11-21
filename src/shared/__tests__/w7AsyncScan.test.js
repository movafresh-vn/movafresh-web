import { describe, expect, it } from 'vitest';
import { read, scanUnawaitedOps } from './helpers/asyncScan';

// W7.1: điều phối logistics, lập tuyến, kho phụ nhận xe / chia tuyến / xuất kho và app shipper chạy trên backend thật,
// nên mọi lời gọi api.ops.logistics / routes / shipper / hub.<nhận xe, chia tuyến> phải được chờ.
const FILES = [
  'ops/views/logistics/CapacityView.vue',
  'ops/views/logistics/TripsView.vue',
  'ops/views/logistics/ExceptionsView.vue',
  'ops/views/logistics/ColdChainView.vue',
  'ops/views/logistics/CostKpiView.vue',
  'ops/views/logistics/LogisticsLayout.vue',
  'ops/views/logistics/RoutesView.vue',
  'ops/views/hub/ArrivalView.vue',
  'ops/views/hub/SeafoodView.vue',
  'ops/views/hub/SortView.vue',
  'ops/views/hub/DispatchOutView.vue',
  'ops/views/shipper/ShipperView.vue',
  'ops/components/RouteBoard.vue',
  'ops/components/RouteSheet.vue'
];

describe('W7-01: màn logistics, kho phụ nhận xe và shipper chờ mọi lời gọi API', () => {
  it('W7-01: không lời gọi api.ops nào của nhóm này bị bỏ quên await và không đọc kết quả đồng bộ', () => {
    expect(FILES.flatMap((f) => scanUnawaitedOps(f))).toEqual([]);
  });

  it('W7-01: bộ quét bắt lỗi của nhóm logistics / tuyến / shipper / nhận xe và cho qua cách viết đúng', () => {
    const bad = [
      'board.value = api.ops.logistics.capacityBoard(ctx.value);',
      'const r = api.ops.logistics.resolveException(ctx.value, { id });',
      'data.value = api.ops.routes.board(ctx.value, sel.value);',
      'api.ops.routes.plan(ctx.value, { day, slotId }).routes.length',
      'const d = api.ops.shipper.board(ctx.value, {});',
      'api.ops.shipper.deliver(ctx.value, { orderId, photo });',
      'data.value = api.ops.hub.arrivals(ctx.value, d);',
      'const r = api.ops.hub.closeArrival(ctx.value, b);',
      'x.value = api.ops.hub.routeSheet(ctx.value, id);'
    ];
    for (const line of bad) expect(scanUnawaitedOps('x.vue', line), line).not.toEqual([]);
    const good = [
      'board.value = await api.ops.logistics.capacityBoard(ctx.value);',
      'const [ex, rb] = await Promise.all([api.ops.logistics.exceptions(ctx.value), api.ops.routes.board(ctx.value, null)]);',
      'return api.ops.shipper.board(ctx.value, {});',
      'run(() => api.ops.hub.dispatchRoute(ctx.value, b), "ok");',
      '// api.ops.shipper.deliver(ctx.value, b) trong chú thích'
    ];
    for (const line of good) expect(scanUnawaitedOps('x.vue', line), line).toEqual([]);
  });

  it('W7-01: các hàm tải / ghi của màn là async (hàm đồng bộ có await sẽ không biên dịch)', () => {
    for (const f of FILES) {
      const t = read(f);
      expect(t, f).not.toMatch(/^function (load|save|run|act|deliver|fail|call|close|plan|dispatch|tickAll|scan|decide|resolve|saveHub|reset)\(/m);
    }
  });

  it('W7-01: lỗi hiện bằng tiếng Việt qua logisticsError, không đổ thẳng e.message của máy chủ ở các màn chính', () => {
    for (const f of FILES.filter((x) => /View\.vue$|RouteBoard/.test(x) && !/RoutesView|SortView|DispatchOutView/.test(x))) {
      const t = read(f);
      if (/catch \(/.test(t)) expect(t, f).toContain('logisticsError(');
    }
  });

  it('W7-01: màn kho phụ / logistics không còn nhắc "bản mock" hay "Bảng demo" cho người dùng', () => {
    for (const f of FILES) {
      const t = read(f);
      expect(t, f).not.toMatch(/bản mock|\(mock\)|Bảng demo|Bản demo chỉ ghi/i);
    }
  });

  it('W7-01: mã tuyến dài của máy chủ ("<lô>:<khung>:<tuyến>") chỉ hiện phần cuối cho người dùng (routeLabel)', () => {
    expect(read('ops/components/RouteBoard.vue')).toContain('routeLabel(r.id)');
    expect(read('ops/views/shipper/ShipperView.vue')).toContain('routeLabel(r.id)');
    expect(read('ops/views/logistics/ExceptionsView.vue')).toContain('routeLabel(r.id)');
  });
});
