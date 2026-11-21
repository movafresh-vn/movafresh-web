import { defineStore } from 'pinia';
import { api } from '../shared/api';
import { errorKind, withGiftCard } from '../shared/api/requests';
import { DEFAULT_INSTRUCTION, normalizeInstruction } from '../shared/api/adapters/checkout';
import { BUSINESS } from '../shared/config/business';

// Trạng thái phễu /plans. Lưu vào localStorage để khách tải lại trang hoặc bấm quay lại không mất dữ liệu.
// Thực đơn nháp nằm ở trình duyệt (api.customer giữ), còn GIÁ, ƯU ĐÃI, SỨC CHỨA và lịch trừ tiền luôn do máy chủ trả (xem trước / đăng ký).
// Mọi lời gọi api.customer đều được chờ (await); lỗi mạng ném ra và được bắt ở mỗi hành động để báo cho khách.
const KEY = 'mova_plans_flow_v2';

const freshAnswers = () => ({
  district: '',
  adults: 2,
  children: 0,
  size: BUSINESS.plan.householdDefault,
  needs: [],
  cuisine: 'viet',
  cuisines: ['viet'],
  proteinPrefs: {},
  avoid: [],
  meals: BUSINESS.plan.mealsPerWeekDefault,
  budget: null
});

const freshCheckout = () => ({
  frequency: 1,
  optionIndex: 0,
  slotId: '',
  // Hướng dẫn giao BẮT BUỘC chọn; mặc định "để ở lễ tân, shipper chụp ảnh" (hàng lạnh để lại thì phải có ảnh bằng chứng).
  instruction: { ...DEFAULT_INSTRUCTION, note: '' },
  name: '',
  phone: '',
  phoneVerified: false,
  newsletterOptin: false,
  voucherCode: '',
  street: '',
  ward: '',
  district: '',
  method: 'fresh_credit',
  packId: 'exact',
  agree: false
});

const freshState = () => ({
  contact: '',
  leadId: null,
  answers: freshAnswers(),
  profileId: null,
  planId: null,
  chefMenuApplied: false,
  checkout: freshCheckout(),
  result: null,
  waitlist: null,
  refCode: '' // mã mời từ link ?ref=MOVA-AB12; người mời nhận thưởng khi khách này trả gói đầu tiên
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const fresh = freshCheckout();
      const checkout = { ...fresh, ...s.checkout, instruction: normalizeInstruction({ ...fresh.instruction, ...(s.checkout && s.checkout.instruction) }) };
      return { ...freshState(), ...s, answers: { ...freshAnswers(), ...s.answers }, checkout };
    }
  } catch {
    // dùng trạng thái mới
  }
  return freshState();
}

const messageOf = (e) => (e && e.code === 'NETWORK_ERROR' ? 'Không kết nối được máy chủ MOVA. Bạn kiểm tra mạng rồi thử lại nhé.' : (e && e.message) || 'Có lỗi xảy ra, bạn thử lại nhé.');

