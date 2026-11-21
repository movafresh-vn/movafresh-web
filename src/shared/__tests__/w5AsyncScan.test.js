import { describe, expect, it } from 'vitest';
import { read, scanUnawaitedOps } from './helpers/asyncScan';

// W5.1: các màn mua hàng và kho phụ nhận hàng chạy trên backend thật, nên mọi lời gọi api.ops.* đã chuyển phải được chờ.
const FILES = [
  'ops/views/purchasing/PoView.vue',
  'ops/views/purchasing/SuppliersView.vue',
  'ops/views/purchasing/SkuView.vue',
  'ops/views/purchasing/PricesView.vue',
  'ops/views/purchasing/ForecastView.vue',
  'ops/views/purchasing/PayablesView.vue',
  'ops/views/purchasing/DirectBuyView.vue',
  'ops/views/purchasing/SettingsView.vue',
  'ops/views/hub/ReceiveGoodsView.vue',
  'ops/views/ModuleView.vue'
];

describe('W5-01: màn mua hàng và nhận hàng chờ mọi lời gọi API', () => {
  it('W5-01: không có lời gọi api.ops mua hàng / nhận hàng nào bị bỏ quên await, không đọc kết quả đồng bộ', () => {
    expect(FILES.flatMap((f) => scanUnawaitedOps(f))).toEqual([]);
  });

  it('W5-01: bộ quét bắt được lỗi mới của nhóm mua hàng và cho qua cách viết đúng', () => {
    const bad = [
      'const pos = api.ops.procurement.listPos(ctx.value);',
      'data.value = api.ops.procurement.payables(ctx.value);',
      'api.ops.procurement.approvePo(ctx.value, id);',
      'const r = api.ops.hub.receive(ctx.value, b);',
      'const s = api.ops.procurement.settings(ctx.value).settings;',
      'api.ops.listPurchaseOrders(ctx.value).length'
    ];
    for (const line of bad) expect(scanUnawaitedOps('x.vue', line), line).not.toEqual([]);
    const good = [
      'data.value = await api.ops.procurement.payables(ctx.value);',
      'act(() => api.ops.procurement.approvePo(ctx, d.po.id), "ok");',
      'const s = (await api.ops.procurement.settings(ctx.value)).settings;',
      'await api.ops.hub.sortBox(ctx.value, b);',
      'api.ops.finance.creditSummary(ctx.value); // tài chính còn ở bản giả lập (C17)'
    ];
    for (const line of good) expect(scanUnawaitedOps('x.vue', line), line).toEqual([]);
  });

  it('W5-01: các hàm load/lưu của màn mua hàng là async (một hàm đồng bộ gọi await sẽ không biên dịch)', () => {
    for (const f of FILES.filter((x) => x.includes('purchasing/'))) {
      const t = read(f);
      expect(t, f).not.toMatch(/^function (load|save|add|record|preview)\(/m);
    }
  });

  it('W5-01: không còn đọc ảnh hóa đơn từ dataUrl trả về (kho ảnh riêng tư trả đường dẫn, không trả dữ liệu ảnh)', () => {
    expect(read('ops/views/purchasing/PoView.vue')).not.toMatch(/f\.dataUrl/);
  });

  it('W5-01: nhập giá làm món vượt trần giá vốn: màn Bảng giá bắt CONFIRM_REQUIRED, hiện danh sách món và chỉ gửi lại khi người dùng xác nhận', () => {
    const t = read('ops/views/purchasing/PricesView.vue');
    expect(t).toContain("e.code === 'CONFIRM_REQUIRED'");
    expect(t).toContain('newly_flagged');
    expect(t).toContain('data-testid="price-confirm"');
    expect(t).toMatch(/@submit\.prevent="add\(false\)"/); // không để sự kiện submit trở thành confirm=true
  });

  it('W5-01: đối chiếu lệch (MATCH_DIFF / NOTE_REQUIRED) cập nhật bảng đối chiếu từ details.match', () => {
    const t = read('ops/views/purchasing/PoView.vue');
    expect(t).toContain("e.code === 'MATCH_DIFF'");
    expect(t).toContain('e.details.match');
  });
});
