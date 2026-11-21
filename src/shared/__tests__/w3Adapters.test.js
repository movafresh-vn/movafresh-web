import { describe, expect, it } from 'vitest';
import {
  adaptCancelPreview, adaptCancelResult, adaptCreditSummary, adaptHistory, adaptLot, adaptMealChange, adaptMealOptions, adaptOverview, adaptPackOrder,
  adaptPacks, adaptPendingRatings, adaptRenewalOffer, adaptSkipPreview, adaptSkipResult, slotLabelOf, toApiIndex, toViewIndex
} from '../api/adapters/account';
import { adaptCreated, adaptDeliveryOptions, deliveryDatesFor, splitMeals } from '../api/adapters/checkout';
import { applyDishCatalog, dishFromBackend } from '../api/adapters/dishes';

describe('W3-03: bộ chuyển đổi phản hồi backend sang hình dạng màn hình', () => {
  it('W3-03: số tuần backend (từ 1) ↔ giao diện (từ 0)', () => {
    expect(toViewIndex(1)).toBe(0);
    expect(toViewIndex(null)).toBeNull();
    expect(toApiIndex(0)).toBe(1);
    expect(slotLabelOf('early_morning_06_08')).toMatch(/06:00/);
    expect(slotLabelOf('khong-co')).toBe('');
  });

  it('W3-03: tổng quan tài khoản: số dư có tổng, cảnh báo có nhãn giờ trừ và gói gợi ý, tuần cảnh báo từ 0', () => {
    const o = adaptOverview({
      customer: { id: 'u', name: 'Lan', phone: '0987', email: '', address: 'A', district: 'Quận 7', members: [], referral_code: 'MOVA-AB12', profile: { done: 2, total: 5, complete: false, missing: [], checks: [] }, profile_reward_claimed: false, has_subscription: true },
      subscription: { id: 's', status: 'active', weeks: 4, payment_method: 'fresh_credit', zone_id: 'Z2', zone_name: 'Q7', slot_id: 'early_morning_06_08', skips_used: 0, skips_max: 1, created_at: 'x', cancelled_at: null, first_delivery_date: '2026-12-01', delivery_instruction: { mode: 'leave_at_reception', photo_required: true } },
      credit: { real_vnd: 100, promo_vnd: 20, total_vnd: 120 }, unread_notifications: 2, renewal: { due: true, remaining_weeks: 1 },
      alert: { week_index: 2, amount_vnd: 500_000, balance_vnd: 120, shortfall_vnd: 499_880, charge_at: '2026-12-01T00:00:00.000Z', cutoff_at: '2026-12-02T00:00:00.000Z', failed: false, suggested_pack: { pack_id: 'standard_4w', pay_vnd: 1_500_000, credit_received_vnd: 1_650_000 } }
    });
    expect(o.credit).toEqual({ real_vnd: 100, promo_vnd: 20, total_vnd: 120 });
    expect(o.alert.week_index).toBe(1);
    expect(o.alert.charge_label).toMatch(/\d{2}:\d{2}/);
    expect(o.alert.suggested_topup).toEqual({ pack_id: 'standard_4w', pay_vnd: 1_500_000, credit_received_vnd: 1_650_000, bonus_vnd: 150_000 });
    expect(o.subscription.slot_label).toMatch(/06:00/);
    expect(o.customer.zone_name).toBe('Q7');
    expect(o.renewal).toEqual({ due: true, remaining_weeks: 1 });
    expect(adaptOverview({ customer: { name: '' }, subscription: null, credit: { real_vnd: 0, promo_vnd: 0 }, alert: null, unread_notifications: 0, renewal: null }).subscription).toBeNull();
  });

  it('W3-03: đổi món: xem trước và kết quả giữ số tiền, cách bù trừ; tuần chuyển về số từ 0', () => {
    const raw = { week_index: 3, meal_index: 2, kind: 'protein', from: { dish_id: 'D-PRT-001', name: 'A' }, to: { dish_id: 'D-PRT-002', name: 'B' }, week_status: 'charged', paid: true, old_amount_vnd: 100, new_amount_vnd: 130, delta_vnd: 30, deadline_at: '2026-12-01T01:00:00.000Z', charge_at: '2026-11-29T00:00:00.000Z', settle: { mode: 'charge', amount_vnd: 30, enough: true, short_vnd: 0 } };
    const p = adaptMealChange(raw);
    expect(p).toMatchObject({ week_index: 2, delta_vnd: 30, paid: true, settle: { mode: 'charge' }, from: { name: 'A' }, to: { dish_id: 'D-PRT-002' } });
    expect(p.deadline_label).toMatch(/\d{2}:\d{2}/);
    expect(adaptMealChange({ ...raw, balance: { real_vnd: 5, promo_vnd: 0, total_vnd: 5 } }).balance.total_vnd).toBe(5);
    const opts = adaptMealOptions({ editable: true, deadline_at: '2026-12-01T01:00:00.000Z', options: [{ dish_id: 'D-PRT-001', name: 'A', price_delta_vnd: 0, current: true }] });
    expect(opts.options[0]).toMatchObject({ current: true, price_delta_vnd: 0 });
  });

  it('W3-03: tạm hoãn: xem trước và kết quả có nhãn ngày giao lại', () => {
    const p = adaptSkipPreview({ week_index: 2, new_week_index: 6, new_deliveries: [{ delivery_date: '2026-12-29', charge_at: '2026-12-26T00:00:00.000Z', cutoff_at: '2026-12-27T01:00:00.000Z' }], keeps_discount_vnd: 5, skips_left: 0 });
    expect(p).toMatchObject({ week_index: 1, new_week_index: 5, keeps_discount_vnd: 5, skips_left: 0 });
    expect(p.new_deliveries[0].delivery_label).toMatch(/29\/12\/2026/);
    expect(adaptSkipResult({ week_index: 2, new_week_index: 6, new_delivery_date: '2026-12-29' }).new_deliveries[0].delivery_label).toMatch(/29\/12/);
  });

  it('W3-03: dừng gói: số bữa chưa giao, tiền hoàn và ưu đãi thu hồi', () => {
    const raw = { result: 'ok', dry_run: true, subscription_status: 'active', cancelled_weeks: 3, kept_weeks: 1, refund_vnd: 600_000, discount_clawback_vnd: 90_000, promo_forfeited_vnd: 10_000, refund_due_by: '2026-12-10', refund_days_commitment: 7, balance: { real_vnd: 600_000, promo_vnd: 10_000, total_vnd: 610_000 } };
    const p = adaptCancelPreview(raw, { mealsPerWeek: 5, skipWeek: { week_index: 2, number: 3, deadline_label: 'x' } });
    expect(p).toMatchObject({ weeks_cancelled: 3, undelivered_meals: 15, refund_vnd: 600_000, gift_lost_vnd: 90_000, forfeited_promo_vnd: 10_000, lost_incentives_vnd: 100_000, kept_orders: 1, refund_days_commitment: 7, skip_instead: { number: 3 } });
    expect(adaptCancelResult(raw)).toMatchObject({ refund_vnd: 600_000, weeks_cancelled: 3, refund_days_commitment: 7 });
  });

  it('W3-03: lời mời gia hạn: tổng tiền, cách trả, các tuần với nhãn giờ', () => {
    const r = adaptRenewalOffer({ due: true, remaining_weeks: 1, weeks: [{ week_index: 5, delivery_date: '2027-01-05', charge_at: '2027-01-02T00:00:00.000Z', cutoff_at: '2027-01-03T01:00:00.000Z', amount_vnd: 700_000 }], total_vnd: 700_000, payment_method: 'fresh_credit', switched_from_bank: true, needs_credit: true, balance: { real_vnd: 1, promo_vnd: 2, total_vnd: 3 } });
    expect(r).toMatchObject({ due: true, total_vnd: 700_000, switched_from_bank: true, balance: { total_vnd: 3 } });
    expect(r.weeks[0]).toMatchObject({ week_index: 4, number: 5, amount_vnd: 700_000 });
    expect(r.weeks[0].deadline_label).toMatch(/\d{2}:\d{2}/);
  });

  it('W3-03: Fresh Credit: gói trả trước cố định, lịch sử gộp theo bút toán, không nạp tiền lẻ', () => {
    const packs = adaptPacks([{ id: 'standard_4w', label: 'Gói 4 tuần', weeks: 4, meals: 20, portions: 40, price_vnd: 1_500_000, discount_vnd: 150_000, value_vnd: 1_650_000 }]);
    expect(packs[0]).toMatchObject({ pack_id: 'standard_4w', pay_vnd: 1_500_000, bonus_vnd: 150_000, credit_received_vnd: 1_650_000 });
    expect(packs[0].bonus_pct).toBeCloseTo(0.1);
    const ledger = [
      { entry_type: 'pack_purchase', compartment: 'real', amount_vnd: 1_500_000, balance_after_vnd: 1_500_000, created_at: '2026-11-20T01:00:00.000Z' },
      { entry_type: 'pack_discount', compartment: 'promo', amount_vnd: 150_000, balance_after_vnd: 150_000, created_at: '2026-11-20T01:00:00.000Z' },
      { entry_type: 'week_charge', compartment: 'real', amount_vnd: -200_000, balance_after_vnd: 1_300_000, created_at: '2026-11-25T01:00:00.000Z' }
    ];
    const h = adaptHistory(ledger);
    expect(h.map((x) => x.kind)).toEqual(['week_charge', 'pack_purchase', 'pack_discount']);
    expect(h[0]).toMatchObject({ amount_vnd: -200_000, real_vnd: -200_000, promo_vnd: 0 });
    const s = adaptCreditSummary({ account: { balance: { real_vnd: 1, promo_vnd: 2 }, ledger, next_cursor: null }, packs: [{ id: 'standard_4w', label: 'G', weeks: 4, meals: 20, portions: 40, price_vnd: 1_500_000, discount_vnd: 150_000, value_vnd: 1_650_000 }], overview: null });
    expect(s.balance.total_vnd).toBe(3);
    expect(s.alert).toBeNull();
    expect(s).not.toHaveProperty('min_topup_vnd');
    const o = adaptPackOrder({ order_id: '1', pack_id: 'standard_4w', label: 'G', pay_vnd: 1_500_000, credit_received_vnd: 1_650_000, transfer_content: 'MOVA-X', status: 'pending', created_at: 'a', expires_at: 'b' });
    expect(o).toMatchObject({ pending: true, bonus_vnd: 150_000, ref: 'MOVA-X' });
  });

  it('W3-03: đánh giá chờ: tuần và món, món đã đánh giá được đánh dấu', () => {
    const r = adaptPendingRatings([{ week_id: 'w1', week_index: 4, delivery_date: '2026-12-03', delivered_at: '2026-12-03T01:00:00.000Z', dishes: [{ dish_id: 'D-PRT-001', name: 'A', kind: 'protein', rated: false }, { dish_id: 'D-CRB-001', name: 'B', kind: 'carb', rated: true }] }]);
    expect(r[0]).toMatchObject({ order_id: 'w1', week_index: 3 });
    expect(r[0].dishes[0]).toMatchObject({ rated: false, rating: null });
    expect(r[0].dishes[1].rated).toBe(true);
  });

  it('W3-03: truy xuất QR: nông trại, kiểm định, nhiệt độ và ngưỡng chuỗi lạnh; không có tọa độ hay tên cán bộ', () => {
    const lot = adaptLot({ qr_code: 'MOVA-TRACE-X1', kind: 'beef', sku: 'NL-BO-01', product_name: 'Bò', farm_info: { farm_name: 'HTX', location: 'Buôn Đôn', region: 'Đắk Lắk' }, trust_score: 90, verifications: { mova_inspector: { verified: true, antibiotic_test: 'NEGATIVE' }, peer_validations_count: 3, last_peer_check: null }, harvest_or_slaughter_timestamp: '2026-11-20T00:00:00.000Z', processed_timestamp: '2026-11-20T03:00:00.000Z', temperature_readings: [{ point: 'a', at: '2026-11-20T03:00:00.000Z', celsius: 2 }, { point: 'b', at: '2026-11-20T09:00:00.000Z', celsius: 3 }], dish_ids: ['D-PRT-002', 'D-KHONG-CO'], sample: false });
    expect(lot.farm).toEqual({ name: 'HTX', location: 'Buôn Đôn', region: 'Đắk Lắk' });
    expect(lot.temperature).toMatchObject({ min: 2, max: 3, within_limit: true });
    expect(lot.recipes.map((r) => r.dish_id)).toEqual(['D-PRT-002']);
    expect(JSON.stringify(lot)).not.toMatch(/inspector_name|coordinates/);
    expect(adaptLot({ qr_code: 'X', product_name: 'P', temperature_readings: [], dish_ids: [] }).temperature.within_limit).toBeNull();
  });

  it('W3-03: lịch giao: lựa chọn từng thứ, ghép hai thứ cho 2 lần/tuần (khung chung), tính ngày giao của cả gói', () => {
    const raw = { zone_id: 'Z2', zone_name: 'Q7', province: 'HCM', districts: ['Quận 7'], options: [
      { preferred_days: ['tuesday'], first_delivery_date: '2026-12-01', first_dish_change_deadline: 'x', slots: [{ slot_id: 'a', label: 'A' }, { slot_id: 'b', label: 'B' }] },
      { preferred_days: ['friday'], first_delivery_date: '2026-12-04', first_dish_change_deadline: 'y', slots: [{ slot_id: 'a', label: 'A' }] }
    ] };
    expect(adaptDeliveryOptions(raw, { perWeek: 1 }).options.map((o) => o.day_labels)).toEqual([['Thứ 3'], ['Thứ 6']]);
    const two = adaptDeliveryOptions(raw, { perWeek: 2 }).options;
    expect(two).toHaveLength(1);
    expect(two[0]).toMatchObject({ preferred_days: ['tuesday', 'friday'], first_delivery_date: '2026-12-01', first_dates: { tuesday: '2026-12-01', friday: '2026-12-04' } });
    expect(adaptDeliveryOptions({ ...raw, options: [raw.options[0]] }, { perWeek: 2 }).options).toEqual([]);
    expect(deliveryDatesFor({ preferredDays: ['tuesday', 'friday'], firstDates: two[0].first_dates, deliveries: 4 })).toEqual(['2026-12-01', '2026-12-04', '2026-12-08', '2026-12-11']);
    expect(deliveryDatesFor({ preferredDays: ['monday'], firstDates: {}, deliveries: 4 })).toBeNull();
    expect(splitMeals([1, 2, 3, 4, 5], 2)).toEqual([[1, 2, 3], [4, 5]]);
    expect(splitMeals([1, 2, 3], 1)).toEqual([[1, 2, 3]]);
  });

  it('W3-03: gói vừa tạo: trả đúng tiền, mã chuyển khoản và các tuần', () => {
    const r = adaptCreated({
      subscription_id: 'sub', status: 'active', cycle_start_date: '2026-12-01', cycle_end_date: '2026-12-22', total_order_amount_vnd: 4_000_000, voucher_discount_applied_week1_vnd: 100_000, voucher_future_credits_locked_vnd: 300_000,
      charged_from_fresh_credit_vnd: 900_000, credit_balance: { real_vnd: 5, promo_vnd: 6 }, referral: null, payment_ref: 'MOVA-ABC', delivery_instruction: { mode: 'leave_at_reception', photo_required: true }, auto_debit_cutoff_hours: 72,
      dish_customization_cutoff_at: '2026-11-29T01:00:00.000Z', next_delivery: { date: '2026-12-01', slot: 'early_morning_06_08', dish_change_deadline: '2026-11-29T01:00:00.000Z' },
      cycle_weeks: [1, 2].map((i) => ({ week_index: i, delivery_date: `2026-12-0${i}`, status: 'editable', charge_at: 'a', cutoff_at: 'b', amount_vnd: 1_000_000, discount_vnd: 100_000 }))
    }, { perWeek: 1 });
    expect(r).toMatchObject({ payment_ref: 'MOVA-ABC', paid_now_vnd: 900_000, fresh_credit_balance_remaining_vnd: 11, package_value_vnd: 2_000_000 });
    expect(r.cycle_weeks.map((w) => w.amount_vnd)).toEqual([900_000, 900_000]);
    expect(r.next_delivery.slot).toMatch(/06:00/);
  });

  it('W3-03: catalog món lấy từ backend: giá, nhãn, món Tây, tinh bột đi kèm; món backend không có thì bị gỡ', () => {
    const target = { 'D-OLD': { id: 'D-OLD', kind: 'protein', name: 'cũ', bom: [{ sku: 'X', gramsPerPerson: 1 }] }, 'D-PRT-001': { id: 'D-PRT-001', bom: [{ sku: 'NL-HEO-02', gramsPerPerson: 120 }], chef_note: 'ghi chú' } };
    const n = applyDishCatalog([{ id: 'D-PRT-001', kind: 'protein', name: 'Ba rọi', price_per_person_vnd: 22_500, prep_minutes: 15, sauce_code: 'XOT-01', tags: ['pork'], western: false, carb_alt: ['D-CRB-004'], nutrition: { kcal: 460, protein: 26, carb: 12, fat: 34 }, portion_specs: { net_weight_grams: 110, size_detail: 's' }, is_active: true }], target);
    expect(n).toBe(1);
    expect(target['D-OLD']).toBeUndefined();
    expect(target['D-PRT-001']).toMatchObject({ pricePerPersonVnd: 22_500, sauce: 'XOT-01', tags: ['pork'], carbAlt: ['D-CRB-004'], chef_note: 'ghi chú', bom: [{ sku: 'NL-HEO-02', gramsPerPerson: 120 }] });
    expect(applyDishCatalog([], target)).toBe(1); // danh sách rỗng (lỗi tải) không xóa catalog
    expect(dishFromBackend({ id: 'D-X', kind: 'veg', name: 'x', price_per_person_vnd: 1 }).prepMinutes).toBe(15);
  });
});
