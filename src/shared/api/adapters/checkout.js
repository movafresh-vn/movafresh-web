// Phễu thanh toán: dựng yêu cầu gửi backend từ bản nháp, và đổi phản hồi (xem trước / đăng ký) sang hình dạng màn thanh toán đã dùng.
// MỌI số tiền hiển thị đều là số máy chủ trả. Ở đây chỉ nhóm, ghép nhãn và chọn gói Suất ăn trả trước trong danh sách gói máy chủ cung cấp.
import { BUSINESS } from '../../config/business';
import { addDays, dowOfKey, fmtDay } from '../../utils/time';
import { slotLabelOf } from './account';

export const DOW_BY_NAME = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
export const NAME_BY_DOW = Object.fromEntries(Object.entries(DOW_BY_NAME).map(([k, v]) => [v, k]));
const WEEKDAY = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export const DEFAULT_INSTRUCTION = Object.freeze({ mode: 'leave_at_reception', photo_required: true });
export const INSTRUCTION_MODES = [
  { mode: 'leave_at_reception', label: 'Để ở lễ tân / bảo vệ, shipper chụp ảnh', photo_required: true },
  { mode: 'leave_at_door', label: 'Để trước cửa căn hộ, shipper chụp ảnh', photo_required: true },
  { mode: 'call_on_arrival', label: 'Gọi điện khi tới, nhận tận tay', photo_required: false },
  { mode: 'hand_to_customer', label: 'Giao tận tay người nhận', photo_required: false }
];

/** Hướng dẫn giao hợp lệ gửi backend: để lại hàng thì BẮT BUỘC ảnh (backend cũng từ chối photo_required=false). */
export function normalizeInstruction(i) {
  const known = INSTRUCTION_MODES.find((m) => i && m.mode === i.mode);
  if (!known) return { ...DEFAULT_INSTRUCTION };
  const note = i.note ? String(i.note).trim().slice(0, 200) : '';
  return { mode: known.mode, photo_required: known.photo_required ? true : Boolean(i.photo_required), ...(note ? { note } : {}) };
}

/** GET /delivery/options → lựa chọn lịch giao. 2 lần mỗi tuần: ghép hai thứ giao đầu của khu, chỉ giữ khung giờ chung. */
export function adaptDeliveryOptions(raw, { perWeek = 1, leadHours = BUSINESS.timings.remindBeforeDeliveryHours } = {}) {
  const one = raw.options.map((o) => ({
    dows: o.preferred_days.map((n) => DOW_BY_NAME[n]),
    names: o.preferred_days,
    first: o.first_delivery_date,
    deadline: o.first_dish_change_deadline,
    slots: o.slots
  }));
  let sets;
  if (perWeek === 2) {
    sets = one.length >= 2
      ? [(() => {
          const [a, b] = one;
          const common = a.slots.filter((s) => b.slots.some((x) => x.slot_id === s.slot_id));
          const firstDates = { [a.names[0]]: a.first, [b.names[0]]: b.first };
          return { dows: [...a.dows, ...b.dows], names: [...a.names, ...b.names], first: a.first <= b.first ? a.first : b.first, deadline: a.first <= b.first ? a.deadline : b.deadline, slots: common, firstDates };
        })()]
      : [];
  } else {
    sets = one.map((o) => ({ ...o, firstDates: { [o.names[0]]: o.first } }));
  }
  const options = sets.filter((s) => s.slots.length).map((s) => ({
    preferred_days: s.names,
    day_labels: s.dows.map((d) => WEEKDAY[d]),
    first_dates: s.firstDates,
    first_delivery_date: s.first,
    first_delivery_label: fmtDay(s.first),
    first_dish_change_deadline: s.deadline,
    slots: s.slots.map((x) => ({ slot_id: x.slot_id, label: x.label || slotLabelOf(x.slot_id) || x.slot_id }))
  }));
  return { zone_id: raw.zone_id, zone_name: raw.zone_name, province: raw.province, districts: raw.districts, lead_time_notice_hours: leadHours, options };
}

/** Các ngày giao của cả gói: mỗi thứ giao bắt đầu từ ngày đầu tiên của nó, cách nhau 7 ngày; gộp và sắp tăng dần. */
export function deliveryDatesFor({ preferredDays, firstDates, deliveries }) {
  const per = preferredDays.length || 1;
  const rows = [];
  for (const name of preferredDays) {
    const first = firstDates && firstDates[name];
    if (!first) return null;
    const n = Math.ceil(deliveries / per);
    for (let i = 0; i < n; i++) rows.push(addDays(first, 7 * i));
  }
  return rows.sort().slice(0, deliveries);
}

