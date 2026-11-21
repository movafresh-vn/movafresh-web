import { describe, it, expect } from 'vitest';
import { BUSINESS } from '../config/business';
import { DISHES, SKUS, SAUCES } from '../data/catalog';
import { PERSONAS } from './helpers/personas';
import { generateMeals } from '../domain/mealPlan';
import { aggregateBom } from '../domain/bom';
import { rng } from '../utils/formatters';
import {
  applyFactoryOp, bagsFor, boxProgress, buildProductionSheet, demandTotals, emptyFactory, expiryOf, isTempOk, nextDailyId, nextLotCode,
  orderPackList, overlayFactory, progressLines, scopeKey, tripForSlot, unbatchedBags, weekStartOf
} from '../domain/factory';

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

describe('gom BOM từ 10 persona', () => {
  const orders = PERSONAS.map((p, i) => ({
    id: `T-${i}`,
    householdSize: p.householdSize,
    meals: generateMeals({ householdSize: p.householdSize, goals: p.goals, restrictions: p.restrictions, mealsCount: p.mealsPerWeek, rand: rng(100 + i) })
  }));

  // Tính tay: cộng gram từng món, không đi qua aggregateBom
  const expected = {};
  const expectedSauces = {};
  for (const o of orders) {
    for (const m of o.meals) {
      for (const [kind, id] of Object.entries(m.dishes)) {
        const f = kind === 'protein' ? m.proteinFactor || 1 : kind === 'carb' ? m.carbFactor || 1 : kind === 'veg' ? m.vegFactor || 1 : 1;
        for (const b of DISHES[id].bom) expected[b.sku] = (expected[b.sku] || 0) + b.gramsPerPerson * o.householdSize * f;
        if (DISHES[id].sauce) expectedSauces[DISHES[id].sauce] = (expectedSauces[DISHES[id].sauce] || 0) + 1;
      }
    }
  }

  it('tổng gram từng SKU và số túi xốt khớp phép cộng tay', () => {
    const bom = aggregateBom(orders, DISHES);
    expect(bom.boxes).toBe(10);
    expect(Object.keys(bom.skuGrams).sort()).toEqual(Object.keys(expected).sort());
    for (const [sku, g] of Object.entries(expected)) expect(bom.skuGrams[sku]).toBe(Math.round(g));
    expect(bom.sauces).toEqual(expectedSauces);
  });

  it('phiếu nhặt từng đơn cộng lại khớp BOM và túi chuẩn xưởng làm tròn lên', () => {
    const lists = orders.map((o) => orderPackList({ ...o, zoneId: 'Z1', slotId: 'early_morning_06_08', deliveryDay: '2026-11-23', deliveryAt: 'x', status: 'locked' }));
    const totals = demandTotals(lists);
    const bom = aggregateBom(orders, DISHES);
    for (const [sku, grams] of Object.entries(bom.skuGrams)) {
      const t = totals.items[sku] || totals.hub[sku];
      expect(Math.abs(t.grams - grams)).toBeLessThanOrEqual(10); // làm tròn gram theo từng đơn
      expect(t.bags * t.bagGrams).toBeGreaterThanOrEqual(grams - 10);
    }
    // Hải sản không nằm trong số túi của xưởng
    for (const sku of Object.keys(totals.items)) expect(SKUS[sku] ? SKUS[sku].supplierId : 'sauce').not.toBe('S-SEAFOOD');
    for (const [code, n] of Object.entries(expectedSauces)) expect(totals.items[code].bags).toBe(n);
  });

  it('bagsFor làm tròn lên, có nhu cầu thì ít nhất 1 túi', () => {
    expect(bagsFor('NL-BO-01', 250)).toBe(1);
    expect(bagsFor('NL-BO-01', 251)).toBe(2);
    expect(bagsFor('NL-BO-01', 10)).toBe(1);
    expect(bagsFor('NL-BO-01', 0)).toBe(0);
  });
});

describe('chuyến xe và mốc thời gian', () => {
  it('khung sáng đi chuyến 1, trưa và tối đi chuyến 2', () => {
    expect(tripForSlot('early_morning_06_08').id).toBe('T1');
    expect(tripForSlot('noon_11_13').id).toBe('T2');
    expect(tripForSlot('evening_18_21').id).toBe('T2');
  });
  it('tuần bắt đầu từ thứ Hai; hạn dùng tính theo ngày đóng túi', () => {
    expect(weekStartOf('2026-11-22')).toBe('2026-11-16'); // Chủ Nhật
    expect(weekStartOf('2026-11-23')).toBe('2026-11-23');
    // rau 3 ngày: đóng ngày 17/11 thì hạn hết ngày 20/11 (giờ VN)
    expect(expiryOf('NL-RAU-02', '2026-11-17T03:00:00.000Z')).toBe('2026-11-20T16:59:00.000Z');
  });
  it('mã lô nối số thứ tự trong tháng, mã mẻ theo ngày', () => {
    expect(nextLotCode('NL-BO-01', ['MOVA-TRACE-BO-202611-0912', 'MOVA-TRACE-BO-202611-0913', 'MOVA-TRACE-GAO-202611-0207'], '2026-11-17T03:00:00.000Z')).toBe('MOVA-TRACE-BO-202611-0914');
    expect(nextLotCode('NL-RAU-01', [], '2026-11-17T03:00:00.000Z')).toBe('MOVA-TRACE-RAU-202611-0001');
    expect(nextDailyId('B', ['B-20261117-001', 'B-20261117-002', 'B-20261116-009'], '2026-11-17T03:00:00.000Z')).toBe('B-20261117-003');
  });
});

