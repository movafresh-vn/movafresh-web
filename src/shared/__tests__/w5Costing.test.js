import { describe, expect, it } from 'vitest';
import { bpToPct, costingView, describeDish } from '../../ops/costingView';
import { createOpsApi } from '../api/opsApi';
import { read } from './helpers/asyncScan';
import { fakeHttp } from './helpers/fakeHttp';

const dish = (id, price, ingredient, bp, over) => ({
  dish_id: id, name: `Món ${id}`, kind: 'protein', price_vnd: price, ingredient_cost_vnd: ingredient, packaging_vnd: 1000, labor_vnd: 2000,
  total_cost_vnd: ingredient + 3000, food_cost_bp: bp, max_bp: 3500, over_guardrail: over, missing_prices: []
});
const DATA = {
  on: '2026-11-25', max_bp: 3500, flagged_count: 1,
  dishes: [dish('D-PRO-001', 100000, 36250, 3625, true), dish('D-PRO-002', 100000, 30000, 3000, false), { ...dish('D-VEG-001', 50000, 10000, 2000, false), missing_prices: ['NL-RAU-01'] }]
};

describe('W5-03: bảng giá vốn món với cảnh báo trên 35%', () => {
  it('W4-03/W5-03: điểm cơ sở thành phần trăm; món 36,25% bị cờ, 30% thì không', () => {
    expect(bpToPct(3625)).toBe(36.25);
    expect(bpToPct(3500)).toBe(35);
    const v = costingView(DATA);
    expect(v.maxPct).toBe(35);
    expect(v.flagged).toBe(1);
    expect(v.dishes.map((d) => [d.id, d.foodCostPct, d.over])).toEqual([['D-PRO-001', 36.25, true], ['D-PRO-002', 30, false], ['D-VEG-001', 20, false]]);
  });

  it('W5-03: lọc chỉ món vượt ngưỡng; số món bị cờ vẫn là của toàn bộ', () => {
    const v = costingView(DATA, { onlyFlagged: true });
    expect(v.dishes.map((d) => d.id)).toEqual(['D-PRO-001']);
    expect(v.flagged).toBe(1);
  });

  it('W5-03: món thiếu giá nguyên liệu được báo; dữ liệu rỗng không làm hỏng màn', () => {
    expect(describeDish(DATA.dishes[2]).missingPrices).toEqual(['NL-RAU-01']);
    expect(costingView(null)).toMatchObject({ on: null, maxPct: 35, flagged: 0, dishes: [] });
    expect(costingView({ on: '2026-11-25', max_bp: 4000, dishes: [] }).maxPct).toBe(40);
  });

  it('W5-03: gọi giá vốn theo ngày (không gửi ngày thì máy chủ dùng hôm nay)', async () => {
    const http = fakeHttp({ 'GET /ops/costing/dishes': DATA });
    const api = createOpsApi({ http });
    expect((await api.costing.dishes(null)).flagged_count).toBe(1);
    await api.costing.dishes(null, '2026-12-01');
    expect(http.calls[0].query).toEqual({ on: null });
    expect(http.calls[1].query).toEqual({ on: '2026-12-01' });
  });

  it('W5-03: màn có ô đếm món vượt ngưỡng, cờ đỏ trên từng dòng và tab "Giá vốn món" trong Tài chính theo quyền costing', () => {
    const v = read('ops/views/finance/CostingView.vue');
    expect(v).toMatch(/data-testid="cost-flagged"/);
    expect(v).toMatch(/data-testid="cost-flag"/);
    expect(v).toMatch(/Vượt \{\{ view\.maxPct \}\}%/);
    expect(read('ops/views/finance/FinanceLayout.vue')).toMatch(/to: '\/tai-chinh\/gia-von-mon'/);
  });
});
