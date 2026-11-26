import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { read } from './helpers/asyncScan';

const cust = vi.hoisted(() => ({
  deliveryOptions: vi.fn(),
  expressOptions: vi.fn(),
  availableSlots: vi.fn(),
  previewSubscription: vi.fn(),
  createSubscription: vi.fn(),
  topUpCredit: vi.fn(),
  getAccount: vi.fn(),
  notifications: vi.fn(),
  reset: vi.fn()
}));
const supa = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn()
}));
vi.mock('../api', () => ({ api: { customer: cust } }));
vi.mock('../../services/supabase', () => supa);

import { useMovaStore } from '../../stores/useMovaStore';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { createPlanDrafts } from '../api/planDraft';
import { budgetExplain } from '../domain/budgetExplain';
import { resolvePlansEntry, wantsPlansSurveyEdit } from '../domain/plansEntry';
import { hasCompletedCustomerProfile, surveyAnswersFromProfile } from '../domain/profilePreferences';

const memoryStorage = () => {
  let state = { profiles: {}, plans: {} };
  return { read: () => state, write: (next) => { state = next; } };
};

beforeEach(() => {
  setActivePinia(createPinia());
  for (const f of Object.values(cust)) f.mockReset();
  for (const f of Object.values(supa)) f.mockReset();
});

