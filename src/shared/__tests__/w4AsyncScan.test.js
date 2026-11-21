import { describe, expect, it } from 'vitest';
import { read, scanUnawaitedOps } from './helpers/asyncScan';

// Các màn / kho dữ liệu của app vận hành đã chuyển sang backend thật: mọi lời gọi api.ops.<hàm đã chuyển> phải được chờ.
const FILES = [
  'ops/App.vue',
  'ops/queue.js',
  'ops/factoryStore.js',
  'ops/session.js',
  'ops/views/PlanView.vue',
  'ops/views/ModuleView.vue',
  'ops/views/LatePaymentsView.vue',
  'ops/views/workshop/WorkshopLayout.vue',
  'ops/views/workshop/WeekView.vue',
  'ops/views/workshop/ShortageView.vue',
  'ops/views/workshop/YieldView.vue',
  'ops/views/workshop/LoadView.vue',
  'ops/views/workshop/PackView.vue',
  'ops/views/workshop/ReceiveView.vue',
  'ops/views/finance/CostingView.vue',
  'ops/views/purchasing/PoView.vue',
  'ops/views/hub/RecallView.vue'
];

describe('W4-async: màn vận hành chờ mọi lời gọi API đã chuyển sang backend', () => {
  it('W4-async: không có lời gọi api.ops nào bị bỏ quên await và không đọc kết quả đồng bộ', () => {
    expect(FILES.flatMap((f) => scanUnawaitedOps(f))).toEqual([]);
  });

  it('W4-async: bộ quét thật sự bắt được lỗi (không phải luôn xanh) và cho qua cách viết đúng', () => {
    const bad = [
      'const x = api.ops.summary(ctx.value).now;',
      'api.ops.factory.snapshot(ctx.value, d);',
      'const r = api.ops.batches.lock(ctx.value, b);',
      'const list = api.ops.listOrders(ctx.value).filter((o) => o.ok);'
    ];
    for (const line of bad) expect(scanUnawaitedOps('x.vue', line), line).not.toEqual([]);
    const good = [
      'const x = (await api.ops.summary(ctx.value)).now;',
      'return api.ops.factory.snapshot(ctx.value, d);',
      'act(() => api.ops.substituteDish(ctx.value, b), ok);',
      'await Promise.all([api.ops.listOrders(ctx.value), api.ops.summary(ctx.value)]);',
      '// api.ops.summary(ctx.value) trong chú thích',
      'api.ops.finance.creditSummary(ctx.value); // tài chính còn ở bản giả lập (C17)'
    ];
    for (const line of good) expect(scanUnawaitedOps('x.vue', line), line).toEqual([]);
  });

  it('W4-async: không còn tick của trình duyệt, đồng hồ giả lập hay đọc localStorage làm kho dữ liệu trong app vận hành', () => {
    for (const f of ['ops/App.vue', 'ops/queue.js', 'ops/factoryStore.js', 'ops/views/PlanView.vue']) {
      const t = read(f);
      expect(t, f).not.toMatch(/api\.ops\.tick|api\.demo/);
    }
  });
});
