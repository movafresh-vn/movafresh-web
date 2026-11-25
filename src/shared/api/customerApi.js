// api.customer: app khách nói chuyện với backend thật qua http.js. Tên hàm giữ nguyên như bản giả lập cũ; mọi hàm đều async.
// Hợp đồng phong bì: thành công => { status: 'success', data }, lỗi nghiệp vụ => { status: 'error', error: { code, message, ... } }
// (không ném lỗi nên các kiểm tra errorKind cũ vẫn chạy). Chỉ lỗi MẠNG mới ném (NETWORK_ERROR) để giao diện báo "mất kết nối".
// Danh tính khách lấy từ phiên Supabase (Bearer), KHÔNG truyền mã khách. Số tiền hiển thị luôn là số máy chủ trả.
import { BUSINESS } from '../config/business';
import { DISHES } from '../data/catalog';
import { normalizeContact } from '../domain/leads';
import { getAccessToken } from '../../services/supabase';
import * as aiApi from '../../services/aiApi';
import { dayKey, serverNow } from '../utils/time';
import { http as sharedHttp, HttpError } from './http';
import { CUSTOMER_ROUTES, fillPath } from './routes';
import { applyDishCatalog } from './adapters/dishes';
import {
  adaptCancelPreview, adaptCancelResult, adaptCreditSummary, adaptLot, adaptMealChange, adaptMealOptions, adaptNotifications, adaptOverview, adaptPackOrder,
  adaptPacks, adaptPendingRatings, adaptRenewalOffer, adaptSkipPreview, adaptSkipResult, adaptWeeks, toApiIndex
} from './adapters/account';
import { adaptCreated, adaptDeliveryOptions, adaptPreview, buildSubscriptionBody, DOW_BY_NAME } from './adapters/checkout';
import { aiMealsToBase, createPlanDrafts } from './planDraft';

export const ok = (data) => ({ status: 'success', data });
export const fail = (code, message, extra = {}) => ({ status: 'error', error: { code, message, ...extra } });

const AI_TIMEOUT_MS = 6000;
const HEALTH_NEEDS = ['balanced', 'gym', 'weight_loss', 'limit_sugar', 'sensitive_stomach', 'elderly', 'young_child', 'gout', 'meat_lover'];
const CUISINE_OF = { viet: ['viet'], western: ['western'], viet_western: ['viet', 'western'] };
const SKIP_KIND = ['protein', 'soup', 'veg', 'carb', 'dessert'];

/** Chạy một thao tác gọi máy chủ; lỗi nghiệp vụ thành phong bì lỗi, lỗi mạng thì ném. */
async function envelope(fn) {
  try {
    return ok(await fn());
  } catch (e) {
    if (e instanceof HttpError && e.code !== 'NETWORK_ERROR') {
      const d = e.details && typeof e.details === 'object' ? e.details : {};
      return fail(e.code, e.message, { ...d, ...(e.details ? { details: e.details } : {}), status: e.status });
    }
    throw e;
  }
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

async function subscriptionRequestKey(profileId, body) {
  if (!globalThis.crypto?.subtle) throw new HttpError('Trình duyệt không hỗ trợ xác thực yêu cầu thanh toán an toàn.', { code: 'VALIDATION_ERROR', status: 400 });
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body)));
  const digest = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `sub-${profileId}-${digest}`;
}

/**
 * @param {{ http?: ReturnType<typeof sharedHttp>, ai?: typeof aiApi, drafts?: ReturnType<typeof createPlanDrafts>, token?: () => Promise<string|null>, now?: () => Date, cfg?: typeof BUSINESS }} [deps]
 */