/** Chia các bữa của một tuần cho từng lần giao: 1 lần mỗi tuần giữ nguyên, 2 lần thì chia đều (lần đầu nhiều hơn một bữa nếu lẻ). */
export function splitMeals(meals, perWeek) {
  if (perWeek <= 1) return [meals];
  const first = Math.ceil(meals.length / 2);
  return [meals.slice(0, first), meals.slice(first)];
}

/** Các bữa (đã chọn món) → dòng món gửi backend. meal_index đánh lại từ 1 trong từng lần giao. */
export function mealRows(meals, servings) {
  const rows = [];
  meals.forEach((m, i) => {
    for (const kind of ['protein', 'soup', 'veg', 'carb', 'dessert']) {
      if (m.dishes[kind]) rows.push({ meal_index: i + 1, kind, dish_id: m.dishes[kind], servings });
    }
  });
  return rows;
}

/**
 * Yêu cầu gửi POST /subscription/preview và /create-or-renew. KHÔNG có số tiền nào (backend bỏ qua mọi số tiền client gửi).
 * `weeksOfMeals(weekNumber)` trả các bữa của tuần thứ weekNumber (tuần 1 là thực đơn khách đã chốt).
 */
export function buildSubscriptionBody({ req, servings, weeksOfMeals }) {
  const sched = req.schedule || {};
  const perWeek = sched.delivery_frequency === 'twice_a_week' ? 2 : 1;
  const cycleWeeks = Math.max(BUSINESS.subscription.minWeeks, Math.ceil((req.duration_weeks || BUSINESS.subscription.defaultWeeks)));
  const deliveries = cycleWeeks * perWeek;
  const dates = deliveryDatesFor({ preferredDays: sched.preferred_days || [], firstDates: sched.first_dates, deliveries });
  if (!dates) return { error: { code: 'DAY_NOT_AVAILABLE', message: 'Chưa có ngày giao đầu tiên cho lựa chọn này' } };
  const weeks = [];
  for (let w = 0; w < cycleWeeks; w++) {
    const parts = splitMeals(weeksOfMeals(w + 1), perWeek);
    for (let k = 0; k < perWeek; k++) {
      weeks.push({ week_index: weeks.length + 1, delivery_date: dates[weeks.length], meals: mealRows(parts[k] || [], servings) });
    }
  }
  const addr = sched.shipping_address || {};
  const body = {
    profile_id: req.profile_id,
    plan_id: req.plan_id,
    duration_weeks: deliveries,
    payment_method: req.payment_method,
    auto_debit_enabled: req.auto_debit_enabled ?? req.payment_method !== 'bank_transfer_4w',
    schedule: {
      delivery_frequency: perWeek === 2 ? 'twice_a_week' : 'once_a_week',
      preferred_days: sched.preferred_days || [],
      preferred_time_slot: sched.preferred_time_slot,
      delivery_instruction: normalizeInstruction(sched.delivery_instruction),
      shipping_address: {
        street: addr.street, district: addr.district, city: addr.city, receiver_name: addr.receiver_name, receiver_phone: addr.receiver_phone,
        ...(addr.ward ? { ward: String(addr.ward).trim().slice(0, 60) } : {})
      }
    },
    voucher_code: req.voucher_code || null,
    phone_verified: req.phone_verified !== false,
    weeks
  };
  if (req.referral_code) body.referral_code = req.referral_code;
  if (req.newsletter_optin) body.newsletter_opt_in = true;
  if (req.topup_pay_vnd) body.topup_pay_vnd = req.topup_pay_vnd;
  // Chiến dịch chốt món: backend bỏ qua nếu không có chiến dịch đang chạy; web chỉ gửi khi khách bấm nhận ưu đãi.
  if (req.lock_menu === true) body.lock_menu = true;
  // Giao nhanh 24-36 giờ (ĐỀ XUẤT 2.4.0): tuần 1 giao đúng ngày của chỗ đã giữ, trừ Fresh Credit ngay. Các tuần sau giữ lịch khách chọn.
  if (req.express && req.express.hold_id) {
    body.express_hold_id = req.express.hold_id;
    body.weeks[0].delivery_date = req.express.day;
    body.payment_method = 'fresh_credit';
  }
  return { body, perWeek, dates };
}

