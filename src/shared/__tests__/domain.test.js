import { describe, it, expect } from 'vitest';
import { vnDate, dayKey, addDays, dowOfKey, atDay, fmtDeadline, dayKeySequence } from '../utils/time';
import { giftCardSchedule, capFirstCycleIncentives, topUpBonus } from '../domain/pricing';
import { aggregateBom } from '../domain/bom';
import { DISHES } from '../data/catalog';
import { cutoffAtFor, chargeAtFor, upcomingDeliveryDays } from '../domain/delivery';
import { BUSINESS } from '../config/business';

describe('thời gian theo giờ Việt Nam', () => {
  it('vnDate / dayKey đi và về đúng, không phụ thuộc múi giờ máy', () => {
    const d = vnDate(2026, 11, 20, 9, 0);
    expect(d.toISOString()).toBe('2026-11-20T02:00:00.000Z');
    expect(dayKey(d)).toBe('2026-11-20');
  });

  it('addDays qua tháng và năm', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-23', -2)).toBe('2026-11-21');
  });

  it('thứ trong tuần và nhãn hạn đổi món hiển thị ngày giờ cụ thể', () => {
    expect(dowOfKey('2026-11-20')).toBe(5); // Thứ Sáu
    expect(fmtDeadline(atDay('2026-11-27', 8, 0))).toBe('08:00 Thứ Sáu 27/11');
  });

  it('dayKeySequence lấy đúng các thứ', () => {
    expect(dayKeySequence([1], '2026-11-20', 2)).toEqual(['2026-11-23', '2026-11-30']);
  });
});

describe('ưu đãi chu kỳ đầu', () => {
  it('thẻ quà tặng của gói nhỏ bị thu nhỏ, không miễn phí trọn tuần 1', () => {
    const schedule = giftCardSchedule(1000000);
    const total = schedule.reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(1000000 * BUSINESS.incentives.giftCardMaxPctOfPackage + 2000);
    expect(schedule[0]).toBeLessThan(1000000);
  });

  it('gói đủ lớn giữ nguyên lịch 300/200/200/200', () => {
    expect(giftCardSchedule(10000000)).toEqual([300000, 200000, 200000, 200000]);
  });

  it('thưởng nạp 25% + thẻ quà tặng lớn bị chặn ở trần tổng, giảm thưởng nạp trước', () => {
    const pack = 4000000;
    const gift = giftCardSchedule(pack).reduce((a, b) => a + b, 0);
    const bonus = topUpBonus(3000000, 0.25); // 750.000
    const r = capFirstCycleIncentives({ packageValueVnd: pack, giftCardTotal: gift, topUpBonusVnd: bonus });
    expect(r.capped).toBe(true);
    expect(r.totalDiscountVnd).toBeLessThanOrEqual(r.capVnd);
    expect(r.totalDiscountVnd / pack).toBeLessThanOrEqual(BUSINESS.incentives.maxFirstCycleDiscountPct + 1e-9);
    expect(r.giftCardTotal).toBe(gift); // thẻ quà tặng giữ nguyên
    expect(r.topUpBonusVnd).toBeLessThan(bonus); // thưởng nạp bị giảm
  });

  it('thưởng nạp thường xuyên 10% không bị chặn', () => {
    const r = capFirstCycleIncentives({ packageValueVnd: 4000000, giftCardTotal: 0, topUpBonusVnd: topUpBonus(1500000, 0.1) });
    expect(r.capped).toBe(false);
    expect(r.topUpBonusVnd).toBe(150000);
  });
});

describe('BOM Reverse Aggregator', () => {
  const orders = [
    { householdSize: 2, meals: [{ dishes: { protein: 'D-PRT-001', veg: 'D-VEG-002', carb: 'D-CRB-001' }, proteinFactor: 1 }] },
    { householdSize: 1, meals: [{ dishes: { protein: 'D-PRT-001', veg: 'D-VEG-002', carb: 'D-CRB-001' }, proteinFactor: 1.3 }] }
  ];

  it('gom nguyên liệu, túi xốt và thùng', () => {
    const bom = aggregateBom(orders, DISHES);
    expect(bom.skuGrams['NL-HEO-02']).toBe(Math.round(120 * 2 + 120 * 1.3)); // 396
    expect(bom.skuGrams['NL-GAO-01']).toBe(80 * 2 + 80);
    expect(bom.skuGrams['NL-RAU-02']).toBe(100 * 2 + 100);
    expect(bom.sauces).toEqual({ 'XOT-01': 2, 'XOT-04': 2 });
    expect(bom.boxes).toBe(2);
    expect(bom.packaging).toEqual({ 'BB-THUNG-01': 2 });
  });

  it('báo lỗi khi món không có trong danh mục', () => {
    expect(() => aggregateBom([{ householdSize: 1, meals: [{ dishes: { protein: 'X' } }] }], DISHES)).toThrow();
  });
});

describe('mốc giao hàng', () => {
  it('chốt sổ là 08:00 hai ngày trước ngày giao, trừ tiền là 72h trước khung giao', () => {
    expect(cutoffAtFor('2026-11-23').toISOString()).toBe('2026-11-21T01:00:00.000Z'); // 08:00 giờ VN
    const slot = { startHour: 18, startMin: 30 };
    expect(chargeAtFor('2026-11-23', slot).toISOString()).toBe('2026-11-20T11:30:00.000Z'); // Thứ Sáu 18:30
  });

  it('ngày giao kế tiếp chỉ gồm những ngày mà giờ chốt sổ còn ở tương lai', () => {
    // Z1 giao Thứ Hai & Thứ Năm. Bây giờ là Thứ Sáu 20/11 09:00.
    const now = vnDate(2026, 11, 20, 9, 0);
    const days = upcomingDeliveryDays('Z1', now, 3);
    expect(days[0]).toBe('2026-11-23'); // chốt sổ Thứ Bảy 21/11 08:00 còn ở tương lai
    // Quá giờ chốt sổ của ngày 23/11 thì ngày đó không còn đặt được nữa
    const late = vnDate(2026, 11, 21, 9, 0);
    expect(upcomingDeliveryDays('Z1', late, 1)[0]).toBe('2026-11-26');
  });
});
