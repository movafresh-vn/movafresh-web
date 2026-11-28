/**
 * @file deliveryDates.js
 * Pure domain helpers cho việc chọn ngày giao khả dụng sớm nhất và đồng bộ
 * trạng thái từng khung giờ từ dữ liệu GET /delivery/available-dates.
 */

export const DATE_REASON_LABELS = {
  holiday: 'Ngày lễ',
  batch_locked: 'Lô đã chốt',
  cutoff_passed: 'Qua giờ chốt',
  lead_time_not_met: 'Chưa đủ giờ đặt trước',
  slot_full: 'Hết chỗ'
};

export function reasonLabel(reason) {
  return DATE_REASON_LABELS[reason] || 'Không khả dụng';
}

/**
 * Kiểm tra một khung giờ trong ngày có cho phép đặt giao mới hay không.
 */
export function isSlotSelectable(day, slot, earliestCycleDate = null) {
  if (!day || !slot) return false;
  if (day.is_holiday || day.batch_locked) return false;
  if (earliestCycleDate && day.delivery_date && day.delivery_date < earliestCycleDate) return false;
  if (!slot.available) return false;
  return Number(slot.remaining || 0) > 0;
}

/**
 * Tìm ngày + khung giờ khả dụng sớm nhất trong danh sách ngày từ máy chủ.
 * Tự động bỏ qua ngày nghỉ lễ, lô đã chốt, trùng chu kỳ, quá giờ chốt hoặc hết suất.
 */
export function pickEarliestFeasibleDate(dates = [], earliestCycleDate = null) {
  if (!Array.isArray(dates) || !dates.length) return null;
  const sorted = [...dates].sort((a, b) => String(a.delivery_date).localeCompare(String(b.delivery_date)));
  for (const day of sorted) {
    const slots = Array.isArray(day.slots) ? day.slots : [];
    const slot = slots.find((s) => isSlotSelectable(day, s, earliestCycleDate));
    if (slot) {
      return {
        delivery_date: day.delivery_date,
        day_name: day.day_name || '',
        slot_id: slot.slot_id,
        day,
        slot
      };
    }
  }
  return null;
}

/**
 * Tìm ngày tối thiểu được phép chọn trên #first-date.
 */
export function resolveMinDeliveryDate(dates = [], earliestCycleDate = null) {
  const earliest = pickEarliestFeasibleDate(dates, earliestCycleDate);
  if (earliest?.delivery_date) return earliest.delivery_date;
  return earliestCycleDate || '';
}

/**
 * Kiểm tra xem ngày `isoDate` (và khung giờ `slotId` nếu có) có bị đóng/quá hạn
 * trong cửa sổ `dates` đã biết hay không.
 * Lưu ý: Ngày tương lai xa nằm ngoài cửa sổ 14 ngày của `dates` được coi là hợp lệ
 * (không ép quay về ngày sớm nhất) miễn là >= minDate và không bị cycle-block.
 */
export function isDateKnownClosed(dates = [], isoDate, slotId = '', earliestCycleDate = null) {
  if (!isoDate) return true;
  if (earliestCycleDate && isoDate < earliestCycleDate) return true;
  const minDate = resolveMinDeliveryDate(dates, earliestCycleDate);
  if (minDate && isoDate < minDate) return true;
  const day = dates.find((d) => d.delivery_date === isoDate);
  if (!day) return false;
  const slots = Array.isArray(day.slots) ? day.slots : [];
  if (slotId) {
    return !slots.some((s) => s.slot_id === slotId && isSlotSelectable(day, s, earliestCycleDate));
  }
  return !slots.some((s) => isSlotSelectable(day, s, earliestCycleDate));
}

/**
 * Trả về metadata trình bày sạch cho từng Date Group Card.
 */
export function resolveDateCardState(day, earliestCycleDate = null, earliestFeasibleDate = null) {
  const slots = Array.isArray(day?.slots) ? day.slots : [];
  const isCycleBlocked = Boolean(earliestCycleDate && day?.delivery_date && day.delivery_date < earliestCycleDate);
  const openSlots = slots.filter((s) => isSlotSelectable(day, s, earliestCycleDate));
  const hasAvailable = openSlots.length > 0 && !day?.is_holiday && !day?.batch_locked && !isCycleBlocked;

  let statusTag = '';
  let statusKind = 'open';
  if (isCycleBlocked) {
    statusTag = 'Đã có gói trong chu kỳ';
    statusKind = 'blocked';
  } else if (day?.is_holiday) {
    statusTag = 'Ngày lễ';
    statusKind = 'holiday';
  } else if (day?.batch_locked) {
    statusTag = 'Lô đã chốt';
    statusKind = 'closed';
  } else if (!openSlots.length) {
    const reasons = slots.map((s) => s.reason).filter(Boolean);
    if (reasons.includes('slot_full') && !reasons.includes('cutoff_passed')) {
      statusTag = 'Hết chỗ';
    } else if (reasons.includes('lead_time_not_met')) {
      statusTag = 'Chưa đủ giờ đặt trước';
    } else {
      statusTag = 'Đã chốt sổ';
    }
    statusKind = 'closed';
  } else if (earliestFeasibleDate && day.delivery_date === earliestFeasibleDate) {
    statusTag = 'Sớm nhất';
    statusKind = 'earliest';
  }

  return {
    isCycleBlocked,
    hasAvailable,
    isClosed: !hasAvailable,
    isEarliest: statusKind === 'earliest',
    statusTag,
    statusKind
  };
}
