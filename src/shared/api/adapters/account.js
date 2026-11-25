// Chuyển phản hồi của backend (mô hình dữ liệu: tuần giao, ngăn Fresh Credit, ...) sang hình dạng mà các màn /account đã dùng,
// để giao diện đổi ít nhất. Mọi hàm ở đây là hàm thuần: nhận dữ liệu backend, trả dữ liệu cho giao diện, không gọi mạng.
import { BUSINESS } from '../../config/business';
import { DISHES, SAUCES } from '../../data/catalog';
import { fmtDay, fmtDeadline } from '../../utils/time';

/** Backend đánh số tuần từ 1; giao diện (từ bản giả lập) đánh số từ 0 và hiện "Tuần {index + 1}". */
export const toViewIndex = (n) => (n === null || n === undefined ? null : Number(n) - 1);
export const toApiIndex = (n) => Number(n) + 1;

const DISH_ORDER = ['protein', 'soup', 'veg', 'carb', 'dessert'];
const SWAPPABLE = ['protein', 'veg', 'soup', 'carb'];

/** Nhãn khung giờ theo mã (cấu hình khung giờ nằm ở BUSINESS, dùng chung mọi khu). */
export function slotLabelOf(slotId) {
  for (const z of BUSINESS.zones) {
    const s = z.slots.find((x) => x.id === slotId);
    if (s) return s.label;
  }
  return '';
}

const sauceNameOf = (dishId) => {
  const d = DISHES[dishId];
  return d && d.sauce && SAUCES[d.sauce] ? SAUCES[d.sauce].name : null;
};

const balanceOut = (b) => ({ real_vnd: b.real_vnd, promo_vnd: b.promo_vnd, total_vnd: b.total_vnd ?? b.real_vnd + b.promo_vnd });

export function adaptSubscription(s) {
  if (!s) return null;
  return {
    id: s.id,
    status: s.status,
    weeks: s.weeks,
    payment_method: s.payment_method,
    deliveries_per_week: s.deliveries_per_week || 1,
    zone_id: s.zone_id,
    zone_name: s.zone_name,
    slot_id: s.slot_id,
    slot_label: slotLabelOf(s.slot_id),
    skips_used: s.skips_used,
    skips_max: s.skips_max,
    created_at: s.created_at,
    cancelled_at: s.cancelled_at,
    first_delivery_date: s.first_delivery_date,
    delivery_instruction: s.delivery_instruction || null
  };
}

export function adaptAlert(a) {
  if (!a) return null;
  const pack = a.suggested_pack;
  return {
    ...a,
    week_index: toViewIndex(a.week_index),
    charge_label: fmtDeadline(new Date(a.charge_at)),
    suggested_topup: pack ? { pack_id: pack.pack_id, pay_vnd: pack.pay_vnd, credit_received_vnd: pack.credit_received_vnd, bonus_vnd: pack.credit_received_vnd - pack.pay_vnd } : null
  };
}

/** GET /account/overview → api.customer.getAccount */
export function adaptOverview(o) {
  const c = o.customer;
  return {
    customer: { ...c, zone_id: o.subscription ? o.subscription.zone_id : null, zone_name: o.subscription ? o.subscription.zone_name : '' },
    subscription: adaptSubscription(o.subscription),
    credit: balanceOut(o.credit),
    alert: adaptAlert(o.alert),
    unread_notifications: o.unread_notifications,
    renewal: o.renewal ? { due: o.renewal.due, remaining_weeks: o.renewal.remaining_weeks } : null
  };
}

/** Pha của một tuần theo mã trạng thái backend đã tính (editable | charged | locked | shipping | delivered ...). */
const phaseOf = (w) => w.status;

