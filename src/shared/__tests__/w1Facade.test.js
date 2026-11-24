import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '../api/http';
import { createCustomerApi } from '../api/customerApi';
import { createPlanDrafts } from '../api/planDraft';
import { createCustomerApi as createRealFromIndex } from '../api/customerApi';

const memStore = () => { let v = { profiles: {}, plans: {} }; return { read: () => v, write: (x) => { v = x; } }; };
const FIXED = new Date('2026-11-23T01:00:00.000Z');

const ZONES = [{ zone_id: 'Z2', name: 'Quận 7 – Nhà Bè', province: 'TP. Hồ Chí Minh', districts: ['Quận 7', 'Nhà Bè'], delivery_days: ['tuesday', 'friday'] }];
const OPTIONS = {
  zone_id: 'Z2', zone_name: 'Quận 7 – Nhà Bè', province: 'TP. Hồ Chí Minh', districts: ['Quận 7', 'Nhà Bè'],
  options: [
    { preferred_days: ['tuesday'], first_delivery_date: '2026-12-01', first_dish_change_deadline: '2026-11-29T01:00:00.000Z', slots: [{ slot_id: 'early_morning_06_08', label: 'Sáng sớm 06:00 – 08:00' }, { slot_id: 'evening_18_21', label: 'Tối muộn' }] },
    { preferred_days: ['friday'], first_delivery_date: '2026-12-04', first_dish_change_deadline: '2026-12-02T01:00:00.000Z', slots: [{ slot_id: 'early_morning_06_08', label: 'Sáng sớm 06:00 – 08:00' }] }
  ]
};

/** http giả: bảng "METHOD /path" -> phản hồi (giá trị hoặc hàm). Ghi lại mọi yêu cầu. */
function fakeHttp(table = {}) {
  const calls = [];
  const request = vi.fn(async (method, path, o = {}) => {
    calls.push({ method, path, ...o });
    const hit = table[`${method} ${path}`];
    if (hit === undefined) throw new HttpError(`không có đường ${method} ${path}`, { code: 'NOT_FOUND', status: 404 });
    const v = typeof hit === 'function' ? hit({ method, path, ...o }) : hit;
    if (v instanceof Error) throw v;
    return v;
  });
  return { request, calls };
}

function make(table, extra = {}) {
  const h = fakeHttp({ 'GET /delivery/zones': ZONES.map((z) => ({ ...z })), ...table });
  const api = createCustomerApi({ http: h, token: async () => 'tok', now: () => FIXED, drafts: createPlanDrafts({ storage: memStore(), now: () => FIXED }), ai: { generateMealPlan: async () => { throw new Error('ai down'); }, generateGuestMealPlan: async () => { throw new Error('ai down'); } }, ...extra });
  return { api, h };
}

const SURVEY = { user_contact: { phone_or_email: '0987654321' }, survey_answers: { living_area: 'Quận 7, TP.HCM', household_size: 3, household_needs: ['young_child'], allergies_and_restrictions: ['no_seafood'], weekly_home_meals_count: 5, cuisine: 'viet' } };