/** Gói Suất ăn trả trước nhỏ nhất đủ giá trị cho phần còn thiếu; các gói lớn hơn làm lựa chọn thêm. */
export function pickPacks(packs, needVnd) {
  const sorted = [...packs].sort((a, b) => a.pay_vnd - b.pay_vnd);
  if (needVnd <= 0) return { exact: null, larger: sorted, covered: true };
  const exact = sorted.find((p) => p.credit_received_vnd >= needVnd) || null;
  return { exact, larger: exact ? sorted.filter((p) => p.pay_vnd > exact.pay_vnd) : [], covered: false };
}

/**
 * Số tiền khách thật sự trả HÔM NAY và nhãn nút thanh toán (số do máy chủ tính, ở đây chỉ chọn số nào theo phương thức).
 * - Fresh Credit đủ tiền tuần 1: trừ tuần 1 từ credit, không phải chuyển khoản gì → nút "Kích hoạt gói".
 * - Fresh Credit thiếu: phải mua gói trả trước nhỏ nhất đủ phần thiếu (packPayVnd) trước khi kích hoạt.
 * - Chuyển khoản: cả gói một lần. Thẻ/ví: chỉ tuần 1.
 * Trả { amount_vnd, label, kind: 'activate' | 'buy_pack' | 'bank' | 'card' }.
 */
export function payTodayInfo(preview, method, { packPayVnd = 0, fmtVnd = (n) => String(n) } = {}) {
  if (!preview) return { amount_vnd: 0, label: 'Chọn ngày giao để tiếp tục', kind: 'none' };
  if (method === 'bank_transfer_4w') {
    const v = preview.bank_transfer_4w.pay_vnd;
    return { amount_vnd: v, label: `Tôi đã chuyển khoản ${fmtVnd(v)}`, kind: 'bank' };
  }
  if (method === 'card') {
    const v = preview.card.charge_now_vnd;
    return { amount_vnd: v, label: `Liên kết thẻ/ví, trả ${fmtVnd(v)} hôm nay`, kind: 'card' };
  }
  const f = preview.fresh_credit;
  if (f.covered) return { amount_vnd: f.week1_payable_vnd, label: 'Kích hoạt gói', kind: 'activate' };
  return { amount_vnd: packPayVnd, label: packPayVnd > 0 ? `Mua gói ${fmtVnd(packPayVnd)} để đủ tiền tuần 1` : 'Chưa có gói phù hợp', kind: 'buy_pack' };
}

/** Các lần giao → các "tuần" của gói (mỗi tuần 1 hoặc 2 lần giao): tổng tiền, hạn đổi món sớm nhất. */
export function groupCycleWeeks(rows) {
  const groups = [];
  for (const r of rows) {
    const g = groups[r.week_index] || (groups[r.week_index] = { week_index: r.week_index, deliveries: 0, delivery_date: r.delivery_date, charge_at: r.charge_at, cutoff_at: r.cutoff_at, amount_vnd: 0, discount_vnd: 0, list_price_vnd: 0 });
    g.deliveries += 1;
    g.amount_vnd += r.amount_vnd;
    g.discount_vnd += r.discount_vnd;
    g.list_price_vnd += r.list_price_vnd;
    if (r.cutoff_at < g.cutoff_at) g.cutoff_at = r.cutoff_at;
  }
  return groups;
}

/**
 * POST /subscription/preview → hình dạng màn thanh toán.
 * ctx: { perWeek, slotId, packs (đã adaptPacks), balanceVnd, paymentRef }
 */