describe('thao tác ghi của xưởng (lát cắt db.factory)', () => {
  const at = '2026-11-21T03:00:00.000Z';
  const receipt = (o = {}) => ({
    type: 'receipt', opId: 'r1', at, sku: 'NL-BO-01', sourceId: 'SRC-HTX-01', weightKg: 40, tempC: 2.5, photo: PHOTO, verdict: 'pass', lotCode: 'MOVA-TRACE-BO-202611-0914', ...o
  });

  it('nhận nguyên liệu cần nguồn, khối lượng, nhiệt độ, ảnh và lý do khi không đạt', () => {
    const f = emptyFactory();
    expect(applyFactoryOp(f, receipt({ photo: '' })).ok).toBe(false);
    expect(applyFactoryOp(f, receipt({ sourceId: 'X' })).ok).toBe(false);
    expect(applyFactoryOp(f, receipt({ weightKg: 0 })).ok).toBe(false);
    expect(applyFactoryOp(f, receipt({ verdict: 'fail' })).ok).toBe(false);
    expect(applyFactoryOp(f, receipt({ verdict: 'fail', failReason: 'Có mùi lạ' })).ok).toBe(true);
    expect(f.receipts[0].verdict).toBe('fail');
  });

  it('nhiệt độ vượt ngưỡng ngăn mát thì không chọn Đạt được', () => {
    expect(isTempOk('NL-BO-01', 4)).toBe(true);
    expect(isTempOk('NL-BO-01', 6.5)).toBe(false);
    expect(isTempOk('NL-HEO-02', -15)).toBe(false);
    expect(isTempOk('NL-GAO-01', 30)).toBe(true);
    const f = emptyFactory();
    const r = applyFactoryOp(f, receipt({ tempC: 6.5 }));
    expect(r.ok).toBe(false);
    expect(r.code).toBe('TEMP_OUT_OF_RANGE');
  });

  it('bò và gạo bắt buộc gắn lô khi đóng mẻ; lô phải đạt và đúng SKU', () => {
    const f = emptyFactory();
    applyFactoryOp(f, receipt());
    applyFactoryOp(f, receipt({ opId: 'r2', sku: 'NL-RAU-02', sourceId: 'SRC-HTX-03', lotCode: 'MOVA-TRACE-RAU-202611-0001' }));
    applyFactoryOp(f, receipt({ opId: 'r3', lotCode: 'MOVA-TRACE-BO-202611-0915', verdict: 'fail', failReason: 'Nhiệt độ cao' }));
    const batch = (o) => applyFactoryOp(f, { type: 'batch', at, id: 'B-1', key: 'NL-BO-01', bags: 20, ...o });
    expect(batch({}).code).toBe('LOT_REQUIRED');
    expect(batch({ lotCode: 'MOVA-TRACE-RAU-202611-0001' }).code).toBe('LOT_MISMATCH');
    expect(batch({ lotCode: 'MOVA-TRACE-BO-202611-0915' }).code).toBe('LOT_MISMATCH'); // lô không đạt
    expect(batch({ lotCode: 'MOVA-TRACE-BO-202611-0914' }).ok).toBe(true);
    // rau không bắt buộc lô
    expect(applyFactoryOp(f, { type: 'batch', at, id: 'B-2', key: 'NL-RAU-02', bags: 10 }).ok).toBe(true);
    // mã xốt đóng được, không cần lô
    expect(applyFactoryOp(f, { type: 'batch', at, id: 'B-3', key: 'XOT-01', bags: 30 }).ok).toBe(true);
    expect(unbatchedBags({ 'NL-BO-01': 50 }, f.batches, 'NL-BO-01')).toBe(30);
  });

  it('cùng opId chỉ áp một lần; số túi đã làm không âm', () => {
    const f = emptyFactory();
    const op = { type: 'progress', opId: 'p1', scope: '2026-11-23|T1', key: 'NL-BO-01', delta: 10 };
    applyFactoryOp(f, op);
    expect(applyFactoryOp(f, op).duplicate).toBe(true);
    expect(f.progress['2026-11-23|T1']['NL-BO-01']).toBe(10);
    applyFactoryOp(f, { ...op, opId: 'p2', delta: -50 });
    expect(f.progress['2026-11-23|T1']['NL-BO-01']).toBe(0);
    expect(applyFactoryOp(f, { ...op, opId: 'p3', delta: 0 }).ok).toBe(false);
    expect(applyFactoryOp(f, { ...op, opId: 'p4', key: 'HS-CA-01' }).ok).toBe(false); // hải sản không phải việc của xưởng
  });

  it('xuất xe: thiếu thùng phải xác nhận, cần niêm phong và nhiệt độ; xuất rồi thì không sửa được', () => {
    const f = emptyFactory();
    const scope = '2026-11-23|T1';
    applyFactoryOp(f, { type: 'load', scope, orderId: 'ORD-1', at });
    const base = { type: 'depart', scope, at, tempC: 2, sealNo: 'NP-001', expected: ['ORD-1', 'ORD-2'] };
    expect(applyFactoryOp(f, { ...base, sealNo: '' }).ok).toBe(false);
    const miss = applyFactoryOp(f, base);
    expect(miss.code).toBe('BOXES_MISSING');
    expect(miss.missing).toEqual(['ORD-2']);
    const done = applyFactoryOp(f, { ...base, confirmMissing: true });
    expect(done.ok).toBe(true);
    expect(f.loads[scope].missing).toEqual(['ORD-2']);
    expect(f.loads[scope].tempOk).toBe(true);
    expect(applyFactoryOp(f, { type: 'load', scope, orderId: 'ORD-2', at }).code).toBe('TRIP_DEPARTED');
  });

  it('lớp phủ chưa gửi cho kết quả giống hệt khi server áp thật, và không đổi bản gốc', () => {
    const base = emptyFactory();
    const ops = [
      receipt(),
      { type: 'batch', opId: 'b1', at, id: 'B-1', key: 'NL-BO-01', bags: 12, lotCode: 'MOVA-TRACE-BO-202611-0914' },
      { type: 'progress', opId: 'p1', scope: '2026-11-23|T1', key: 'NL-BO-01', delta: 50 },
      { type: 'tick', opId: 't1', orderId: 'ORD-1', key: 'NL-BO-01', count: 1, at }
    ];
    const overlaid = overlayFactory(base, ops);
    const direct = emptyFactory();
    for (const op of ops) applyFactoryOp(direct, op);
    expect(overlaid).toEqual(direct);
    expect(base.receipts).toHaveLength(0);
  });

  it('tiến độ đóng thùng đếm đúng túi xưởng, bỏ qua hải sản', () => {
    const list = {
      items: [
        { key: 'NL-BO-01', bags: 2, hub: false },
        { key: 'XOT-02', bags: 1, hub: false },
        { key: 'HS-CA-01', bags: 1, hub: true }
      ]
    };
    expect(boxProgress(list, { ticks: { 'NL-BO-01': 2, 'XOT-02': 0 } })).toMatchObject({ total: 3, done: 2, complete: false });
    expect(boxProgress(list, { ticks: { 'NL-BO-01': 5, 'XOT-02': 1 } })).toMatchObject({ done: 3, complete: true });
  });

  it('dòng tiến độ có đã làm / cần làm', () => {
    const lists = [
      orderPackList({ id: 'O1', householdSize: 2, zoneId: 'Z1', slotId: 'early_morning_06_08', meals: [{ index: 1, dishes: { protein: 'D-PRT-002', veg: 'D-VEG-002', carb: 'D-CRB-001' } }] })
    ];
    const lines = progressLines(demandTotals(lists), { 'NL-BO-01': 1 });
    const bo = lines.find((l) => l.key === 'NL-BO-01');
    expect(bo).toMatchObject({ need: 1, done: 1, bagGrams: 250 });
  });
});

