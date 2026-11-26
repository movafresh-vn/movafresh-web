import { BUSINESS } from '../config/business';
import { fmt } from '../utils/formatters';
import { quotePackage } from './planQuote';

/**
 * Câu hỏi Q6 (ngân sách đi chợ mỗi tuần) phải khớp gói 4 tuần: mỗi mức tuần được quy ra giá trị cả gói và đơn giá mỗi bữa,
 * để khách thấy mức mình chọn tương ứng gói nào. Đây là ƯỚC TÍNH để định hướng (trần mềm cho Đầu bếp); số tiền thật
 * khách phải trả luôn do máy chủ tính ở bước xem thực đơn và thanh toán.
 */
export function budgetExplain(weeklyVnd, { mealsPerWeek = BUSINESS.plan.mealsPerWeekDefault, weeks = BUSINESS.subscription.defaultWeeks } = {}, cfg = BUSINESS) {
  const weekly = Number(weeklyVnd);
  if (!Number.isFinite(weekly) || weekly <= 0) return null;
  const q = quotePackage({ weekValueVnd: weekly, mealsPerWeek, weeks }, cfg);
  return {
    weeklyVnd: weekly,
    weeks,
    mealsPerWeek,
    packageValueVnd: q.packageValueVnd,
    perMealVnd: q.perMealListVnd,
    text: `Mức ${fmt(weekly)}/tuần tương ứng khoảng ${fmt(q.packageValueVnd)} cho gói ${weeks} tuần (~${fmt(q.perMealListVnd)}/bữa, ${mealsPerWeek} bữa mỗi tuần). Đây là ước tính; số tiền thực tế do hệ thống tính khi bạn xem thực đơn.`
  };
}

/** Nhãn một lựa chọn ngân sách: "Đến 1.000.000đ/tuần (gói 4 tuần ≈ 4.000.000đ)". */
export function budgetChoiceLabel(weeklyVnd, opts = {}) {
  const e = budgetExplain(weeklyVnd, opts);
  return e ? `Đến ${fmt(e.weeklyVnd)}/tuần (gói ${e.weeks} tuần ≈ ${fmt(e.packageValueVnd)})` : '';
}