/** GET /subscription/weeks → api.customer.myWeeks */
export function adaptWeeks(r) {
  const sub = adaptSubscription(r.subscription);
  const weeks = (r.weeks || []).map((w) => {
    const idx = toViewIndex(w.week_index);
    const slotLabel = sub ? sub.slot_label : slotLabelOf(w.slot_id);
    const mealsByIndex = new Map();
    for (const m of w.meals || []) {
      if (!mealsByIndex.has(m.meal_index)) mealsByIndex.set(m.meal_index, { meal_index: m.meal_index, kinds: [], price_vnd: 0, editable: false });
      const g = mealsByIndex.get(m.meal_index);
      g.kinds.push(m);
      g.price_vnd += Number(m.price_vnd) || 0;
      g.editable = g.editable || Boolean(m.editable);
    }
    const meals = [...mealsByIndex.values()].map((g) => ({
      order_id: `W${w.week_index}`,
      box_index: 0,
      meal_index: g.meal_index,
      western: g.kinds.some((k) => k.kind === 'protein' && Boolean(DISHES[k.dish_id] && DISHES[k.dish_id].western)),
      dishes: DISH_ORDER.map((kind) => g.kinds.find((k) => k.kind === kind)).filter(Boolean).map((k) => ({
        kind: k.kind, dish_id: k.dish_id, name: k.name, sauce_code: DISHES[k.dish_id] ? DISHES[k.dish_id].sauce : null, sauce_name: sauceNameOf(k.dish_id)
      })),
      price_vnd: g.price_vnd,
      editable: g.editable
    }));
    const phase = phaseOf(w);
    const deadline = new Date(w.deadline_at);
    const proof = w.delivery_proof || { delivered_at: null, photo_url: null };
    const box = {
      order_id: `W${w.week_index}`,
      box_index: 0,
      status: w.order_state,
      phase,
      phase_label: w.status_label,
      delivery_date: w.delivery_date,
      delivery_label: fmtDay(w.delivery_date),
      delivery_at: null,
      slot_label: slotLabel,
      editable: Boolean(w.editable),
      deadline_at: w.deadline_at,
      deadline_label: fmtDeadline(deadline),
      photo_url: proof.photo_url || null,
      delivered_at: proof.delivered_at || null,
      delivery_issue: null,
      redelivery: null
    };
    return {
      week_index: idx,
      number: idx + 1,
      status: phase,
      status_label: w.status_label,
      editable: Boolean(w.editable),
      deadline_at: w.deadline_at,
      deadline_label: fmtDeadline(deadline),
      boxes: [box],
      meals,
      list_vnd: w.list_vnd,
      discount_vnd: w.discount_vnd,
      amount_vnd: w.amount_vnd,
      charge: w.charge,
      postponed_to_week: toViewIndex(w.postponed_to_week),
      moved_from_week: toViewIndex(w.moved_from_week),
      shifted_from: w.shifted_from || null, // tuần dời vì nghỉ lễ Tết: ngày giao khách chọn ban đầu
      skip: w.skip,
      order_code: w.order_code || null,
      route_id: w.route_id || null,
      delivery_instruction: w.delivery_instruction || null,
      delivery_proof: proof,
      late_payment: adaptLatePayment(w.late_payment)
    };
  });
  return { subscription: sub, weeks, renewal: r.renewal || null, now: r.now };
}

const LATE_LABEL = {
  pending_review: { label: 'MOVA đang xem xét khoản thanh toán đến sau giờ chốt sổ', tone: 'wait' },
  accepted: { label: 'MOVA đã nhận đơn vào lô giao', tone: 'good' },
  rolled_over: { label: 'Đơn đã dời sang ngày giao kế tiếp, số tiền được giữ nguyên', tone: 'info' },
  credited: { label: 'MOVA đã hoàn khoản thanh toán vào Fresh Credit', tone: 'info' }
};

/** Trạng thái thanh toán đến sau giờ chốt sổ (nếu có) → nhãn cho thẻ tuần. */
export function adaptLatePayment(lp) {
  if (!lp) return null;
  const known = LATE_LABEL[lp.status] || LATE_LABEL[lp.decision] || { label: 'MOVA đang xử lý khoản thanh toán của bạn', tone: 'wait' };
  return { status: lp.status, decision: lp.decision || null, label: known.label, tone: known.tone };
}