describe('phiếu sản xuất 3 bảng', () => {
  it('nguyên liệu Đắk Lắk, xốt và hải sản kho phụ nằm đúng bảng', () => {
    const orders = PERSONAS.slice(0, 6).map((p, i) => ({
      householdSize: p.householdSize,
      meals: generateMeals({ householdSize: p.householdSize, goals: p.goals, restrictions: p.restrictions, mealsCount: p.mealsPerWeek, rand: rng(7 + i) })
    }));
    // ép có hải sản để kiểm tra bảng 3
    orders[0].meals[0].dishes.protein = 'D-PRT-005';
    orders[1].meals[0].dishes.protein = 'D-PRT-006';
    const bom = aggregateBom(orders, DISHES);
    const sheet = buildProductionSheet({ day: '2026-11-23', bom, boxes: 6 });
    expect(sheet.code).toBe('BATCH-20261123');
    expect(sheet.table1.every((r) => SKUS[r.code].supplierId === 'S-FACTORY')).toBe(true);
    expect(sheet.table3.map((r) => r.code).sort()).toEqual(['HS-CA-01', 'HS-TOM-02']);
    expect(sheet.table2.every((r) => SAUCES[r.code])).toBe(true);
    expect(sheet.table2.reduce((s, r) => s + r.bags, 0)).toBe(Object.values(bom.sauces).reduce((a, b) => a + b, 0));
    const t1kg = sheet.table1.reduce((s, r) => s + r.qtyKg, 0);
    const factoryKg = Object.entries(bom.skuGrams).filter(([k]) => SKUS[k].supplierId === 'S-FACTORY').reduce((s, [, g]) => s + g / 1000, 0);
    expect(Math.abs(t1kg - factoryKg)).toBeLessThan(0.1 * sheet.table1.length);
    expect(sheet.table1[0].packNote).toMatch(/^Túi \d+g × \d+ túi/);
  });
});