export function adaptPreview(raw, ctx) {
  const perWeek = ctx.perWeek || 1;
  const payAll = raw.total_order_amount_vnd - raw.total_discount_vnd;
  const rows = raw.weeks.map((w, i) => ({
    week_index: Math.floor(i / perWeek),
    box_index: i % perWeek,
    delivery_date: w.delivery_date,
    delivery_at: null,
    charge_at: w.charge_at,
    cutoff_at: w.cutoff_at,
    list_price_vnd: w.amount_vnd,
    discount_vnd: w.discount_vnd,
    amount_vnd: w.pay_vnd
  }));
  const groups = groupCycleWeeks(rows);
  const week1 = rows.filter((r) => r.week_index === 0);
  // Máy chủ chỉ trừ TỪNG TUẦN: "đủ credit" nghĩa là real + promo >= tiền tuần 1 thật (week1_payable_vnd), không phải cả gói.
  const week1Payable = Number.isFinite(raw.week1_payable_vnd) ? raw.week1_payable_vnd : week1.reduce((s, r) => s + r.amount_vnd, 0);
  const balance = Math.max(0, ctx.balanceVnd || 0);
  const need = week1Payable - balance;
  const { exact, larger, covered } = pickPacks(ctx.packs || [], need);
  const packOut = (p) => ({ pack_id: p.pack_id, label: p.label, pay_vnd: p.pay_vnd, bonus_vnd: p.bonus_vnd, credit_received_vnd: p.credit_received_vnd, capped: false });
  return {
    payment_ref: ctx.paymentRef || null,
    slot: slotLabelOf(ctx.slotId),
    weeks: groups.length,
    package_value_vnd: raw.total_order_amount_vnd,
    gift_total_vnd: raw.total_discount_vnd,
    pay_all_vnd: payAll,
    week1_payable_vnd: week1Payable,
    referral: raw.referral || null,
    // Tuần dời vì nghỉ lễ (ví dụ Tết): ngày khách chọn ban đầu, null nếu không dời.
    shifted_weeks: raw.weeks.map((w, i) => (w.shifted_from ? { week_index: Math.floor(i / perWeek), shifted_from: w.shifted_from, delivery_date: w.delivery_date } : null)).filter(Boolean),
    slot_full: raw.slot_full,
    full_dates: raw.full_dates || [],
    deliveries: rows,
    cycle_weeks: groups,
    first_delivery_date: rows[0].delivery_date,
    first_dish_change_deadline: rows[0].cutoff_at,
    bank_transfer_4w: { pay_vnd: payAll },
    card: {
      charge_now_vnd: week1.reduce((s, r) => s + r.amount_vnd, 0),
      charges: rows.map((r) => ({ week_index: r.week_index, amount_vnd: r.amount_vnd, charge_at: r.charge_at, now: r.week_index === 0 }))
    },
    fresh_credit: {
      covered,
      balance_vnd: ctx.balanceVnd || 0,
      week1_payable_vnd: week1Payable,
      need_vnd: Math.max(0, need),
      shortfall_vnd: Math.max(0, need),
      pay_vnd: exact ? exact.pay_vnd : 0,
      bonus_vnd: exact ? exact.bonus_vnd : 0,
      credit_received_vnd: exact ? exact.credit_received_vnd : 0,
      pack_id: exact ? exact.pack_id : null,
      pack_label: exact ? exact.label : null,
      capped: false,
      packs: larger.map(packOut)
    }
  };
}

/** POST /subscription/create-or-renew → kết quả đăng ký cho màn "Hoàn tất". */
export function adaptCreated(raw, { perWeek = 1, slotId = '' } = {}) {
  const cw = raw.cycle_weeks || [];
  const rows = cw.map((w, i) => ({
    week_index: Math.floor(i / perWeek), box_index: i % perWeek, delivery_date: w.delivery_date, delivery_at: null, charge_at: w.charge_at, cutoff_at: w.cutoff_at,
    list_price_vnd: w.amount_vnd, discount_vnd: w.discount_vnd, amount_vnd: w.amount_vnd - w.discount_vnd
  }));
  const bal = raw.credit_balance || { real_vnd: 0, promo_vnd: 0 };
  return {
    subscription_id: raw.subscription_id,
    status: raw.status,
    payment_ref: raw.payment_ref,
    cycle_start_date: raw.cycle_start_date,
    cycle_end_date: raw.cycle_end_date,
    package_value_vnd: cw.reduce((s, w) => s + w.amount_vnd, 0),
    total_order_amount_vnd: raw.total_order_amount_vnd,
    voucher_discount_applied_week1_vnd: raw.voucher_discount_applied_week1_vnd,
    voucher_future_credits_locked_vnd: raw.voucher_future_credits_locked_vnd,
    charged_from_fresh_credit_vnd: raw.charged_from_fresh_credit_vnd,
    paid_now_vnd: raw.charged_from_fresh_credit_vnd,
    // Tuần 1 đã trừ từ Fresh Credit chưa (0 = chưa trừ, trừ ở mốc 72 giờ trước giờ giao)
    week1_charged: (raw.charged_from_fresh_credit_vnd || 0) > 0,
    fresh_credit_balance_remaining_vnd: bal.real_vnd + bal.promo_vnd,
    credit_balance: bal,
    referral: raw.referral || null,
    delivery_instruction: raw.delivery_instruction,
    auto_debit_cutoff_hours: raw.auto_debit_cutoff_hours,
    dish_customization_cutoff_at: raw.dish_customization_cutoff_at,
    next_delivery: { date: raw.next_delivery.date, slot: slotLabelOf(raw.next_delivery.slot) || raw.next_delivery.slot || slotLabelOf(slotId), dish_change_deadline: raw.next_delivery.dish_change_deadline },
    deliveries: rows,
    cycle_weeks: groupCycleWeeks(rows)
  };
}

export { dowOfKey };