/** GET …/options → api.customer.mealOptions */
export function adaptMealOptions(r) {
  return {
    editable: r.editable,
    deadline_at: r.deadline_at,
    deadline_label: fmtDeadline(new Date(r.deadline_at)),
    options: r.options.map((o) => ({
      dish_id: o.dish_id,
      name: o.name,
      sauce_name: sauceNameOf(o.dish_id),
      prep_time_minutes: DISHES[o.dish_id] ? DISHES[o.dish_id].prepMinutes : null,
      price_delta_vnd: o.price_delta_vnd,
      current: o.current
    }))
  };
}

/** POST /subscription/meal-change (dry_run hoặc thật) → api.customer.previewMealChange / changeMeal */
export function adaptMealChange(r) {
  const named = (d) => ({ kind: r.kind, dish_id: d.dish_id, name: d.name, sauce_code: DISHES[d.dish_id] ? DISHES[d.dish_id].sauce : null, sauce_name: sauceNameOf(d.dish_id) });
  const out = {
    week_index: toViewIndex(r.week_index),
    meal_index: r.meal_index,
    kind: r.kind,
    from: named(r.from),
    to: named(r.to),
    carb_reset: null,
    order_status: r.week_status,
    paid: r.paid,
    old_amount_vnd: r.old_amount_vnd,
    new_amount_vnd: r.new_amount_vnd,
    delta_vnd: r.delta_vnd,
    deadline_at: r.deadline_at,
    deadline_label: fmtDeadline(new Date(r.deadline_at)),
    charge_at: r.charge_at,
    charge_label: fmtDeadline(new Date(r.charge_at)),
    settle: r.settle
  };
  if (r.balance) out.balance = balanceOut(r.balance);
  return out;
}

/** GET /subscription/skip-preview → api.customer.previewSkip */
export function adaptSkipPreview(r) {
  return {
    week_index: toViewIndex(r.week_index),
    new_week_index: toViewIndex(r.new_week_index),
    new_deliveries: r.new_deliveries.map((d) => ({
      delivery_date: d.delivery_date,
      delivery_label: fmtDay(d.delivery_date),
      cutoff_label: d.cutoff_at ? fmtDeadline(new Date(d.cutoff_at)) : '',
      charge_label: d.charge_at ? fmtDeadline(new Date(d.charge_at)) : ''
    })),
    keeps_discount_vnd: r.keeps_discount_vnd,
    skips_left: r.skips_left
  };
}

/** POST /subscription/skip-week → api.customer.skipWeek */
export function adaptSkipResult(r) {
  const dates = r.new_deliveries || (r.new_delivery_date ? [{ delivery_date: r.new_delivery_date }] : []);
  return {
    week_index: toViewIndex(r.week_index ?? r.skipped_week_index),
    new_week_index: toViewIndex(r.new_week_index),
    new_deliveries: dates.map((d) => ({ delivery_date: d.delivery_date, delivery_label: fmtDay(d.delivery_date) })),
    skips_left: r.skips_left ?? null
  };
}

/** POST /subscription/cancel (dry_run) → api.customer.previewCancel */
export function adaptCancelPreview(r, { mealsPerWeek = BUSINESS.plan.mealsPerWeekDefault, skipWeek = null, balance = null } = {}) {
  return {
    weeks_cancelled: r.cancelled_weeks,
    undelivered_meals: r.cancelled_weeks * mealsPerWeek,
    refund_vnd: r.refund_vnd,
    reversed_vnd: 0,
    forfeited_promo_vnd: r.promo_forfeited_vnd,
    gift_lost_vnd: r.discount_clawback_vnd,
    lost_incentives_vnd: r.promo_forfeited_vnd + r.discount_clawback_vnd,
    balance_before: balance ? balanceOut(balance) : r.balance ? balanceOut(r.balance) : null,
    kept_orders: r.kept_weeks,
    refund_days_commitment: r.refund_days_commitment,
    refund_due_by: r.refund_due_by || null,
    // Gói chưa trả tuần nào: hủy thẳng, không hoàn tiền (máy chủ trả unpaid và has_paid_weeks, kể cả khi dry_run).
    unpaid: r.unpaid === true,
    has_paid_weeks: r.has_paid_weeks === undefined ? r.unpaid !== true : r.has_paid_weeks === true,
    skip_instead: skipWeek
  };
}