describe('WIP UX & Regression: hồ sơ khách cũ, chu kỳ D+28, express guard, trần 21 bữa', () => {
  it('thuật ngữ customer-facing dùng "số tiền thực tế", không dùng "tiền thật" hay "ví điện tử"', () => {
    const out = budgetExplain(1_000_000, { mealsPerWeek: 5 });
    expect(out.text).toContain('số tiền thực tế');
    expect(out.text).not.toMatch(/tiền thật|ví điện tử/);
  });

  it('ánh xạ đầy đủ safety_profile sang surveyAnswers (khu vực, người lớn/trẻ em, 3-21 bữa, đạm)', () => {
    const a = surveyAnswersFromProfile({
      district: 'Quận 1',
      safety_profile: {
        living_area: 'Quận 3',
        adults_count: 3,
        children_count: 1,
        weekly_home_meals_count: 25,
        cuisines: ['viet', 'western'],
        household_needs: ['gym'],
        protein_prefs: { beef: 'like', pork: 'dislike' },
        allergen_codes: ['seafood'],
        avoid_tags: ['spicy'],
        weekly_grocery_budget_vnd: 1_500_000
      }
    });
    expect(a).toMatchObject({
      district: 'Quận 3',
      adults: 3,
      children: 1,
      size: 4,
      meals: 21,
      cuisines: ['viet', 'western'],
      cuisine: 'viet_western',
      needs: ['gym'],
      proteinPrefs: { beef: 'like', pork: 'dislike' },
      budget: 1_500_000
    });
    expect(a.avoid).toEqual(expect.arrayContaining(['no_seafood', 'no_spicy']));
  });

  it('planDraft.configure hỗ trợ meals_per_week trong [3, 21] và chặn ngoài ngưỡng', () => {
    const drafts = createPlanDrafts({ storage: memoryStorage() });
    const { out } = drafts.createProfile({
      req: { user_contact: { phone_or_email: '0901234567' }, survey_answers: { living_area: 'Quận 1', household_size: 2, weekly_home_meals_count: 5 } },
      zone: { zone_id: 'Z1', zone_name: 'Q1', province: 'TP.HCM' }
    });
    const plan = drafts.generate({ profileId: out.profile_id, weekNumber: 1 });
    expect(drafts.configure({ plan_id: plan.plan.id, meals_per_week: 2 }).error.code).toBe('MEALS_PER_WEEK_INVALID');
    expect(drafts.configure({ plan_id: plan.plan.id, meals_per_week: 22 }).error.code).toBe('MEALS_PER_WEEK_INVALID');
    const updated = drafts.configure({ plan_id: plan.plan.id, meals_per_week: 12 });
    expect(updated.view.meals_per_week).toBe(12);
    expect(updated.view.meals).toHaveLength(12);
  });

  it('loadExpress bỏ qua khi thiếu street hoặc đã có earliest_delivery_date (D+28); loadOptions tự điền ngày hợp lệ kế tiếp', async () => {
    const store = usePlanFlowStore();
    cust.deliveryOptions.mockResolvedValue({
      status: 'success',
      data: {
        zone_id: 'Z1',
        districts: ['Quận 1'],
        earliest_delivery_date: '2026-12-28',
        suggested_start_date: '2026-12-28',
        options: [{ preferred_days: ['monday'], first_dates: { monday: '2026-12-28' }, first_delivery_date: '2026-12-28', slots: [{ slot_id: 'early_morning_06_08', label: 'S' }] }]
      }
    });
    await store.loadOptions();
    expect(store.checkout.startDate).toBe('2026-12-28');
    store.checkout.slotId = 'early_morning_06_08';

    // Thiếu street -> không gọi API
    store.checkout.street = '';
    await store.loadExpress();
    expect(cust.expressOptions).not.toHaveBeenCalled();

    // Có street nhưng đang có chu kỳ hoạt động (D+28) -> không gọi API
    store.checkout.street = '12 Lê Lợi';
    await store.loadExpress();
    expect(cust.expressOptions).not.toHaveBeenCalled();

    // Khách mới (không earliest_delivery_date) + có street -> gọi API bình thường
    store.options.earliest_delivery_date = null;
    cust.expressOptions.mockResolvedValue({ status: 'success', data: { enabled: false } });
    await store.loadExpress();
    expect(cust.expressOptions).toHaveBeenCalledTimes(1);
  });

  it('nhận diện đúng khách đã có hồ sơ / từng đặt hàng vs khách mới (không nhầm với giá trị mặc định)', () => {
    expect(hasCompletedCustomerProfile(null)).toBe(false);
    expect(hasCompletedCustomerProfile({
      customer: {
        onboarding_completed: false,
        onboarding_completed_at: null,
        has_subscription: false,
        district: '',
        safety_profile: {
          living_area: '',
          adults_count: 2,
          children_count: 0,
          weekly_home_meals_count: 5,
          cuisines: [],
          household_needs: [],
          allergen_codes: [],
          avoid_tags: [],
          require_vegetarian: false,
          protein_prefs: {},
          weekly_grocery_budget_vnd: null
        }
      },
      subscriptions: []
    })).toBe(false);
    expect(hasCompletedCustomerProfile({ customer: { onboarding_completed: false, has_subscription: true, safety_profile: {} } })).toBe(true);
    expect(hasCompletedCustomerProfile({ customer: { onboarding_completed_at: '2026-11-26T00:00:00Z', safety_profile: {} } })).toBe(true);
    expect(hasCompletedCustomerProfile({ customer: { safety_profile: { cuisines: ['viet'] } } })).toBe(true);
    expect(hasCompletedCustomerProfile({ customer: { safety_profile: { weekly_home_meals_count: 10 } } })).toBe(true);
  });

  it('khách cũ từ Trang chủ/Navbar vào /plans đợi account/overview tải xong và vào thẳng step 2; ?edit=1 hoặc ?reset=survey mới mở step 1', async () => {
    // 1. Gọi refresh() song song (App.vue vừa tải trang + PlansView vừa mở) -> phải đợi cùng 1 promise
    let resolveOverview;
    supa.getAccessToken.mockResolvedValue('tok_123');
    cust.getAccount.mockImplementation(() => new Promise((r) => { resolveOverview = r; }));
    cust.notifications.mockResolvedValue([]);

    const mova = useMovaStore();
    mova.setAuthUser({ id: 'u1' });
    const planStore = usePlanFlowStore();
    planStore.reset = vi.fn(() => {
      planStore.result = null;
      planStore.planId = null;
    });
    planStore.reloadPlan = vi.fn().mockResolvedValue(true);

    const p1 = mova.refresh();
    const p2 = mova.refresh();
    const useSavedProfile = vi.fn().mockResolvedValue(true);
    const entryPromise = resolvePlansEntry({ routeQuery: {}, mova, store: planStore, useSavedProfile });

    await vi.waitFor(() => expect(typeof resolveOverview).toBe('function'));
    resolveOverview({
      status: 'success',
      data: {
        customer: {
          id: 'u1',
          onboarding_completed: true,
          onboarding_completed_at: '2026-11-25T10:00:00Z',
          has_subscription: true,
          safety_profile: { living_area: 'Quận 1', cuisines: ['viet'], weekly_home_meals_count: 5 }
        },
        subscriptions: [{ id: 'sub1', status: 'active' }]
      }
    });

    const [r1, r2, entry] = await Promise.all([p1, p2, entryPromise]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(cust.getAccount).toHaveBeenCalledTimes(1);
    expect(useSavedProfile).toHaveBeenCalledTimes(1);
    expect(entry).toEqual({ step: 2, action: 'loaded_saved_profile' });

    // 2. Khách cũ vừa đặt xong (result vẫn còn) nhưng từ Trang chủ bấm lại /plans -> dọn result cũ và vào thẳng step 2
    planStore.result = { subscription_id: 'sub1' };
    useSavedProfile.mockClear();
    const fromHomeAfterOrder = await resolvePlansEntry({ routeQuery: {}, mova, store: planStore, useSavedProfile });
    expect(planStore.reset).toHaveBeenCalledTimes(1);
    expect(useSavedProfile).toHaveBeenCalledTimes(1);
    expect(fromHomeAfterOrder).toEqual({ step: 2, action: 'loaded_saved_profile' });

    // Đang ở /plans?step=4 (F5 sau đặt đơn) -> giữ nguyên step 4
    planStore.result = { subscription_id: 'sub1' };
    expect(await resolvePlansEntry({ routeQuery: { step: '4' }, mova, store: planStore, useSavedProfile })).toEqual({ step: 4, action: 'stay' });

    // 3. Khách cũ còn draft planId trong localStorage và vào /plans không có query -> resume thẳng step 2 (không về StepAbout)
    planStore.result = null;
    planStore.planId = 'plan_w1_123';
    expect(await resolvePlansEntry({ routeQuery: {}, mova, store: planStore, useSavedProfile })).toEqual({ step: 2, action: 'resume_plan' });

    // 4. Chủ động bấm ?edit=1 hoặc ?reset=survey -> mở step 1 để chỉnh khẩu vị / làm lại khảo sát
    expect(wantsPlansSurveyEdit({ step: '1', edit: '1', q: '1' })).toBe(true);
    expect(wantsPlansSurveyEdit({ reset: 'survey' })).toBe(true);
    expect(await resolvePlansEntry({ routeQuery: { step: '1', edit: '1', q: '1' }, mova, store: planStore, useSavedProfile })).toEqual({ step: 1, action: 'stay' });

    // 5. Khách mới chưa từng hoàn tất khảo sát -> mở step 1
    planStore.planId = null;
    mova.account = { customer: { onboarding_completed: false, has_subscription: false, safety_profile: {} }, subscriptions: [] };
    expect(await resolvePlansEntry({ routeQuery: {}, mova, store: planStore, useSavedProfile })).toEqual({ step: 1, action: 'stay' });
  });

  it('kiểm tra cấu trúc UI: PlansView dùng submitProfile + resolvePlansEntry, StepCheckout luôn hiện checkbox điều khoản, SupportPanel lấy mọi gói active', () => {
    const plansView = read('views/PlansView.vue');
    expect(plansView).not.toContain('submitAbout');
    expect(plansView).toContain('submitProfile');
    expect(plansView).toContain('applyProfileFromAccount');
    expect(plansView).toContain('resolvePlansEntry');

    const menu = read('components/plans/StepMenu.vue');
    expect(menu).toContain('/plans?step=1&edit=1&q=1');

    const checkout = read('components/plans/StepCheckout.vue');
    expect(checkout).not.toMatch(/v-if="preview"\s+class="pl-card sec terms"/);
    expect(checkout).toContain('data-testid="checkout-terms"');
    expect(checkout).toContain('data-testid="cycle-conflict-banner"');
    expect(checkout).toContain('data-testid="jump-next-cycle"');

    const about = read('components/plans/StepAbout.vue');
    expect(about).toContain('store.answers.meals >= 21');
    expect(menu).toContain('saved-profile-bar');
    expect(menu).toContain('meals_per_week');

    const recon = read('ops/views/finance/ReconcileView.vue');
    expect(recon).toContain('s.sourceLotId');
    expect(recon).toContain('s.prepaidPackId');

    const support = read('components/dashboard/SupportPanel.vue');
    expect(support).toContain('api.customer.myWeeks(s.id)');
  });
});
