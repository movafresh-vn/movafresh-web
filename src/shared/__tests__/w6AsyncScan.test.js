import { describe, expect, it } from 'vitest';
import { read, scanUnawaitedOps } from './helpers/asyncScan';

// W6.1: kho phụ (tồn kho, truy xuất, thu hồi, nhận hàng) chạy trên backend thật, nên mọi lời gọi api.ops.hub.* đã chuyển phải được chờ.
const FILES = ['ops/views/hub/StockView.vue', 'ops/views/hub/TraceView.vue', 'ops/views/hub/RecallView.vue', 'ops/views/hub/ReceiveGoodsView.vue'];

describe('W6-01: màn kho phụ chờ mọi lời gọi API', () => {
  it('W6-01: không lời gọi api.ops.hub nào bị bỏ quên await và không đọc kết quả đồng bộ', () => {
    expect(FILES.flatMap((f) => scanUnawaitedOps(f))).toEqual([]);
  });

  it('W6-01: bộ quét bắt lỗi của nhóm kho phụ và cho qua cách viết đúng; nhận xe / chia tuyến (C16) chưa bị ép', () => {
    const bad = [
      'd.value = api.ops.hub.stock(ctx.value);',
      'xp.value = api.ops.hub.fefoPlan(ctx.value, { sku, qty });',
      'const r = api.ops.hub.count(ctx.value, { counted, reason });',
      't.value = api.ops.hub.trace(ctx.value, c);',
      'recalls.value = api.ops.hub.recalls(ctx.value);',
      'const r = api.ops.hub.createRecall(ctx.value, { lotCode, reason });',
      'api.ops.hub.recall(ctx.value, id).recall.id'
    ];
    for (const line of bad) expect(scanUnawaitedOps('x.vue', line), line).not.toEqual([]);
    const good = [
      'd.value = await api.ops.hub.stock(ctx.value);',
      'run(() => api.ops.hub.issue(ctx.value, { sku, qty }), "ok");',
      '[recalls.value, lots.value] = await Promise.all([api.ops.hub.recalls(ctx.value), api.ops.hub.traceLots(ctx.value)]);',
      'api.ops.hub.sortBox(ctx.value, b); // chia tuyến còn ở bản giả lập (C16)'
    ];
    for (const line of good) expect(scanUnawaitedOps('x.vue', line), line).toEqual([]);
  });

  it('W6-01: các hàm tải/ghi của màn kho phụ là async (hàm đồng bộ gọi await sẽ không biên dịch)', () => {
    for (const f of FILES) {
      const t = read(f);
      expect(t, f).not.toMatch(/^function (load|run|plan|issue|doWaste|saveCount|search|create|open)\(/m);
    }
  });

  it('W6-01: thu hồi hiện lỗi RECALL_EXISTS bằng details.recallId (máy chủ), không còn đọc e.recallId của bản giả lập', () => {
    const t = read('ops/views/hub/RecallView.vue');
    expect(t).toContain("e.code === 'RECALL_EXISTS'");
    expect(t).toContain('e.details.recallId');
    expect(t).not.toMatch(/\be\.recallId\b/);
  });

  it('W6-01: đóng đợt thu hồi mặc định GIỮ tồn kho; chỉ nhả khi ô xác nhận được chọn và gửi releaseStock', () => {
    const t = read('ops/views/hub/RecallView.vue');
    expect(t).toMatch(/const releaseStock = ref\(false\)/);
    expect(t).toContain('data-testid="close-release"');
    expect(t).toContain('releaseStock: releaseStock.value');
  });

  it('W6-01: nút bù Fresh Credit chỉ hiện khi máy chủ báo canCompensate (mua hàng / admin)', () => {
    expect(read('ops/views/hub/RecallView.vue')).toMatch(/v-if="cur\.canCompensate"/);
  });

  it('W6-01: danh sách lô khi nhận hàng lấy từ sổ truy xuất của kho phụ, không từ sổ lô của xưởng (kho phụ không có quyền đó)', () => {
    const t = read('ops/views/hub/ReceiveGoodsView.vue');
    expect(t).toContain('api.ops.hub.traceLots');
    expect(t).not.toContain('api.ops.listLots');
  });
});