/** POST /subscription/cancel (thật) → api.customer.cancelSubscription */
export function adaptCancelResult(r) {
  return {
    refund_vnd: r.refund_vnd,
    forfeited_promo_vnd: r.promo_forfeited_vnd,
    gift_lost_vnd: r.discount_clawback_vnd,
    weeks_cancelled: r.cancelled_weeks,
    kept_orders: r.kept_weeks,
    refund_days_commitment: r.refund_days_commitment,
    refund_due_by: r.refund_due_by || null,
    unpaid: r.unpaid === true
  };
}

/** GET /subscription/renewal-offer → api.customer.renewalOffer */
export function adaptRenewalOffer(r) {
  return {
    due: r.due,
    remaining_weeks: r.remaining_weeks,
    weeks: r.weeks.map((w) => ({
      week_index: toViewIndex(w.week_index),
      number: Number(w.week_index),
      amount_vnd: w.amount_vnd,
      delivery_date: w.delivery_date,
      delivery_label: fmtDay(w.delivery_date),
      charge_label: fmtDeadline(new Date(w.charge_at)),
      deadline_label: fmtDeadline(new Date(w.cutoff_at))
    })),
    total_vnd: r.total_vnd,
    payment_method: r.payment_method,
    switched_from_bank: r.switched_from_bank,
    needs_credit: r.needs_credit,
    balance: balanceOut(r.balance)
  };
}

const HISTORY_LABEL = {
  pack_purchase: 'Mua Gói Suất ăn trả trước',
  pack_discount: 'Chiết khấu khi mua gói',
  week_charge: 'MOVA trừ tiền tuần giao',
  week_charge_reversal: 'Hoàn lại tuần đã trừ',
  week_refund_diff: 'Hoàn chênh lệch khi đổi món',
  cancel_refund: 'Hoàn tiền thật khi dừng gói',
  discount_clawback: 'Thu hồi ưu đãi khi dừng gói',
  reward: 'Thưởng từ MOVA',
  promo_revoke: 'Khuyến mãi bị thu hồi khi dừng gói',
  short_pick_refund: 'MOVA hoàn do thiếu hàng ở nhà máy',
  late_payment_credit: 'Khoản thanh toán đến sau giờ chốt sổ được ghi vào Fresh Credit',
  undelivered_refund: 'Hoàn suất không giao được',
  compensation: 'MOVA bù khi có thay đổi món',
  admin_adjustment: 'MOVA điều chỉnh có lý do',
  topup: 'Nạp Fresh Credit',
  topup_bonus: 'Thưởng nạp'
};

/** Mỗi bút toán là một dòng; số dư trước và sau thuộc ngăn của bút đó. */
export function adaptHistory(ledger = []) {
  return ledger.map((l, index) => ({
    id: l.id ?? `${l.created_at}|${index}`, kind: l.entry_type,
    label: HISTORY_LABEL[l.entry_type] || l.entry_type, amount_vnd: l.amount_vnd,
    real_vnd: l.compartment === 'real' ? l.amount_vnd : 0,
    promo_vnd: l.compartment === 'promo' ? l.amount_vnd : 0,
    compartment: l.compartment, before_vnd: l.balance_after_vnd - l.amount_vnd,
    after_vnd: l.balance_after_vnd, ref_id: l.ref_id, order_code: l.order_code,
    week_index: l.week_index, at: l.created_at
  })).sort((a, b) => b.at.localeCompare(a.at));
}

/** Gói Suất ăn trả trước (GET /credit/packs) → thẻ chọn gói. */
export function adaptPacks(packs = []) {
  return packs.map((p) => ({
    pack_id: p.id,
    label: p.label,
    pay_vnd: p.price_vnd,
    bonus_vnd: p.discount_vnd,
    credit_received_vnd: p.value_vnd,
    bonus_pct: p.price_vnd ? p.discount_vnd / p.price_vnd : 0,
    weeks: p.weeks,
    meals: p.meals
  }));
}