export const usePlanFlowStore = defineStore('planFlow', {
  state: () => ({
    ...load(),
    // Không lưu: lấy lại từ API
    plan: null,
    options: null,
    preview: null,
    capacity: null, // [{ date, remaining, effective_remaining, cycle_remaining }] của khung giờ đang chọn
    busy: false,
    error: '',
    errorCode: ''
  }),

  getters: {
    areaName: (s) => s.answers.district,
    hasPlan: (s) => Boolean(s.planId),
    /** Ngày giao nào đã hết chỗ (khung giờ hoặc năng lực chu kỳ). */
    fullDates: (s) => (s.capacity ? s.capacity.filter((d) => d.effective_remaining <= 0).map((d) => d.date) : [])
  },

  actions: {
    persist() {
      try {
        const { contact, leadId, answers, profileId, planId, chefMenuApplied, checkout, result, waitlist, refCode } = this;
        localStorage.setItem(KEY, JSON.stringify({ contact, leadId, answers, profileId, planId, chefMenuApplied, checkout, result, waitlist, refCode }));
      } catch {
        // chế độ riêng tư: bỏ qua
      }
    },

    fail(res) {
      this.error = res && res.error ? res.error.message : '';
      this.errorCode = res && res.error ? res.error.code : '';
    },

    reset() {
      const refCode = this.refCode; // mã mời giữ lại khi khách làm lại từ đầu
      Object.assign(this, freshState(), { refCode, plan: null, options: null, preview: null, capacity: null, busy: false, error: '', errorCode: '' });
      api.customer.reset();
      this.persist();
    },

    /** Lưu mã mời từ link /plans?ref=... */
    setRef(code) {
      const c = String(code || '').trim().toUpperCase();
      if (c !== this.refCode) {
        this.refCode = c;
        this.persist();
      }
    },

    /** Màn đầu: lưu lead ngay khi khách nhập số Zalo hoặc email. */
    async saveContact(raw) {
      try {
        const res = await api.customer.captureLead({ contact: raw, source: 'plans' });
        if (res.status === 'error') {
          this.fail(res);
          return false;
        }
        this.error = '';
        this.contact = raw.trim();
        this.leadId = res.data.lead_id;
        this.persist();
        return true;
      } catch (e) {
        this.error = messageOf(e);
        return false;
      }
    },

    setAnswer(key, value) {
      this.answers[key] = value;
      if (key === 'adults' || key === 'children') {
        const a = Number(this.answers.adults != null ? this.answers.adults : 2);
        const c = Number(this.answers.children != null ? this.answers.children : 0);
        this.answers.size = Math.min(10, Math.max(1, a + c));
        if (c > 0) {
          if (!this.answers.needs.includes('young_child')) this.answers.needs.push('young_child');
          if (!this.answers.avoid.includes('no_spicy')) this.answers.avoid.push('no_spicy');
        }
      } else if (key === 'size') {
        const s = Number(value) || 2;
        this.answers.size = s;
        if ((this.answers.adults || 0) + (this.answers.children || 0) !== s) {
          this.answers.adults = s;
          this.answers.children = 0;
        }
      }
      this.persist();
    },

    /** Gửi hồ sơ và dựng thực đơn tuần 1. Trả 'ok' | 'out_of_zone' | 'error'. */
    async submitProfile() {
      this.error = '';
      const a = this.answers;
      const restrictions = a.avoid.filter((x) => x.startsWith('no_'));
      try {
        // Món, giá và nhãn dị ứng lấy từ máy chủ trước khi xếp thực đơn (lỗi mạng thì dùng danh mục có sẵn).
        await api.customer.loadDishes().catch(() => null);
        const res = await api.customer.onboardingProfile({
          user_contact: { phone_or_email: this.contact },
          lead_id: this.leadId,
          survey_answers: {
            living_area: a.district,
            household_size: a.size,
            household_needs: a.needs,
            cuisine: a.cuisine,
            allergies_and_restrictions: restrictions,
            weekly_home_meals_count: a.meals,
            weekly_grocery_budget_vnd: a.budget || undefined
          }
        });
        if (res.status === 'error') {
          if (errorKind(res) === 'OUT_OF_ZONE') return 'out_of_zone';
          this.fail(res);
          return 'error';
        }
        this.profileId = res.data.profile_id;
        const planRes = await api.customer.generateMealPlan({ profile_id: this.profileId, week_number: 1 });
        if (planRes.status === 'error') {
          this.fail(planRes);
          return 'error';
        }
        this.planId = planRes.data.plan_id;
        this.plan = planRes.data;
        this.chefMenuApplied = false;
        this.checkout = freshCheckout();
        this.options = null;
        this.preview = null;
        this.persist();
        return 'ok';
      } catch (e) {
        this.error = messageOf(e);
        return 'error';
      }
    },

    async joinWaitlist() {
      try {
        const res = await api.customer.joinWaitlist({ lead_id: this.leadId, contact: this.contact, district: this.answers.district });
        if (res.status === 'error') {
          this.fail(res);
          return false;
        }
        this.waitlist = { district: this.answers.district, position: res.data.position };
        this.persist();
        return true;
      } catch (e) {
        this.error = messageOf(e);
        return false;
      }
    },

    /** Tải lại bản nháp thực đơn. Trả false nếu bản nháp không còn (đã xóa dữ liệu trình duyệt). */
    async reloadPlan() {
      if (!this.planId) return false;
      const res = await api.customer.getPlan(this.planId);
      if (res.status === 'error') return false;
      this.plan = res.data;
      return true;
    },

    async configure(change) {
      const res = await api.customer.configurePlan({ plan_id: this.planId, ...change });
      if (res.status === 'error') {
        this.fail(res);
        return false;
      }
      this.error = '';
      this.plan = res.data;
      if (change.household_size) this.answers.size = res.data.household_size;
      this.preview = null;
      this.persist();
      return true;
    },

    answerUpsell(id, value) {
      return this.configure({ upsells: { [id]: value } });
    },

    swap(mealIndex, kind, dishId) {
      return this.configure({ swap: { meal_index: mealIndex, kind, dish_id: dishId } });
    },

    setChefMenuApplied(value) {
      this.chefMenuApplied = Boolean(value);
      this.persist();
    },

    async applyChefMenu(meals) {
      const res = await api.customer.applyChefMenu({ plan_id: this.planId, meals });
      if (res.status === 'error') {
        this.fail(res);
        return false;
      }
      this.plan = res.data;
      this.chefMenuApplied = true;
      this.error = '';
      this.persist();
      return true;
    },

    async useSuggestedMenu() {
      const res = await api.customer.generateMealPlan({ profile_id: this.profileId, week_number: (this.plan && this.plan.week_number) || 1 });
      if (res.status === 'error') {
        this.fail(res);
        return false;
      }
      this.plan = res.data;
      this.chefMenuApplied = false;
      this.error = '';
      this.persist();
      return true;
    },

    async loadOptions() {
      try {
        const res = await api.customer.deliveryOptions({ profile_id: this.profileId, deliveries_per_week: this.checkout.frequency });
        if (res.status === 'error') {
          this.fail(res);
          return;
        }
        this.options = res.data;
        const c = this.checkout;
        const opt = res.data.options[c.optionIndex] || res.data.options[0];
        c.optionIndex = Math.max(0, res.data.options.indexOf(opt));
        // Khung đã chọn mà hết chỗ thì bỏ chọn
        if (!opt || !opt.slots.some((s) => s.slot_id === c.slotId)) c.slotId = '';
        if (!c.district && res.data.districts.length) c.district = this.districtForForm(res.data.districts);
        this.persist();
      } catch (e) {
        this.error = messageOf(e);
      }
    },

    districtForForm(districts) {
      const typed = this.answers.district.toLowerCase();
      return districts.find((d) => typed.includes(d.toLowerCase())) || districts[0];
    },

    /** Sức chứa còn lại của từng ngày giao (khung giờ đã chọn): ngày hết chỗ không cho chọn. */
    async loadCapacity() {
      const c = this.checkout;
      const opt = this.options && this.options.options[c.optionIndex];
      const profile = this.options;
      if (!opt || !c.slotId || !profile) {
        this.capacity = null;
        return;
      }
      try {
        const res = await api.customer.availableSlots(profile.zone_id, BUSINESS.subscription.defaultWeeks * 7, opt.preferred_days);
        if (res.status === 'error') {
          this.capacity = null;
          return;
        }
        const slot = res.data.slots.find((s) => s.slot_id === c.slotId);
        this.capacity = slot ? slot.dates.map((d) => ({ date: d.date, remaining: d.remaining, cycle_remaining: d.cycle_remaining, effective_remaining: d.effective_remaining })) : null;
      } catch {
        this.capacity = null;
      }
    },

    scheduleRequest() {
      const c = this.checkout;
      const opt = this.options && this.options.options[c.optionIndex];
      if (!opt || !c.slotId) return null;
      return {
        delivery_frequency: c.frequency === 2 ? 'twice_a_week' : 'once_a_week',
        preferred_days: opt.preferred_days,
        first_dates: opt.first_dates,
        preferred_time_slot: c.slotId,
        delivery_instruction: normalizeInstruction(c.instruction),
        shipping_address: {
          street: c.street.trim(),
          ...(c.ward && c.ward.trim() ? { ward: c.ward.trim() } : {}),
          district: c.district,
          city: this.options.province,
          receiver_name: c.name.trim(),
          receiver_phone: c.phone.trim()
        }
      };
    },

    /** Mã giới thiệu đang áp (từ link mời hoặc ô mã ưu đãi). */
    activeRef() {
      const c = this.checkout;
      return this.refCode || (c.voucherCode && c.voucherCode.startsWith('MOVA-') ? c.voucherCode : '');
    },

    /** Xem trước giá thật từ máy chủ. Cần đã xác thực SĐT (đăng nhập): chưa thì `needsAuth` và không có giá. */
    async loadPreview() {
      const schedule = this.scheduleRequest();
      if (!schedule) {
        this.preview = null;
        return;
      }
      try {
        const req = withGiftCard({
          profile_id: this.profileId,
          plan_id: this.planId,
          duration_weeks: BUSINESS.subscription.defaultWeeks,
          payment_method: this.checkout.method,
          schedule
        });
        const ref = this.activeRef();
        if (ref) req.referral_code = ref;
        const res = await api.customer.previewSubscription(req);
        if (res.status === 'error') {
          this.fail(res);
          this.preview = null;
          return;
        }
        this.error = '';
        this.errorCode = '';
        this.preview = res.data;
      } catch (e) {
        this.error = messageOf(e);
        this.errorCode = 'NETWORK_ERROR';
        this.preview = null;
      }
    },

    /** Trả tiền và đăng ký. Trả { ok } hoặc { ok:false, kind, message, details }. */
    async submitOrder() {
      const c = this.checkout;
      const schedule = this.scheduleRequest();
      if (!schedule) return { ok: false, kind: 'NO_SCHEDULE', message: 'Hãy chọn ngày và khung giờ giao' };
      const req = withGiftCard({
        profile_id: this.profileId,
        plan_id: this.planId,
        duration_weeks: BUSINESS.subscription.defaultWeeks,
        payment_method: c.method,
        auto_debit_enabled: c.method !== 'bank_transfer_4w',
        phone_verified: Boolean(c.phoneVerified),
        newsletter_optin: Boolean(c.newsletterOptin),
        schedule
      });
      if (c.method === 'fresh_credit' && this.selectedPackId()) req.topup_pay_vnd = this.selectedTopupPay();
      const ref = this.activeRef();
      if (ref) req.referral_code = ref;
      try {
        const res = await api.customer.createSubscription(req);
        if (res.status === 'error') return { ok: false, kind: errorKind(res), message: res.error.message, details: res.error };
        this.result = { ...res.data, planSummary: this.summary() };
        this.persist();
        return { ok: true };
      } catch (e) {
        return { ok: false, kind: 'NETWORK_ERROR', message: messageOf(e) };
      }
    },

    /** Gói Suất ăn trả trước đang chọn ở bước thanh toán bằng Fresh Credit (mã gói máy chủ chọn sẵn hoặc một gói lớn hơn). */
    selectedPackId() {
      const f = this.preview && this.preview.fresh_credit;
      if (!f || f.covered) return null;
      if (this.checkout.packId === 'exact') return f.pack_id;
      return f.packs.some((p) => p.pack_id === this.checkout.packId) ? this.checkout.packId : f.pack_id;
    },

    selectedTopupPay() {
      const f = this.preview && this.preview.fresh_credit;
      if (!f) return 0;
      const id = this.selectedPackId();
      if (!id) return 0;
      const pack = id === f.pack_id ? f : f.packs.find((p) => p.pack_id === id);
      return pack ? pack.pay_vnd : f.pay_vnd;
    },

    /** Fresh Credit chưa đủ: tạo lệnh mua gói để khách chuyển khoản, tiền về mới kích hoạt được gói. */
    async orderSelectedPack() {
      const id = this.selectedPackId();
      if (!id) return { ok: false, message: 'Chưa có gói phù hợp để mua' };
      try {
        const res = await api.customer.topUpCredit({ pack_id: id });
        if (res.status === 'error') return { ok: false, message: res.error.message };
        return { ok: true, order: res.data };
      } catch (e) {
        return { ok: false, message: messageOf(e) };
      }
    },

    summary() {
      const p = this.plan;
      return p ? { household_size: p.household_size, meals_per_week: p.meals_per_week, week_value_vnd: p.week_value_vnd } : null;
    }
  }
});