export function createCustomerApi(deps = {}) {
  const http = deps.http || sharedHttp();
  const ai = deps.ai || aiApi;
  const cfg = deps.cfg || BUSINESS;
  const tokenOf = deps.token || getAccessToken;
  const clock = deps.now || (() => serverNow());
  const drafts = deps.drafts || createPlanDrafts({ cfg, now: clock });

  /** Gọi một đường trong bảng routes. */
  const call = (name, { params, query, body, key } = {}) => {
    const [method, path, opts] = CUSTOMER_ROUTES[name];
    return http.request(method, fillPath(path, params), { query, body, key, auth: !(opts && opts.auth === false) });
  };
  const authed = async () => Boolean(await tokenOf().catch(() => null));
  const needLogin = () => fail('AUTH_REQUIRED', 'Hãy xác thực số điện thoại để tiếp tục');

  // ---------- Danh mục dùng chung (có bộ nhớ đệm ngắn) ----------
  const cache = new Map();
  async function cached(name, load, ttlMs = 60_000) {
    const hit = cache.get(name);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    const value = await load();
    cache.set(name, { at: Date.now(), value });
    return value;
  }
  const zones = () => cached('zones', async () => (await call('serviceAreas')).map((z) => ({ zone_id: z.zone_id, name: z.name, districts: z.districts, province: z.province, delivery_days: z.delivery_days.map((n) => DOW_BY_NAME[n]) })), 300_000);
  const packs = () => cached('packs', async () => adaptPacks((await call('creditPacks')).packs));

  async function zoneForText(text) {
    const t = String(text || '').toLowerCase();
    let list;
    try {
      list = await zones();
    } catch (e) {
      if (!(e instanceof HttpError)) throw e;
      list = cfg.zones.map((z) => ({ zone_id: z.id, name: z.name, districts: z.districts, province: null }));
    }
    return list.find((z) => z.districts.some((d) => t.includes(d.toLowerCase()))) || null;
  }

  /** Tải món từ backend vào catalog dùng chung của phễu. Lỗi mạng thì giữ catalog đang có. */
  async function loadDishes() {
    const r = await call('dishes');
    return applyDishCatalog(r.dishes);
  }

  // ---------- Hồ sơ an toàn gửi máy chủ trước khi xem trước / đăng ký ----------
  let setupSig = '';
  async function ensureSetup(profile, addr) {
    const body = {
      full_name: addr && addr.receiver_name ? String(addr.receiver_name).trim().slice(0, 120) || undefined : undefined,
      household_size: profile.householdSize,
      servings_default: profile.householdSize,
      household_needs: (profile.survey.household_needs || []).filter((n) => HEALTH_NEEDS.includes(n)),
      cuisine_preferences: CUISINE_OF[profile.cuisine] || ['viet'],
      avoid: profile.survey.avoid || [],
      weekly_grocery_budget_vnd: profile.weeklyBudgetVnd || null
    };
    const sig = JSON.stringify([profile.id, body]);
    if (sig === setupSig) return;
    await call('setConsents', { body: { personal_data_processing: true } });
    await call('saveSafetyProfile', { body });
    setupSig = sig;
  }

  // ---------- Bản nháp thực đơn → yêu cầu gửi máy chủ ----------
  /** Bữa của tuần 1 ở dạng máy chủ nhận cho giao nhanh (chỉ món, suất, hệ số khẩu phần). */
  const expressMeals = (body) => body.weeks[0].meals.map((m) => ({ dish_id: m.dish_id, servings: m.servings, ...(m.portion_factor ? { portion_factor: m.portion_factor } : {}) }));

  function subscriptionBody(req, extra = {}) {
    const profile = drafts.profileOf(req.profile_id);
    if (!profile) return { error: { code: 'PLAN_NOT_FOUND', message: 'Không tìm thấy hồ sơ hoặc thực đơn' } };
    const first = drafts.mealsFor(req.plan_id);
    if (!first) return { error: { code: 'PLAN_NOT_FOUND', message: 'Không tìm thấy hồ sơ hoặc thực đơn' } };
    const built = buildSubscriptionBody({
      req: { ...req, ...extra },
      servings: profile.householdSize,
      weeksOfMeals: (n) => (n === 1 ? first.meals : drafts.mealsForWeek(req.plan_id, n))
    });
    return { ...built, profile };
  }

  async function aiBaseMeals(profile, weekNumber) {
    try {
      const survey = {
        household_size: profile.householdSize,
        weekly_home_meals_count: profile.mealsPerWeek,
        cuisine_preferences: CUISINE_OF[profile.cuisine] || ['viet'],
        avoid: profile.survey.avoid || [],
        household_needs: (profile.survey.household_needs || []).filter((n) => HEALTH_NEEDS.includes(n)),
        ...(profile.weeklyBudgetVnd ? { weekly_grocery_budget_vnd: profile.weeklyBudgetVnd } : {})
      };
      const out = (await authed())
        ? await withTimeout(ai.generateMealPlan({ survey_answers: survey, week_number: weekNumber }), AI_TIMEOUT_MS)
        : await withTimeout(ai.generateGuestMealPlan({ survey_answers: survey }), AI_TIMEOUT_MS);
      return aiMealsToBase(out, { restrictions: profile.restrictions, mealsCount: profile.mealsPerWeek });
    } catch {
      // AI/máy chủ không sẵn sàng hoặc trả món ngoài catalog: dùng bộ xếp món nội bộ (luôn tôn trọng dị ứng/kiêng)
      return null;
    }
  }

  const draftEnvelope = (r) => (r.error ? fail(r.error.code, r.error.message) : ok(r.view || r.data));

  return {
    loadDishes,

    // ---------- Lead và khu vực ----------
    async serviceAreas() {
      return (await zones()).map((z) => ({ ...z, districts: [...z.districts] }));
    },

    async checkArea(text) {
      const z = await zoneForText(text);
      return { served: Boolean(z), zone_id: z ? z.zone_id : null, zone_name: z ? z.name : null };
    },

    captureLead(req = {}) {
      return envelope(() => call('captureLead', { body: { contact: String(req.contact ?? ''), source: req.source || 'plans' } }));
    },

    joinWaitlist(req = {}) {
      return envelope(() => call('joinWaitlist', { body: { ...(req.lead_id ? { lead_id: req.lead_id } : { contact: String(req.contact ?? '') }), district: String(req.district || '').trim(), source: req.source || 'plans' } }));
    },

    // ---------- Hồ sơ và thực đơn (bản nháp ở trình duyệt, kiểm lại ở máy chủ) ----------
    async onboardingProfile(req) {
      const a = req.survey_answers || {};
      const contact = normalizeContact(req.user_contact?.phone_or_email);
      const zone = await zoneForText(a.living_area);
      if (!zone) {
        if (contact) await call('joinWaitlist', { body: { ...(req.lead_id ? { lead_id: req.lead_id } : { contact: contact.value }), district: String(a.living_area || 'không rõ').slice(0, 60) } }).catch(() => null);
        return fail('OUT_OF_ZONE', 'MOVA chưa giao tới khu vực này');
      }
      return ok(drafts.createProfile({ req, zone: { zone_id: zone.zone_id, zone_name: zone.name, province: zone.province } }).out);
    },

    async generateMealPlan(req) {
      const profile = drafts.profileOf(req.profile_id);
      if (!profile) return fail('PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ');
      const weekNumber = req.week_number || 1;
      const baseMeals = await aiBaseMeals(profile, weekNumber);
      const extra = (req.custom_upsell_additions || []).some((x) => x.startsWith('extra_') && x.includes('protein'));
      return draftEnvelope(drafts.generate({ profileId: profile.id, weekNumber, upsellsExtraProtein: extra, baseMeals }));
    },

    async getPlan(planId) {
      return draftEnvelope(drafts.get(planId));
    },
    async applyChefMenu(req = {}) {
      return draftEnvelope(drafts.applyChefMenu(req));
    },
    async configurePlan(req = {}) {
      return draftEnvelope(drafts.configure(req));
    },
    async swapOptions(req = {}) {
      return draftEnvelope(drafts.swapOptions(req));
    },

    // ---------- Giao hàng ----------
    /** Sức chứa còn lại từng ngày giao của một khu (khung giờ → từng ngày: còn chỗ khung giờ, còn năng lực chu kỳ, và số nhỏ hơn trong hai). */
    availableSlots(zoneId, days = 4, preferredDays = null, startDate = null) {
      return envelope(() => call('availableSlots', { query: { zone_id: zoneId, start_date: startDate || dayKey(clock()), weeks: Math.max(1, Math.ceil(days / 7)), ...(preferredDays && preferredDays.length ? { preferred_days: preferredDays.join(',') } : {}) } }));
    },

    async deliveryOptions(req = {}) {
      const profile = drafts.profileOf(req.profile_id);
      if (!profile) return fail('PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ');
      return envelope(async () => adaptDeliveryOptions(await call('deliveryOptions', { query: { zone_id: profile.zoneId, weeks: cfg.subscription.defaultWeeks, ...(req.start_date ? { start_date: req.start_date } : {}) } }), { perWeek: req.deliveries_per_week === 2 ? 2 : 1 }));
    },

    // ---------- Giao nhanh 24-36 giờ (ĐỀ XUẤT 2.4.0; máy chủ trả enabled=false khi tắt) ----------
    /** Các khung giao nhanh THỰC HIỆN ĐƯỢC cho tuần 1. Dùng đúng địa chỉ và thực đơn tuần 1 của bản nháp. */
    async expressOptions(req) {
      if (!(await authed())) return needLogin();
      const built = subscriptionBody({ ...req, payment_method: 'fresh_credit' });
      if (built.error) return fail(built.error.code, built.error.message);
      return envelope(async () => {
        await ensureSetup(built.profile, req.schedule && req.schedule.shipping_address);
        return call('expressOptions', { body: { shipping_address: built.body.schedule.shipping_address, meals: expressMeals(built.body) } });
      });
    },
    async holdExpress(req) {
      if (!(await authed())) return needLogin();
      const built = subscriptionBody({ ...req, payment_method: 'fresh_credit' });
      if (built.error) return fail(built.error.code, built.error.message);
      // Mỗi lần giữ một khóa riêng: nhả rồi giữ lại cùng khung không được trả lại chỗ đã nhả.
      const key = `xh-${req.request_id}-${req.day}-${req.slot_id}-${Date.now().toString(36)}`.slice(0, 120);
      return envelope(() => call('expressHold', { body: { request_id: req.request_id, day: req.day, slot_id: req.slot_id, meals: expressMeals(built.body) }, key }));
    },
    releaseExpress(req) {
      return envelope(() => call('expressRelease', { params: { id: req.hold_id } }));
    },

    async previewSubscription(req) {
      if (!(await authed())) return needLogin();
      const built = subscriptionBody({ ...req, payment_method: req.payment_method || 'bank_transfer_4w', voucher_code: req.voucher_code ?? cfg.incentives.giftCardCode });
      if (built.error) return fail(built.error.code, built.error.message);
      return envelope(async () => {
        await ensureSetup(built.profile, req.schedule && req.schedule.shipping_address);
        const [raw, plist, overview] = await Promise.all([call('previewSubscription', { body: built.body }), packs(), call('getAccount').catch(() => null)]);
        return adaptPreview(raw, {
          perWeek: built.perWeek, slotId: built.body.schedule.preferred_time_slot, packs: plist,
          balanceVnd: overview ? overview.credit.total_vnd : 0, paymentRef: raw.payment_ref || null
        });
      });
    },

    async createSubscription(req) {
      if (!(await authed())) return needLogin();
      if ((req.duration_weeks || 0) < cfg.subscription.minWeeks) return fail('MIN_4_WEEKS', `Gói tối thiểu ${cfg.subscription.minWeeks} tuần`);
      const built = subscriptionBody(req);
      if (built.error) return fail(built.error.code, built.error.message);
      return envelope(async () => {
        await ensureSetup(built.profile, req.schedule && req.schedule.shipping_address);
        const key = await subscriptionRequestKey(req.profile_id, built.body);
        const raw = await call('createSubscription', { body: built.body, key });
        const out = adaptCreated(raw, { perWeek: built.perWeek, slotId: built.body.schedule.preferred_time_slot });
        const overview = await call('getAccount').catch(() => null);
        out.payment_method = built.body.payment_method;
        out.referral_code = overview ? overview.customer.referral_code : null;
        return out;
      });
    },

    // ---------- Tài khoản ----------
    getAccount() {
      return envelope(async () => adaptOverview(await call('getAccount')));
    },
    supportRequest(req) {
      return envelope(() => call('supportRequest', { body: { category: req.category, message: req.message }, key: req.key }));
    },
    async findCustomer() {
      const r = await this.getAccount();
      return r.status === 'success' ? ok(r.data.customer) : r;
    },
    myWeeks(subscriptionId) {
      return envelope(async () => adaptWeeks(await call('myWeeks', { query: { subscription_id: subscriptionId } })));
    },
    mealOptions(req = {}) {
      return envelope(async () => adaptMealOptions(await call('mealOptions', { params: { week_index: toApiIndex(req.week_index), meal_index: req.meal_index }, query: { kind: req.kind, subscription_id: req.subscription_id } })));
    },
    previewMealChange(req = {}) {
      return envelope(async () => adaptMealChange(await call('changeMeal', { body: { week_index: toApiIndex(req.week_index), meal_index: req.meal_index, kind: req.kind, dish_id: req.dish_id, dry_run: true, ...(req.subscription_id ? { subscription_id: req.subscription_id } : {}) } })));
    },
    changeMeal(req = {}) {
      return envelope(async () => {
        const raw = await call('changeMeal', { body: { week_index: toApiIndex(req.week_index), meal_index: req.meal_index, kind: req.kind, dish_id: req.dish_id, ...(req.subscription_id ? { subscription_id: req.subscription_id } : {}) }, key: req.key });
        return raw.replayed && !raw.from ? { replayed: true, week_index: req.week_index, balance: raw.balance } : adaptMealChange(raw);
      });
    },
    previewSkip(req = {}) {
      return envelope(async () => adaptSkipPreview(await call('previewSkip', { query: { week_index: toApiIndex(req.week_index), subscription_id: req.subscription_id } })));
    },
    skipWeek(req = {}) {
      return envelope(async () => adaptSkipResult(await call('skipWeek', { body: { week_index: toApiIndex(req.week_index), ...(req.subscription_id ? { subscription_id: req.subscription_id } : {}) } })));
    },
    previewCancel(subscriptionId) {
      return envelope(async () => {
        const [raw, weeks] = await Promise.all([call('cancelSubscription', { body: { confirm: true, dry_run: true, ...(subscriptionId ? { subscription_id: subscriptionId } : {}) } }), call('myWeeks', { query: { subscription_id: subscriptionId } })]);
        const view = adaptWeeks(weeks);
        const skippable = view.weeks.find((w) => w.skip && w.skip.allowed);
        const perWeek = view.weeks[0] ? new Set(view.weeks[0].meals.map((m) => m.meal_index)).size : undefined;
        return adaptCancelPreview(raw, {
          ...(perWeek ? { mealsPerWeek: perWeek } : {}),
          skipWeek: skippable ? { week_index: skippable.week_index, number: skippable.number, deadline_label: skippable.deadline_label } : null
        });
      });
    },
    cancelSubscription(req = {}) {
      if (req.confirm !== true) return Promise.resolve(fail('CONFIRM_REQUIRED', 'Cần xác nhận dừng gói'));
      return envelope(async () => adaptCancelResult(await call('cancelSubscription', { body: { confirm: true, ...(req.subscription_id ? { subscription_id: req.subscription_id } : {}) } })));
    },
    unlinkCard() {
      return envelope(() => call('unlinkCard', { body: {} }));
    },
    /**
     * Bắt đầu liên kết thẻ/ví đối tác: trả { link_id, url, expires_at }, mở `url` của cổng thanh toán để khách liên kết.
     * return_url phải thuộc danh sách origin backend cho phép (mặc định origin hiện tại). Web không bao giờ nhận số thẻ hay token.
     */
    linkCard(returnUrl) {
      return envelope(() => call('linkCard', { body: { return_url: returnUrl } }));
    },
    renewalOffer(subscriptionId) {
      return envelope(async () => adaptRenewalOffer(await call('renewalOffer', { query: { subscription_id: subscriptionId } })));
    },
    renewSubscription(req = {}) {
      if (req.consent !== true) return Promise.resolve(fail('CONSENT_REQUIRED', 'Cần bạn đồng ý rõ ràng trước khi gia hạn'));
      return envelope(() => call('renewSubscription', { body: { consent: true, ...(req.subscription_id ? { subscription_id: req.subscription_id } : {}) } }));
    },

    // ---------- Fresh Credit (chỉ mua Gói Suất ăn trả trước cố định) ----------
    creditSummary({ cursor, order_code } = {}) {
      return envelope(async () => {
        const [account, plist, overview] = await Promise.all([
          call('creditAccount', { query: { cursor, order_code } }),
          call('creditPacks'),
          call('getAccount').then((value) => ({ value, failed: false }), () => ({ value: null, failed: true }))
        ]);
        return adaptCreditSummary({ account, packs: plist.packs, overview: overview.value, alert_unavailable: overview.failed });
      });
    },
    /** Đặt mua một gói: tiền về qua chuyển khoản ngân hàng mới được cộng vào Fresh Credit (không có nạp số tiền lẻ). */
    topUpCredit(req = {}) {
      return envelope(async () => {
        let packId = req.pack_id;
        if (!packId && req.pay_vnd) {
          const hit = (await packs()).find((p) => p.pay_vnd === Number(req.pay_vnd));
          if (!hit) throw new HttpError('Chỉ mua được các Gói Suất ăn trả trước có sẵn', { code: 'TOPUP_AMOUNT_NOT_ALLOWED', status: 400 });
          packId = hit.pack_id;
        }
        return adaptPackOrder(await call('createPackOrder', { body: { pack_id: packId } }));
      });
    },
    listPackOrders() {
      return envelope(async () => (await call('listPackOrders')).map(adaptPackOrder));
    },

    // ---------- Thông báo (mảng thuần như bản cũ) ----------
    async notifications() {
      return adaptNotifications(await call('notifications'));
    },
    async listNotifications() {
      return this.notifications();
    },
    async markNotificationsRead() {
      return (await call('markNotificationsRead', { body: {} })).marked_read;
    },

    // ---------- Đánh giá ----------
    pendingRatings() {
      return envelope(async () => adaptPendingRatings(await call('pendingRatings')));
    },
    /**
     * Máy chủ nhận MỘT đánh giá đủ ba phần (thích, vị xốt, độ cay) cho mỗi (tuần, món). Giao diện chấm từng bước nên các phần được giữ tạm ở đây
     * và chỉ gửi khi đủ; món không có xốt thì chỉ cần bấm thích. `complete` cho giao diện biết đã gửi hay chưa.
     */
    async rateDish(req = {}) {
      const key = `${req.order_id}|${req.dish_id}`;
      const staged = (rateStaging.get(key) || {});
      for (const k of ['thumb', 'sauce_salt', 'spice']) if (req[k] !== undefined) staged[k] = req[k];
      rateStaging.set(key, staged);
      const hasSauce = Boolean(DISHES[req.dish_id] && DISHES[req.dish_id].sauce);
      const body = { subscription_week_id: req.order_id, dish_id: req.dish_id, thumb: staged.thumb, sauce_salt: staged.sauce_salt || (hasSauce ? undefined : 'ok'), spice: staged.spice || (hasSauce ? undefined : 'ok') };
      const out = { order_id: req.order_id, dish_id: req.dish_id, sauce_code: hasSauce ? DISHES[req.dish_id].sauce : null, thumb: staged.thumb || null, sauce_salt: staged.sauce_salt || null, spice: staged.spice || null };
      if (!body.thumb || !body.sauce_salt || !body.spice) return ok({ ...out, complete: false });
      const r = await envelope(() => call('rateDish', { body }));
      if (r.status === 'success' || (r.status === 'error' && r.error.code === 'ALREADY_RATED')) rateStaging.delete(key);
      return r.status === 'success' ? ok({ ...out, complete: true }) : r;
    },

    // ---------- Thưởng và hồ sơ ----------
    rewards() {
      return envelope(() => call('rewards'));
    },
    saveProfile(req = {}) {
      return envelope(async () => {
        const body = {};
        if (req.name !== undefined && String(req.name).trim()) body.name = String(req.name).trim();
        if (req.phone) body.phone = String(req.phone).trim();
        if (req.email) body.email = String(req.email).trim();
        if (req.members) body.members = req.members;
        if (req.address) {
          const text = String(req.address).trim();
          const z = await zoneForText(text);
          const district = z ? z.districts.find((d) => text.toLowerCase().includes(d.toLowerCase())) : null;
          if (!district) throw new HttpError('Hãy ghi rõ quận/huyện trong địa chỉ để MOVA xếp tuyến giao', { code: 'ADDRESS_DISTRICT_REQUIRED', status: 400 });
          body.address = { street: text, district, ...(z.province ? { city: z.province } : {}) };
        }
        return call('saveProfile', { body });
      });
    },
    claimShare(req = {}) {
      return envelope(() => call('claimShare', { body: { kind: ['photo', 'qr'].includes(req.kind) ? req.kind : 'menu', ref: String(req.ref || '').trim(), ...(req.photo_name ? { photo_name: req.photo_name } : {}) } }));
    },

    // ---------- Truy xuất QR (công khai) ----------
    traceLot(code) {
      const key = String(code || '').trim().toUpperCase();
      return envelope(async () => adaptLot(await call('traceLot', { params: { code: key } })));
    },
    async sampleLotCodes() {
      return call('sampleLotCodes', { query: { sample: 'true' } }).catch((e) => {
        if (e instanceof HttpError && e.code !== 'NETWORK_ERROR') return [];
        throw e;
      });
    },

    /** Xóa bản nháp thực đơn và các bộ nhớ đệm (đăng xuất, làm lại từ đầu). */
    reset() {
      drafts.clear();
      cache.clear();
      rateStaging.clear();
      setupSig = '';
    },

    _drafts: drafts
  };
}

const rateStaging = new Map();
export { SKIP_KIND };
