import { describe, expect, it } from 'vitest';
import { read } from './helpers/asyncScan';
import {
  isDateKnownClosed,
  isSlotSelectable,
  pickEarliestFeasibleDate,
  resolveDateCardState,
  resolveMinDeliveryDate
} from '../domain/deliveryDates';

function makeDay(date, dayName, slots, extra = {}) {
  return {
    delivery_date: date,
    day_name: dayName,
    is_holiday: false,
    batch_locked: false,
    slots,
    ...extra
  };
}

const openSlot = (id = 'early_morning_06_08', label = '06:00–08:00', remaining = 5) => ({
  slot_id: id,
  label,
  available: remaining > 0,
  remaining,
  reason: remaining > 0 ? null : 'slot_full'
});

const closedSlot = (id = 'early_morning_06_08', label = '06:00–08:00', reason = 'cutoff_passed') => ({
  slot_id: id,
  label,
  available: false,
  remaining: 0,
  reason
});

describe('W2: chọn ngày giao khả dụng sớm nhất & đồng bộ bảng ngày', () => {
  it('bỏ qua ngày quá giờ chốt sổ, hết suất, ngày lễ, lô đã chốt và trùng chu kỳ để chọn ngày + khung giờ mở đầu tiên', () => {
    const dates = [
      makeDay('2026-11-28', 'saturday', [closedSlot('s1', '06:00–08:00', 'cutoff_passed'), closedSlot('s2', '10:00–12:00', 'lead_time_not_met')]),
      makeDay('2026-11-29', 'sunday', [openSlot('s1', '06:00–08:00', 8)], { is_holiday: true }),
      makeDay('2026-11-30', 'monday', [openSlot('s1', '06:00–08:00', 8)], { batch_locked: true }),
      makeDay('2026-12-01', 'tuesday', [openSlot('s1', '06:00–08:00', 0), openSlot('s2', '17:00–19:00', 4)]),
      makeDay('2026-12-02', 'wednesday', [openSlot('s1', '06:00–08:00', 9)])
    ];

    const picked = pickEarliestFeasibleDate(dates);
    expect(picked).not.toBeNull();
    expect(picked.delivery_date).toBe('2026-12-01');
    expect(picked.slot_id).toBe('s2');
    expect(resolveMinDeliveryDate(dates)).toBe('2026-12-01');
  });

  it('tôn trọng earliestCycleDate và bỏ qua các ngày nằm trong chu kỳ hiện tại', () => {
    const dates = [
      makeDay('2026-12-01', 'tuesday', [openSlot('s1', '06:00–08:00', 6)]),
      makeDay('2026-12-08', 'tuesday', [openSlot('s1', '06:00–08:00', 4)])
    ];
    const picked = pickEarliestFeasibleDate(dates, '2026-12-08');
    expect(picked?.delivery_date).toBe('2026-12-08');
    expect(resolveMinDeliveryDate(dates, '2026-12-08')).toBe('2026-12-08');
  });

  it('giữ nguyên ngày tương lai hợp lệ ngoài cửa sổ 14 ngày thay vì ép quay về ngày sớm nhất', () => {
    const dates = [
      makeDay('2026-11-28', 'saturday', [closedSlot()]),
      makeDay('2026-11-30', 'monday', [openSlot('s1', '06:00–08:00', 5)])
    ];
    expect(isDateKnownClosed(dates, '2026-11-28')).toBe(true);
    expect(isDateKnownClosed(dates, '2026-11-30', 's1')).toBe(false);
    expect(isDateKnownClosed(dates, '2026-12-22')).toBe(false);
  });

  it('trả về trạng thái Date Group Card rõ ràng: Sớm nhất vs Đã chốt sổ vs Hết chỗ', () => {
    const d0 = makeDay('2026-11-28', 'saturday', [closedSlot('s1', '06:00–08:00', 'cutoff_passed')]);
    const d1 = makeDay('2026-11-30', 'monday', [openSlot('s1', '06:00–08:00', 5)]);
    const d2 = makeDay('2026-12-01', 'tuesday', [closedSlot('s1', '06:00–08:00', 'slot_full')]);

    expect(resolveDateCardState(d0, null, '2026-11-30')).toMatchObject({ isClosed: true, statusTag: 'Đã chốt sổ', statusKind: 'closed' });
    expect(resolveDateCardState(d1, null, '2026-11-30')).toMatchObject({ isClosed: false, isEarliest: true, statusTag: 'Sớm nhất', statusKind: 'earliest' });
    expect(resolveDateCardState(d2, null, '2026-11-30')).toMatchObject({ isClosed: true, statusTag: 'Hết chỗ', statusKind: 'closed' });
    expect(isSlotSelectable(d1, openSlot('s1', '06:00–08:00', 0))).toBe(false);
  });

  it('StepCheckout.vue ràng buộc #first-date :min, banner Sớm nhất khả dụng và bố cục nút 2 phần không dính chữ', () => {
    const src = read('components/plans/StepCheckout.vue');
    expect(src).toMatch(/:min="minSelectableDate \|\| undefined"/);
    expect(src).toMatch(/Sớm nhất khả dụng:/);
    expect(src).toMatch(/pickEarliestFeasibleDate/);
    expect(src).toMatch(/slot-left[\s\S]*slot-right-pill/);
  });

  it('StepAbout.vue bỏ emoji nổi giữa ảnh và ProfileTab.vue chuẩn hóa checkbox sang pill card', () => {
    const about = read('components/plans/StepAbout.vue');
    expect(about).not.toMatch(/art-center-illustration|center-emoji/);

    const profile = read('components/dashboard/ProfileTab.vue');
    expect(profile).toMatch(/choice-pill-input/);
    expect(profile).toMatch(/inline-flex/);
    expect(profile).toMatch(/min-height:\s*44px/);
  });
});