describe('W1-03: facade async giữ nguyên tên hàm', () => {
  it('W1-03: mọi hàm của api.customer cũ còn trong facade (trừ đăng nhập demo đã bỏ) và đều trả Promise', () => {
    // Danh sách hàm của api.customer trước khi chuyển sang backend thật (bản giả lập đã xóa ở C28).
    const LEGACY = ['serviceAreas', 'checkArea', 'captureLead', 'joinWaitlist', 'onboardingProfile', 'generateMealPlan', 'getPlan', 'applyChefMenu', 'configurePlan', 'swapOptions', 'availableSlots', 'deliveryOptions', 'previewSubscription', 'createSubscription', 'listNotifications', 'getAccount', 'myWeeks', 'mealOptions', 'previewMealChange', 'changeMeal', 'previewSkip', 'skipWeek', 'previewCancel', 'cancelSubscription', 'unlinkCard', 'renewalOffer', 'renewSubscription', 'creditSummary', 'topUpCredit', 'notifications', 'markNotificationsRead', 'pendingRatings', 'rateDish', 'rewards', 'saveProfile', 'claimShare', 'traceLot', 'sampleLotCodes'];
    const REMOVED = ['tick', 'findCustomerByContact', 'sampleAccounts'];
    const { api } = make({});
    for (const name of LEGACY) {
      if (REMOVED.includes(name)) continue;
      expect(typeof api[name], `thiếu ${name}`).toBe('function');
    }
    for (const name of REMOVED) expect(api[name]).toBeUndefined();
    expect(createRealFromIndex).toBe(createCustomerApi);
  });

  it('W1-03: lỗi nghiệp vụ thành phong bì lỗi giữ code và chi tiết; lỗi mạng thì ném', async () => {
    const { api } = make({
      'GET /account/overview': new HttpError('Khung giờ đầy', { code: 'SLOT_FULL', status: 409, details: { full_dates: ['2026-12-01'] } })
    });
    const r = await api.getAccount();
    expect(r).toMatchObject({ status: 'error', error: { code: 'SLOT_FULL', message: 'Khung giờ đầy', full_dates: ['2026-12-01'], status: 409 } });
    const down = make({ 'GET /account/overview': new HttpError('mất mạng', { code: 'NETWORK_ERROR', status: 0 }) });
    await expect(down.api.getAccount()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('W1-03: serviceAreas và checkArea dùng danh sách khu của máy chủ (khớp quận trong chữ tự gõ)', async () => {
    const { api } = make({});
    const areas = await api.serviceAreas();
    expect(areas[0]).toMatchObject({ zone_id: 'Z2', districts: ['Quận 7', 'Nhà Bè'], delivery_days: [2, 5] });
    expect(await api.checkArea('Phú Mỹ Hưng, Quận 7, TP.HCM')).toEqual({ served: true, zone_id: 'Z2', zone_name: 'Quận 7 – Nhà Bè' });
    expect((await api.checkArea('Hà Nội')).served).toBe(false);
  });

  it('W1-03: onboarding ngoài vùng giao là OUT_OF_ZONE và đưa khách vào danh sách chờ', async () => {
    const { api, h } = make({ 'POST /leads/waitlist': { lead_id: 'L1', status: 'waitlist', position: 3 } });
    const r = await api.onboardingProfile({ ...SURVEY, survey_answers: { ...SURVEY.survey_answers, living_area: 'Hải Phòng' } });
    expect(r).toMatchObject({ status: 'error', error: { code: 'OUT_OF_ZONE' } });
    expect(h.calls.some((c) => c.path === '/leads/waitlist')).toBe(true);
  });

  it('W1-03: phễu đầy đủ: hồ sơ → thực đơn → lịch giao → xem trước → đăng ký; không gửi số tiền, hướng dẫn giao mặc định, phường tùy chọn', async () => {
    const previewRaw = {
      duration_weeks: 4, total_order_amount_vnd: 1_000_000, total_discount_vnd: 120_000, referral: null,
      weeks: [0, 1, 2, 3].map((i) => ({ week_index: i + 1, delivery_date: `2026-12-${String(1 + i * 7).padStart(2, '0')}`, charge_at: '2026-11-28T00:00:00.000Z', cutoff_at: '2026-11-29T01:00:00.000Z', amount_vnd: 250_000, discount_vnd: 30_000, pay_vnd: 220_000 })),
      slot_full: false, full_dates: []
    };
    const { api, h } = make({
      'GET /delivery/options': OPTIONS,
      'GET /account/overview': { credit: { real_vnd: 0, promo_vnd: 0, total_vnd: 0 }, customer: { referral_code: 'MOVA-AB12' } },
      'GET /credit/packs': { packs: [{ id: 'standard_4w', label: 'Gói 4 tuần', weeks: 4, meals: 20, portions: 40, price_vnd: 1_500_000, discount_vnd: 150_000, value_vnd: 1_650_000 }] },
      'PUT /account/consents': { consents: {} },
      'PUT /account/profile': { safety_changed: false },
      'POST /subscription/preview': previewRaw,
      'POST /subscription/create-or-renew': {
        subscription_id: 'sub_1', status: 'active', cycle_start_date: '2026-12-01', cycle_end_date: '2026-12-22', total_order_amount_vnd: 1_000_000,
        voucher_discount_applied_week1_vnd: 30_000, voucher_future_credits_locked_vnd: 90_000, charged_from_fresh_credit_vnd: 220_000,
        credit_balance: { real_vnd: 100, promo_vnd: 0 }, referral: null, payment_ref: 'MOVA-AB12CD', delivery_instruction: { mode: 'leave_at_reception', photo_required: true },
        auto_debit_cutoff_hours: 72, dish_customization_cutoff_at: '2026-11-29T01:00:00.000Z',
        next_delivery: { date: '2026-12-01', slot: 'early_morning_06_08', dish_change_deadline: '2026-11-29T01:00:00.000Z' },
        cycle_weeks: previewRaw.weeks.map((w) => ({ week_index: w.week_index, delivery_date: w.delivery_date, status: 'editable', charge_at: w.charge_at, cutoff_at: w.cutoff_at, amount_vnd: 250_000, discount_vnd: 30_000 }))
      }
    });
    const prof = await api.onboardingProfile(SURVEY);
    expect(prof.status).toBe('success');
    expect(prof.data).toMatchObject({ zone_id: 'Z2', household_type: 'family' });
    const plan = await api.generateMealPlan({ profile_id: prof.data.profile_id, week_number: 1 });
    expect(plan.status).toBe('success');
    expect(plan.data.meals).toHaveLength(5);
    // món bị kiêng (hải sản) không bao giờ có trong thực đơn
    for (const m of plan.data.meals) for (const d of Object.values(m.meal_structure)) if (d) expect(d.dish_id).not.toMatch(/SEA/);

    const opts = await api.deliveryOptions({ profile_id: prof.data.profile_id, deliveries_per_week: 1 });
    expect(opts.data.options.map((o) => o.preferred_days)).toEqual([['tuesday'], ['friday']]);
    expect(h.calls.find((c) => c.path === '/delivery/options').query).toMatchObject({ zone_id: 'Z2' });
    const o = opts.data.options[0];

    const req = {
      profile_id: prof.data.profile_id, plan_id: plan.data.plan_id, duration_weeks: 4, payment_method: 'fresh_credit',
      schedule: {
        delivery_frequency: 'once_a_week', preferred_days: o.preferred_days, first_dates: o.first_dates, preferred_time_slot: 'early_morning_06_08',
        shipping_address: { street: '12 Nguyễn Văn Linh', district: 'Quận 7', city: 'TP. Hồ Chí Minh', receiver_name: 'Lan', receiver_phone: '0987654321', ward: 'Tân Phong' }
      },
      voucher_code: 'THEQUATANG'
    };
    const pv = await api.previewSubscription(req);
    expect(pv.status).toBe('success');
    const pvCall = h.calls.find((c) => c.path === '/subscription/preview');
    const body = pvCall.body;
    expect(body.weeks).toHaveLength(4);
    expect(body.weeks.map((w) => w.delivery_date)).toEqual(['2026-12-01', '2026-12-08', '2026-12-15', '2026-12-22']);
    expect(body.duration_weeks).toBe(4);
    expect(body.schedule.delivery_instruction).toEqual({ mode: 'leave_at_reception', photo_required: true });
    expect(body.schedule.shipping_address.ward).toBe('Tân Phong');
    expect(JSON.stringify(body)).not.toMatch(/amount|pay_vnd|price/);
    expect(body.weeks[0].meals.every((m) => m.servings === 3)).toBe(true);
    // hồ sơ an toàn và đồng ý được gửi TRƯỚC khi xem trước
    const order = h.calls.map((c) => `${c.method} ${c.path}`);
    expect(order.indexOf('PUT /account/consents')).toBeLessThan(order.indexOf('POST /subscription/preview'));
    expect(h.calls.find((c) => c.path === '/account/profile').body).toMatchObject({ household_size: 3, avoid: ['no_seafood'], household_needs: ['young_child'] });
    // số tiền hiển thị là số máy chủ trả
    expect(pv.data.bank_transfer_4w.pay_vnd).toBe(880_000);
    expect(pv.data.card.charge_now_vnd).toBe(220_000);
    expect(pv.data.fresh_credit).toMatchObject({ pay_vnd: 1_500_000, credit_received_vnd: 1_650_000, pack_id: 'standard_4w' });

    // gửi hồ sơ lần hai với cùng nội dung không PUT lại
    await api.previewSubscription(req);
    expect(h.calls.filter((c) => c.path === '/account/profile')).toHaveLength(1);

    const done = await api.createSubscription({ ...req, newsletter_optin: true });
    expect(done.status).toBe('success');
    const create = h.calls.find((c) => c.path === '/subscription/create-or-renew');
    expect(create.key).toBe(`sub-${prof.data.profile_id}-${plan.data.plan_id}`);
    expect(create.body).toMatchObject({ newsletter_opt_in: true, phone_verified: true });
    expect(done.data).toMatchObject({ subscription_id: 'sub_1', payment_ref: 'MOVA-AB12CD', referral_code: 'MOVA-AB12', paid_now_vnd: 220_000, fresh_credit_balance_remaining_vnd: 100 });
    expect(done.data.next_delivery.slot).toMatch(/06:00/);
    expect(done.data.cycle_weeks).toHaveLength(4);
  });

  it('W1-03: chưa đăng nhập thì xem trước và đăng ký trả AUTH_REQUIRED, không gọi máy chủ', async () => {
    const { api, h } = make({}, { token: async () => null });
    const prof = await api.onboardingProfile(SURVEY);
    const plan = await api.generateMealPlan({ profile_id: prof.data.profile_id });
    const req = { profile_id: prof.data.profile_id, plan_id: plan.data.plan_id, duration_weeks: 4, payment_method: 'card', schedule: { preferred_days: ['tuesday'], first_dates: { tuesday: '2026-12-01' }, preferred_time_slot: 'early_morning_06_08', shipping_address: {} } };
    expect((await api.previewSubscription(req)).error.code).toBe('AUTH_REQUIRED');
    expect((await api.createSubscription(req)).error.code).toBe('AUTH_REQUIRED');
    expect(h.calls.some((c) => c.path.startsWith('/subscription'))).toBe(false);
  });

  it('W1-03: 2 lần mỗi tuần: 8 lần giao, ngày của hai thứ giao xen kẽ tăng dần, bữa chia cho từng lần giao', async () => {
    const { api, h } = make({
      'GET /delivery/options': OPTIONS, 'GET /account/overview': { credit: { real_vnd: 0, promo_vnd: 0, total_vnd: 0 }, customer: {} }, 'GET /credit/packs': { packs: [] },
      'PUT /account/consents': {}, 'PUT /account/profile': {},
      'POST /subscription/preview': { duration_weeks: 8, total_order_amount_vnd: 8, total_discount_vnd: 0, referral: null, weeks: Array.from({ length: 8 }, (_, i) => ({ week_index: i + 1, delivery_date: '2026-12-01', charge_at: 'a', cutoff_at: `c${i}`, amount_vnd: 1, discount_vnd: 0, pay_vnd: 1 })), slot_full: false, full_dates: [] }
    });
    const prof = await api.onboardingProfile(SURVEY);
    const plan = await api.generateMealPlan({ profile_id: prof.data.profile_id });
    const opts = await api.deliveryOptions({ profile_id: prof.data.profile_id, deliveries_per_week: 2 });
    expect(opts.data.options).toHaveLength(1);
    expect(opts.data.options[0].preferred_days).toEqual(['tuesday', 'friday']);
    expect(opts.data.options[0].slots.map((s) => s.slot_id)).toEqual(['early_morning_06_08']); // chỉ khung chung của cả hai thứ
    const o = opts.data.options[0];
    const r = await api.previewSubscription({ profile_id: prof.data.profile_id, plan_id: plan.data.plan_id, duration_weeks: 4, payment_method: 'card', schedule: { delivery_frequency: 'twice_a_week', preferred_days: o.preferred_days, first_dates: o.first_dates, preferred_time_slot: 'early_morning_06_08', shipping_address: { district: 'Quận 7' } } });
    const body = h.calls.find((c) => c.path === '/subscription/preview').body;
    expect(body.weeks.map((w) => w.delivery_date)).toEqual(['2026-12-01', '2026-12-04', '2026-12-08', '2026-12-11', '2026-12-15', '2026-12-18', '2026-12-22', '2026-12-25']);
    expect(body.weeks.map((w) => w.week_index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(body.duration_weeks).toBe(8);
    const perDelivery = body.weeks.map((w) => new Set(w.meals.map((m) => m.meal_index)).size);
    expect(perDelivery.slice(0, 2)).toEqual([3, 2]);
    expect(r.data.cycle_weeks).toHaveLength(4);
    expect(r.data.cycle_weeks[0].deliveries).toBe(2);
  });

  it('W1-03: tuần dùng số 1-based ở máy chủ và 0-based ở giao diện: myWeeks, mealOptions, changeMeal, skip', async () => {
    const week = (n, extra = {}) => ({
      week_index: n, status: 'editable', status_label: 'Có thể đổi món', editable: true, deadline_at: '2026-11-29T01:00:00.000Z', delivery_date: '2026-12-01', slot_id: 'early_morning_06_08',
      order_code: 'MV-261201-0001', order_state: 'DRAFT', route_id: null, meals: [
        { meal_index: 1, kind: 'protein', dish_id: 'D-PRT-001', name: 'Ba rọi', servings: 3, price_vnd: 67500, editable: true },
        { meal_index: 1, kind: 'carb', dish_id: 'D-CRB-001', name: 'Gạo', servings: 3, price_vnd: 9000, editable: true }
      ], list_vnd: 76500, discount_vnd: 0, amount_vnd: 76500, charge: { state: 'scheduled', at: '2026-11-28T00:00:00.000Z', amount_vnd: 76500, reason: '' },
      postponed_to_week: null, moved_from_week: null, skip: { allowed: true, code: null, reason: '' }, delivery_instruction: null, delivery_proof: { delivered_at: null, photo_url: null }, late_payment: null, ...extra
    });
    const { api, h } = make({
      'GET /subscription/weeks': { subscription: { id: 's', status: 'active', weeks: 4, payment_method: 'fresh_credit', zone_id: 'Z2', zone_name: 'Q7', slot_id: 'early_morning_06_08', skips_used: 0, skips_max: 1, created_at: 'x', cancelled_at: null, first_delivery_date: '2026-12-01', delivery_instruction: null }, weeks: [week(1), week(2, { postponed_to_week: 5, status: 'postponed', status_label: 'Tạm hoãn', late_payment: { status: 'pending_review', decision: null } })], now: 'n' },
      'GET /subscription/weeks/3/meals/1/options': { editable: true, deadline_at: '2026-11-29T01:00:00.000Z', options: [{ dish_id: 'D-PRT-001', name: 'Ba rọi', price_delta_vnd: 0, current: true }, { dish_id: 'D-PRT-002', name: 'Bò lúc lắc', price_delta_vnd: 21000, current: false }] },
      'POST /subscription/meal-change': ({ body }) => ({ week_index: body.week_index, meal_index: 1, kind: 'protein', from: { dish_id: 'D-PRT-001', name: 'Ba rọi' }, to: { dish_id: 'D-PRT-002', name: 'Bò' }, week_status: 'editable', paid: false, old_amount_vnd: 76500, new_amount_vnd: 97500, delta_vnd: 21000, deadline_at: '2026-11-29T01:00:00.000Z', charge_at: '2026-11-28T00:00:00.000Z', settle: { mode: 'none', amount_vnd: 0, enough: true, short_vnd: 0 }, ...(body.dry_run ? {} : { replayed: false, balance: { real_vnd: 1, promo_vnd: 2, total_vnd: 3 } }) }),
      'GET /subscription/skip-preview': { week_index: 1, new_week_index: 5, new_deliveries: [{ delivery_date: '2026-12-29', charge_at: '2026-12-26T00:00:00.000Z', cutoff_at: '2026-12-27T01:00:00.000Z' }], keeps_discount_vnd: 0, skips_left: 0 },
      'POST /subscription/skip-week': { week_index: 1, new_week_index: 5, new_delivery_date: '2026-12-29', skips_left: 0 }
    });
    const w = await api.myWeeks();
    expect(w.data.weeks.map((x) => x.week_index)).toEqual([0, 1]);
    expect(w.data.weeks[0].number).toBe(1);
    expect(w.data.weeks[1].postponed_to_week).toBe(4);
    expect(w.data.weeks[1].late_payment).toMatchObject({ status: 'pending_review', tone: 'wait' });
    expect(w.data.weeks[0].meals[0].dishes.map((d) => d.kind)).toEqual(['protein', 'carb']);
    expect(w.data.weeks[0].boxes[0]).toMatchObject({ slot_label: expect.stringContaining('06:00'), phase: 'editable' });

    const opts = await api.mealOptions({ week_index: 2, meal_index: 1, kind: 'protein' });
    expect(opts.data.options[1]).toMatchObject({ dish_id: 'D-PRT-002', price_delta_vnd: 21000 });
    expect(h.calls.find((c) => c.path.includes('/options')).query).toEqual({ kind: 'protein' });

    const prev = await api.previewMealChange({ week_index: 2, meal_index: 1, kind: 'protein', dish_id: 'D-PRT-002' });
    expect(prev.data.week_index).toBe(2);
    expect(h.calls.filter((c) => c.path === '/subscription/meal-change')[0].body).toMatchObject({ week_index: 3, dry_run: true });
    const done = await api.changeMeal({ week_index: 2, meal_index: 1, kind: 'protein', dish_id: 'D-PRT-002' });
    expect(done.data.balance).toEqual({ real_vnd: 1, promo_vnd: 2, total_vnd: 3 });

    expect((await api.previewSkip({ week_index: 0 })).data).toMatchObject({ week_index: 0, new_week_index: 4 });
    expect(h.calls.find((c) => c.path === '/subscription/skip-preview').query).toEqual({ week_index: 1 });
    const sk = await api.skipWeek({ week_index: 0 });
    expect(sk.data.new_deliveries[0].delivery_label).toMatch(/29\/12/);
  });

  it('W1-03: yêu cầu có xác nhận: dừng gói cần confirm, gia hạn cần đồng ý rõ ràng; không gọi máy chủ khi thiếu', async () => {
    const { api, h } = make({});
    expect((await api.cancelSubscription({})).error.code).toBe('CONFIRM_REQUIRED');
    expect((await api.renewSubscription({ consent: false })).error.code).toBe('CONSENT_REQUIRED');
    expect(h.calls.filter((c) => c.path !== '/delivery/zones')).toHaveLength(0);
  });

  it('xem trước và xác nhận hủy gói chưa thanh toán dùng cùng luồng hủy của máy chủ', async () => {
    const raw = { cancelled_weeks: 4, kept_weeks: 0, refund_vnd: 0, promo_forfeited_vnd: 0, discount_clawback_vnd: 0, has_paid_weeks: false, unpaid: true };
    const { api, h } = make({
      'GET /subscription/weeks': { subscription: null, weeks: [] },
      'POST /subscription/cancel': raw
    });
    expect((await api.previewCancel()).data).toMatchObject({ unpaid: true });
    expect((await api.cancelSubscription({ confirm: true })).data).toMatchObject({ unpaid: true });
    expect(h.calls.filter((c) => c.path === '/subscription/cancel').map((c) => c.body)).toEqual([
      { confirm: true, dry_run: true }, { confirm: true }
    ]);
  });

  it('W1-03: mua gói là tạo lệnh chuyển khoản (không nạp tiền lẻ); số tiền lẻ bị từ chối ở web', async () => {
    const order = { order_id: '1', pack_id: 'standard_4w', label: 'Gói 4 tuần', pay_vnd: 1_500_000, credit_received_vnd: 1_650_000, transfer_content: 'MOVA-X1', status: 'pending', created_at: 'a', expires_at: 'b' };
    const { api, h } = make({ 'GET /credit/packs': { packs: [{ id: 'standard_4w', label: 'Gói 4 tuần', weeks: 4, meals: 20, portions: 40, price_vnd: 1_500_000, discount_vnd: 150_000, value_vnd: 1_650_000 }] }, 'POST /credit/pack-orders': order });
    const r = await api.topUpCredit({ pay_vnd: 1_500_000 });
    expect(r.data).toMatchObject({ pack_id: 'standard_4w', transfer_content: 'MOVA-X1', pending: true, bonus_vnd: 150_000 });
    expect(h.calls.find((c) => c.path === '/credit/pack-orders').body).toEqual({ pack_id: 'standard_4w' });
    expect((await api.topUpCredit({ pay_vnd: 123_456 })).error.code).toBe('TOPUP_AMOUNT_NOT_ALLOWED');
  });

  it('W1-03: đánh giá món: giữ tạm từng phần, chỉ gửi khi đủ thích + vị xốt + độ cay; món không xốt chỉ cần bấm thích', async () => {
    const { api, h } = make({ 'POST /ratings': { rated: true } });
    const first = await api.rateDish({ order_id: 'W1', dish_id: 'D-PRT-001', thumb: 'up' });
    expect(first.data).toMatchObject({ complete: false, thumb: 'up' });
    await api.rateDish({ order_id: 'W1', dish_id: 'D-PRT-001', sauce_salt: 'ok' });
    expect(h.calls.filter((c) => c.path === '/ratings')).toHaveLength(0);
    const last = await api.rateDish({ order_id: 'W1', dish_id: 'D-PRT-001', spice: 'low' });
    expect(last.data.complete).toBe(true);
    expect(h.calls.find((c) => c.path === '/ratings').body).toEqual({ subscription_week_id: 'W1', dish_id: 'D-PRT-001', thumb: 'up', sauce_salt: 'ok', spice: 'low' });
    const plain = await api.rateDish({ order_id: 'W2', dish_id: 'D-CRB-001', thumb: 'down' });
    expect(plain.data.complete).toBe(true);
  });

  it('W1-03: thông báo là mảng thuần, đánh dấu đã đọc trả số lượng', async () => {
    const { api } = make({
      'GET /account/notifications': [{ id: '2', type: 'reward', title: 'T', body: 'B', created_at: 'x', read: false, meta: null }],
      'POST /account/notifications/read': { marked_read: 4 }
    });
    expect(await api.notifications()).toEqual([{ id: '2', type: 'reward', title: 'T', body: 'B', created_at: 'x', read: false, meta: null }]);
    expect(await api.markNotificationsRead()).toBe(4);
  });
});
