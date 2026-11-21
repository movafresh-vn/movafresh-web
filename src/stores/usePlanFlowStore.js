import { defineStore } from 'pinia';
import { api } from '../shared/api';
import { errorKind, withGiftCard } from '../shared/api/requests';
import { BUSINESS } from '../shared/config/business';

// Trạng thái phễu /plans. Lưu vào localStorage để khách tải lại trang hoặc bấm quay lại không mất dữ liệu.
// Thực đơn và giá luôn lấy lại từ API (nguồn sự thật là dữ liệu dùng chung), ở đây chỉ giữ các mã tham chiếu.
const KEY = 'mova_plans_flow_v1';

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
  deliveryInstruction: 'Gọi điện trước 15 phút khi tới',
  customInstruction: '',
  name: '',
  phone: '',
  phoneVerified: false,
  newsletterOptin: false,
  voucherCode: '',
  street: '',
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
  refCode: '' // mã mời từ link ?ref=MOVA-0007; người mời nhận thưởng khi khách này trả gói đầu tiên
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { ...freshState(), ...s, answers: { ...freshAnswers(), ...s.answers }, checkout: { ...freshCheckout(), ...s.checkout } };
    }
  } catch {
    // dùng trạng thái mới
  }
  return freshState();
}

export const usePlanFlowStore = defineStore('planFlow', {
  state: () => ({
    ...load(),
    // Không lưu: lấy lại từ API
    plan: null,
    options: null,
    preview: null,
    busy: false,
    error: ''
  }),

  getters: {
    areaName: (s) => s.answers.district,
    hasPlan: (s) => Boolean(s.planId)
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

    reset() {
      const refCode = this.refCode; // mã mời giữ lại khi khách làm lại từ đầu
      Object.assign(this, freshState(), { refCode, plan: null, options: null, preview: null, busy: false, error: '' });
      this.persist();
    },

    /** Lưu mã mời từ link /plans?ref=... */
    setRef(code) {
      const c = String(code || '').trim().toUpperCase();
      if (c && c !== this.refCode) {
        this.refCode = c;
        this.persist();
      }
    },

    /** Màn đầu: lưu lead ngay khi khách nhập số Zalo hoặc email. */
    saveContact(raw) {
      const res = api.customer.captureLead({ contact: raw, source: 'plans' });
      if (res.status === 'error') {
        this.error = res.error.message;
        return false;
      }
      this.error = '';
      this.contact = raw.trim();
      this.leadId = res.data.lead_id;
      this.persist();
      return true;
    },

    setAnswer(key, value) {
      this.answers[key] = value;
      if (key === 'adults' || key === 'children') {
        const a = Number(this.answers.adults != null ? this.answers.adults : 2);
        const c = Number(this.answers.children != null ? this.answers.children : 0);
        this.answers.size = Math.min(10, Math.max(1, a + c));
        if (c > 0) {
          if (!this.answers.needs.includes('young_child')) {
            this.answers.needs.push('young_child');
          }
          if (!this.answers.avoid.includes('no_spicy')) {
            this.answers.avoid.push('no_spicy');
          }
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
    submitProfile() {
      this.error = '';
      const a = this.answers;
      const restrictions = a.avoid.filter((x) => x.startsWith('no_'));
      const res = api.customer.onboardingProfile({
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
        this.error = res.error.message;
        return 'error';
      }
      this.profileId = res.data.profile_id;
      const planRes = api.customer.generateMealPlan({ profile_id: this.profileId, week_number: 1 });
      if (planRes.status === 'error') {
        this.error = planRes.error.message;
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
    },

    joinWaitlist() {
      const res = api.customer.joinWaitlist({ lead_id: this.leadId, contact: this.contact, district: this.answers.district });
      if (res.status === 'error') {
        this.error = res.error.message;
        return false;
      }
      this.waitlist = { district: this.answers.district, position: res.data.position };
      this.persist();
      return true;
    },

    /** Tải lại thực đơn đã lưu. Trả false nếu dữ liệu dùng chung đã bị đặt lại. */
    reloadPlan() {
      if (!this.planId) return false;
      const res = api.customer.getPlan(this.planId);
      if (res.status === 'error') return false;
      this.plan = res.data;
      return true;
    },

    configure(change) {
      const res = api.customer.configurePlan({ plan_id: this.planId, ...change });
      if (res.status === 'error') {
        this.error = res.error.message;
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

    applyChefMenu(meals) {
      const res = api.customer.applyChefMenu({ plan_id: this.planId, meals });
      if (res.status === 'error') {
        this.error = res.error.message;
        return false;
      }
      this.plan = res.data;
      this.chefMenuApplied = true;
      this.error = '';
      this.persist();
      return true;
    },

    useSuggestedMenu() {
      const res = api.customer.generateMealPlan({
        profile_id: this.profileId,
        week_number: this.plan?.week_number || 1
      });
      if (res.status === 'error') {
        this.error = res.error.message;
        return false;
      }
      this.plan = res.data;
      this.chefMenuApplied = false;
      this.error = '';
      this.persist();
      return true;
    },

    loadOptions() {
      const res = api.customer.deliveryOptions({ profile_id: this.profileId, deliveries_per_week: this.checkout.frequency });
      if (res.status === 'error') {
        this.error = res.error.message;
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
    },

    districtForForm(districts) {
      const typed = this.answers.district.toLowerCase();
      return districts.find((d) => typed.includes(d.toLowerCase())) || districts[0];
    },

    scheduleRequest() {
      const c = this.checkout;
      const opt = this.options && this.options.options[c.optionIndex];
      if (!opt || !c.slotId) return null;
      const city = this.options.province;
      const instruction = c.deliveryInstruction === 'other'
        ? (c.customInstruction ? `Ghi chú: ${c.customInstruction.trim()}` : '')
        : (c.deliveryInstruction || '');
      return {
        delivery_frequency: c.frequency === 2 ? 'twice_a_week' : 'once_a_week',
        preferred_days: opt.preferred_days,
        preferred_time_slot: c.slotId,
        shipping_address: {
          street: c.street.trim(),
          district: c.district,
          city,
          receiver_name: c.name.trim(),
          receiver_phone: c.phone.trim(),
          delivery_instruction: instruction
        }
      };
    },

    loadPreview() {
      const schedule = this.scheduleRequest();
      if (!schedule) {
        this.preview = null;
        return;
      }
      const res = api.customer.previewSubscription(withGiftCard({
        profile_id: this.profileId,
        plan_id: this.planId,
        duration_weeks: BUSINESS.subscription.defaultWeeks,
        payment_method: this.checkout.method,
        schedule
      }));
      if (res.status === 'error') {
        this.error = res.error.message;
        this.preview = null;
        return;
      }
      this.error = '';
      this.preview = res.data;
    },

    /** Trả tiền và đăng ký. Trả { ok } hoặc { ok:false, kind, message }. */
    submitOrder() {
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
        voucher_code: c.voucherCode || BUSINESS.incentives.giftCardCode,
        schedule
      });
      if (c.method === 'fresh_credit') req.topup_pay_vnd = this.selectedTopupPay();
      const ref = this.refCode || (c.voucherCode && c.voucherCode.startsWith('MOVA-') ? c.voucherCode : null);
      if (ref) req.referral_code = ref;
      const res = api.customer.createSubscription(req);
      if (res.status === 'error') return { ok: false, kind: errorKind(res), message: res.error.message };
      this.result = { ...res.data, planSummary: this.summary() };
      this.persist();
      return { ok: true };
    },

    selectedTopupPay() {
      const f = this.preview && this.preview.fresh_credit;
      if (!f) return 0;
      if (this.checkout.packId === 'exact') return f.pay_vnd;
      const pack = f.packs.find((p) => p.pack_id === this.checkout.packId);
      return pack ? pack.pay_vnd : f.pay_vnd;
    },

    summary() {
      const p = this.plan;
      return p
        ? { household_size: p.household_size, meals_per_week: p.meals_per_week, week_value_vnd: p.week_value_vnd }
        : null;
    }
  }
});