/** GET /credit/account + /credit/packs + cảnh báo của /account/overview → api.customer.creditSummary */
export function adaptCreditSummary({ account, packs, overview, alert_unavailable = false }) {
  const bal = account.balance;
  const list = adaptPacks(packs);
  return {
    balance: balanceOut(bal),
    spend_order: account.spend_order ?? null,
    alert: overview ? adaptAlert(overview.alert) : null,
    alert_unavailable,
    history: adaptHistory(account.ledger),
    next_cursor: account.next_cursor || null,
    packs: list,
    bonus_pct: list[0] ? list[0].bonus_pct : 0
  };
}

/** POST /credit/pack-orders → kết quả "đặt mua gói": chờ chuyển khoản, tiền về qua ngân hàng mới cộng Fresh Credit. */
export function adaptPackOrder(o) {
  return {
    order_id: o.order_id,
    pack_id: o.pack_id,
    label: o.label,
    pay_vnd: o.pay_vnd,
    credit_received_vnd: o.credit_received_vnd,
    bonus_vnd: o.credit_received_vnd - o.pay_vnd,
    transfer_content: o.transfer_content,
    ref: o.transfer_content,
    status: o.status,
    expires_at: o.expires_at,
    pending: o.status === 'pending'
  };
}

export const adaptNotifications = (list = []) =>
  list.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, created_at: n.created_at, read: n.read, meta: n.meta || null }));

/** GET /ratings/pending → api.customer.pendingRatings */
export function adaptPendingRatings(list = []) {
  return list.map((w) => ({
    order_id: w.week_id,
    week_id: w.week_id,
    week_index: toViewIndex(w.week_index),
    delivered_at: w.delivered_at,
    delivery_label: fmtDay(w.delivery_date),
    dishes: w.dishes.map((d) => ({
      dish_id: d.dish_id,
      name: d.name,
      kind: d.kind,
      sauce_code: DISHES[d.dish_id] ? DISHES[d.dish_id].sauce : null,
      sauce_name: sauceNameOf(d.dish_id),
      rated: d.rated,
      rating: d.rated ? { thumb: null, sauce_salt: null, spice: null } : null
    }))
  }));
}

/** Truy xuất QR (GET /lots/:code) → trang /q/:code. */
export function adaptLot(l) {
  const farm = l.farm_info || {};
  const v = l.verifications || {};
  const readings = Array.isArray(l.temperature_readings) ? l.temperature_readings : [];
  const temps = readings.map((r) => r.celsius);
  const recipes = (l.dish_ids || []).filter((id) => DISHES[id]).map((id) => ({
    dish_id: id, name: DISHES[id].name, sauce_name: sauceNameOf(id), minutes: DISHES[id].prepMinutes, steps: DISHES[id].cooking_steps || []
  }));
  return {
    qr_code: l.qr_code,
    product_name: l.product_name,
    sample: Boolean(l.sample),
    kind: l.kind || null,
    farm: { name: farm.farm_name || '', location: farm.location || '', region: farm.region || farm.location || '' },
    trust_score: l.trust_score ?? null,
    harvest_or_slaughter_at: l.harvest_or_slaughter_timestamp || null,
    processed_at: l.processed_timestamp || null,
    inspector: { verified: Boolean(v.mova_inspector && v.mova_inspector.verified), antibiotic_test: v.mova_inspector ? v.mova_inspector.antibiotic_test : null },
    peer_validations_count: v.peer_validations_count || 0,
    last_peer_check: v.last_peer_check || null,
    temperature: {
      log: '',
      readings,
      needs_cold_chain: readings.length > 0,
      min: temps.length ? Math.min(...temps) : null,
      max: temps.length ? Math.max(...temps) : null,
      within_limit: temps.length ? Math.min(...temps) >= BUSINESS.temperature.chill.min && Math.max(...temps) <= BUSINESS.temperature.chill.max : null,
      limit: readings.length ? BUSINESS.temperature.chill : null
    },
    recipes
  };
}

export const SWAPPABLE_KINDS = SWAPPABLE;
