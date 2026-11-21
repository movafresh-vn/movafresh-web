import { describe, expect, it } from 'vitest';
import { bindingLimit, buildCycleBody, formFromCycle, LIMIT_LABEL } from '../../ops/cycleCapacity';
import { read } from './helpers/asyncScan';

const CYCLE = {
  date: '2026-12-03',
  booked_boxes: 42,
  remaining_boxes: 58,
  by_limit: { factory_prep: 258, truck_boxes: 198, truck_kg: 58 },
  limits: { factory_max_boxes: 300, truck_max_boxes: 240, truck_max_kg: 400, box_weight_g: 7000 },
  sku_supply: [{ sku: 'NL-BO-01', max_gross_g: 120000, booked_gross_g: 61000, remaining_gross_g: 59000, remaining_boxes: 60 }]
};

describe('W7-02: sức chứa chu kỳ theo ba giới hạn', () => {
  it('W7-02: nút thắt là giới hạn có số thùng còn lại nhỏ nhất, kể cả trần nguồn cung theo SKU', () => {
    expect(bindingLimit(CYCLE)).toEqual({ key: 'truck_kg', label: LIMIT_LABEL.truck_kg, remaining: 58 });
    const farm = { ...CYCLE, sku_supply: [{ sku: 'NL-BO-01', remaining_boxes: 12 }] };
    expect(bindingLimit(farm)).toEqual({ key: 'sku:NL-BO-01', label: 'Nguồn cung NL-BO-01', remaining: 12 });
    expect(bindingLimit({ by_limit: { factory_prep: 0, truck_boxes: 5, truck_kg: 9 } }).key).toBe('factory_prep');
    expect(bindingLimit({})).toBeNull();
    expect(bindingLimit(null)).toBeNull();
  });

  it('W7-02: form lấy đúng ba giới hạn và trần SKU đổi sang kg', () => {
    expect(formFromCycle(CYCLE)).toEqual({
      factory_max_boxes: '300', truck_max_boxes: '240', truck_max_kg: '400',
      sku_supply: [{ sku_id: 'NL-BO-01', kg: '120' }], note: ''
    });
  });

  it('W7-02: thân PUT chỉ gồm trường đã đổi (không ghi đè trường khác)', () => {
    const orig = formFromCycle(CYCLE);
    expect(buildCycleBody({ ...orig }, orig)).toEqual({});
    expect(buildCycleBody({ ...orig, truck_max_boxes: '200' }, orig)).toEqual({ truck_max_boxes: 200 });
    expect(buildCycleBody({ ...orig, truck_max_kg: '350.5', note: '  Xe T1 thiếu tải ' }, orig)).toEqual({ truck_max_kg: 350.5, note: 'Xe T1 thiếu tải' });
  });

  it('W7-02: ô để trống = null = về mặc định; trần SKU nhập kg gửi gram nguyên; xóa ô = gỡ trần; thêm SKU mới', () => {
    const orig = formFromCycle(CYCLE);
    expect(buildCycleBody({ ...orig, factory_max_boxes: '' }, orig)).toEqual({ factory_max_boxes: null });
    expect(buildCycleBody({ ...orig, sku_supply: [{ sku_id: 'NL-BO-01', kg: '95.5' }] }, orig)).toEqual({ sku_supply: [{ sku_id: 'NL-BO-01', max_gross_g: 95500 }] });
    expect(buildCycleBody({ ...orig, sku_supply: [{ sku_id: 'NL-BO-01', kg: '' }] }, orig)).toEqual({ sku_supply: [{ sku_id: 'NL-BO-01', max_gross_g: null }] });
    expect(buildCycleBody({ ...orig, sku_supply: [...orig.sku_supply, { sku_id: 'NL-GAO-01', kg: '0.3' }] }, orig)).toEqual({ sku_supply: [{ sku_id: 'NL-GAO-01', max_gross_g: 300 }] });
  });

  it('W7-02: số âm, số lẻ cho số thùng, hoặc chữ bị chặn bằng CAPACITY_INVALID trước khi gửi', () => {
    const orig = formFromCycle(CYCLE);
    for (const patch of [{ factory_max_boxes: '-1' }, { truck_max_boxes: '2.5' }, { truck_max_kg: '-3' }, { truck_max_kg: 'abc' }]) {
      expect(() => buildCycleBody({ ...orig, ...patch }, orig), JSON.stringify(patch)).toThrow(expect.objectContaining({ code: 'CAPACITY_INVALID' }));
    }
    expect(() => buildCycleBody({ ...orig, sku_supply: [{ sku_id: 'NL-BO-01', kg: '-5' }] }, orig)).toThrow(expect.objectContaining({ code: 'CAPACITY_INVALID' }));
  });

  it('W7-02: CapacityView có khối chu kỳ: đọc 14 ngày, nút Sửa chỉ khi có quyền capacityWrite, gửi qua cycleCapacity.put', () => {
    const t = read('ops/views/logistics/CapacityView.vue');
    expect(t).toContain('data-testid="cycle-section"');
    expect(t).toContain("api.ops.cycleCapacity.list(ctx.value, { days: 14 })");
    expect(t).toContain('api.ops.cycleCapacity.put(ctx.value, c.date, body)');
    expect(t).toContain("can('capacityWrite')");
    expect(t).toMatch(/v-if="canWrite\(\)"[^>]*data-testid="cycle-edit"/);
    for (const id of ['cycle-factory', 'cycle-truck-boxes', 'cycle-truck-kg', 'cycle-binding']) expect(t, id).toContain(`data-testid="${id}"`);
  });
});
