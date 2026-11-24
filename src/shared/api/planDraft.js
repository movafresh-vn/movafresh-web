// Bản nháp thực đơn của phễu /plans, giữ ở trình duyệt (chưa có tài khoản thì chưa có gì để lưu ở máy chủ).
// Món và giá lấy từ catalog đã đồng bộ với backend (GET /dishes). Máy chủ vẫn là nơi quyết định cuối cùng: mọi món đều bị kiểm lại
// theo dị ứng/kiêng của hồ sơ khi xem trước và khi đăng ký (DISH_NOT_ELIGIBLE), nên bản nháp này không bao giờ là cửa an toàn duy nhất.
// Bản nháp CHỈ dùng để hiển thị thực đơn và chọn món; số tiền phải trả luôn lấy từ POST /subscription/preview.
import { BUSINESS } from '../config/business';
import { DISHES, SAUCES } from '../data/catalog';
import { rng, hash } from '../utils/formatters';
import {
  allowedDishes, carbOptionsFor, DEFAULT_CARB, generateMeals, mealNutrition, mealPriceVnd, mealsPriceVnd, applySwaps, swapOptionsFor, westernCountFor
} from '../domain/mealPlan';
import { applyUpsells, questionsFor, upsellDelta } from '../domain/upsells';
import { quotePackage } from '../domain/planQuote';

const GOAL_ALIASES = { increase_protein: 'high_protein', lower_blood_sugar: 'limit_sugar', reduce_fat: 'low_carb', lose_weight: 'low_carb' };
// Người cần lưu ý trong nhà → mục tiêu / kiêng cho Đầu bếp xếp món. Không hứa chữa bệnh: chỉ "ít tinh bột", "hạn chế đường".
const NEED_TO_GOALS = {
  balanced: [], gym: [], weight_loss: ['low_carb'], limit_sugar: ['limit_sugar'], elderly: ['gentle_digestion'],
  young_child: [], sensitive_stomach: ['gentle_digestion'], gout: ['low_purine'], meat_lover: []
};
const NEED_TO_RESTRICTIONS = { young_child: ['no_spicy'], sensitive_stomach: ['no_spicy'], gout: ['no_seafood'] };
const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const KINDS = ['protein', 'soup', 'veg', 'carb', 'dessert'];
const uniq = (a) => [...new Set(a)];

export function profileGoalsFor(a = {}) {
  const needs = (a.household_needs || []).filter((n) => n in NEED_TO_GOALS);
  const goals = uniq([...(a.health_goals || []).map((g) => GOAL_ALIASES[g] || g), ...needs.flatMap((n) => NEED_TO_GOALS[n])]);
  const restrictions = uniq([...(a.allergies_and_restrictions || []).filter((r) => r.startsWith('no_')), ...needs.flatMap((n) => NEED_TO_RESTRICTIONS[n] || [])]);
  return { needs, goals, restrictions };
}

/** Món của AI (meal_structure) → các bữa của bản nháp. Trả null nếu có bất kỳ món nào ngoài catalog hoặc vi phạm kiêng (an toàn là mặc định). */
export function aiMealsToBase(ai, { restrictions = [], mealsCount }) {
  const meals = ai && Array.isArray(ai.meals) ? ai.meals : [];
  if (meals.length !== mealsCount) return null;
  const out = [];
  for (const [i, m] of meals.entries()) {
    const s = m.meal_structure || {};
    const pick = { protein: s.protein_dish, soup: s.soup_dish, veg: s.veggie_dish, carb: s.carb_dish, dessert: s.dessert };
    const dishes = {};
    for (const kind of KINDS) {
      const id = pick[kind] && pick[kind].dish_id;
      if (!id) continue;
      const d = DISHES[id];
      if (!d || d.kind !== kind) return null;
      const ok = allowedDishes(kind, restrictions, { western: Boolean(d.western) }).some((x) => x.id === id);
      if (!ok) return null;
      dishes[kind] = id;
    }
    if (!dishes.protein || !dishes.veg || !dishes.carb) return null;
    const meal = { index: Number(m.meal_index) || i + 1, dishes, proteinFactor: 1 };
    if (m.western || DISHES[dishes.protein].western) meal.western = true;
    out.push(meal);
  }
  return out;
}

const memoryStore = () => {
  let v = { profiles: {}, plans: {} };
  return { read: () => v, write: (x) => { v = x; } };
};

export function localDraftStorage(key = 'mova_plan_drafts_v1') {
  const mem = memoryStore();
  return {
    read() {
      try {
        const raw = globalThis.localStorage && globalThis.localStorage.getItem(key);
        if (raw) return { profiles: {}, plans: {}, ...JSON.parse(raw) };
      } catch {
        // chế độ riêng tư: dùng bộ nhớ
      }
      return mem.read();
    },
    write(v) {
      mem.write(v);
      try {
        if (globalThis.localStorage) globalThis.localStorage.setItem(key, JSON.stringify(v));
      } catch {
        // bỏ qua
      }
    }
  };
}

export function createPlanDrafts({ cfg = BUSINESS, storage = localDraftStorage(), now = () => new Date() } = {}) {
  const load = () => storage.read();
  const save = (db) => storage.write(db);

  function mealsOf(profile, plan) {
    const mealsCount = profile.mealsPerWeek;
    const base = plan.baseMeals && plan.baseMeals.length === mealsCount
      ? plan.baseMeals.map((m) => ({ ...m, dishes: { ...m.dishes } }))
      : generateMeals({
          householdSize: profile.householdSize, goals: profile.goals, restrictions: profile.restrictions, mealsCount,
          rand: rng(hash(`${profile.id}-${plan.weekNumber}`)), westernCount: westernCountFor(profile.cuisine, mealsCount, cfg), weeklyBudgetVnd: profile.weeklyBudgetVnd || null
        });
    const ctx = { householdSize: profile.householdSize, restrictions: profile.restrictions, rand: () => 0, cfg };
    const withUpsells = (answers) => applyUpsells(base, answers, { ...ctx, rand: rng(hash(`${plan.id}-west`)) });
    const applyChefStyle = (meals) => {
      if (!Array.isArray(plan.chefWestern)) return meals;
      return meals.map((meal) => {
        const western = plan.chefWestern[meal.index - 1];
        if (typeof western !== 'boolean') return meal;
        const next = { ...meal, dishes: { ...meal.dishes } };
        if (western) next.western = true;
        else delete next.western;
        return next;
      });
    };
    const post = (meals) => applySwaps(applyChefStyle(meals), plan.swaps || {}, profile.restrictions);
    return { base, meals: post(withUpsells(plan.upsells || {})), post, ctx };
  }

  function dishOut(id, size) {
    if (!id) return undefined;
    const d = DISHES[id];
    const grams = d.portion_specs && d.portion_specs.net_weight_grams ? Math.round(d.portion_specs.net_weight_grams * size) : Math.round(d.bom.reduce((s, b) => s + b.gramsPerPerson, 0) * size);
    return { dish_id: id, name: d.name, portion_grams: grams, sauce_code: d.sauce, prep_time_minutes: d.prepMinutes, sauce_name: d.sauce && SAUCES[d.sauce] ? SAUCES[d.sauce].name : null };
  }

  function planView(profile, plan) {
    const size = profile.householdSize;
    const { base, meals, post, ctx } = mealsOf(profile, plan);
    const answers = plan.upsells || {};
    const outMeals = meals.map((m, i) => {
      const n = mealNutrition(m, size);
      const protein = DISHES[m.dishes.protein];
      return {
        meal_index: m.index,
        day_label: m.western ? 'Cuối tuần' : DAYS[i % 7],
        theme: size === 1 ? 'Suất ăn nấu 1 chảo' : m.western ? 'Bữa Tây' : 'Mâm cơm Việt 5 phần',
        western: Boolean(m.western),
        meal_structure: {
          protein_dish: dishOut(m.dishes.protein, size), soup_dish: dishOut(m.dishes.soup, size), veggie_dish: dishOut(m.dishes.veg, size),
          carb_dish: dishOut(m.dishes.carb, size), dessert: dishOut(m.dishes.dessert, size)
        },
        highlight_sauce: protein.sauce && SAUCES[protein.sauce] ? { code: protein.sauce, name: SAUCES[protein.sauce].name } : null,
        carb_choices: carbOptionsFor(m, profile.restrictions).map((id) => ({ dish_id: id, name: DISHES[id].name })),
        nutrition_summary: { calories_total: n.kcal, protein_g: n.protein, carbs_g: n.carb, fat_g: n.fat },
        price_vnd: mealPriceVnd(m, size)
      };
    });
    const questions = questionsFor(profile).map((q) => {
      const d = upsellDelta(base, answers, q.id, { ...ctx, post, makeRand: () => rng(hash(`${plan.id}-west`)) });
      return { id: q.id, question: q.question, note: q.note, answer: q.id in answers ? Boolean(answers[q.id]) : null, delta_per_meal_vnd: d.perMealVnd, delta_week_vnd: d.weekDeltaVnd, affected_meals: d.affectedMeals };
    });
    const weekValue = mealsPriceVnd(meals, size);
    let riceGrams = 0;
    for (const m of meals) if (m.dishes.carb === DEFAULT_CARB) riceGrams += (DISHES[DEFAULT_CARB].portion_specs?.net_weight_grams || 100) * size;
    return {
      plan_id: plan.id,
      profile_id: profile.id,
      household_size: size,
      week_number: plan.weekNumber,
      meals_per_week: meals.length,
      meals: outMeals,
      week_value_vnd: weekValue,
      weekly_staples: { rice_grams: Math.round(riceGrams), fruits: uniq(meals.map((m) => m.dishes.dessert).filter(Boolean).map((id) => DISHES[id].name)) },
      value_questions: questions,
      // Con số tham khảo ở bước chọn món. Số phải trả thật luôn lấy từ POST /subscription/preview ở bước thanh toán.
      quote: quoteOut(quotePackage({ weekValueVnd: weekValue, mealsPerWeek: meals.length }, cfg), cfg)
    };
  }

  const freshOut = (o) => ({ pay_vnd: o.payVnd, bonus_vnd: o.bonusVnd, bonus_uncapped_vnd: o.bonusUncappedVnd, credit_received_vnd: o.creditReceivedVnd, capped: o.capped, cap_vnd: o.capVnd, first_cycle_discount_vnd: o.firstCycleDiscountVnd });
  function quoteOut(q, c) {
    return {
      weeks: q.weeks, package_value_vnd: q.packageValueVnd, week_value_vnd: q.weekValueVnd, gift_schedule_vnd: q.giftSchedule, gift_total_vnd: q.giftTotalVnd,
      weekly: q.weekly.map((w) => ({ week_index: w.weekIndex, list_vnd: w.listVnd, gift_vnd: w.giftVnd, pay_vnd: w.payVnd })),
      week1_pay_vnd: q.week1PayVnd, pay_all_upfront_vnd: q.payAllUpfrontVnd, per_meal_list_vnd: q.perMealListVnd, per_meal_pay_vnd: q.perMealPayVnd,
      fresh_credit: freshOut(q.freshCredit), first_cycle_discount_pct: q.firstCycleDiscountPct, max_first_cycle_discount_pct: c.incentives.maxFirstCycleDiscountPct
    };
  }

  const idFor = (seed) => hash(seed).toString(16).replace('-', '').slice(0, 8);

  return {
    /** Dựng hồ sơ nháp từ câu trả lời khảo sát. `zone` do máy chủ xác định (GET /delivery/check-area). */
    createProfile({ req, zone, size: _s }) {
      const a = req.survey_answers || {};
      const size = Math.max(cfg.plan.householdMin, Math.min(cfg.plan.householdMax, Number(a.household_size) || cfg.plan.householdMin));
      const { needs, goals, restrictions } = profileGoalsFor(a);
      const meals = Number(a.weekly_home_meals_count) || cfg.plan.mealsPerWeekDefault;
      const mealsPerWeek = Math.max(cfg.plan.mealsPerWeekMin, Math.min(cfg.plan.mealsPerWeekMax, meals));
      const budget = Number(a.weekly_grocery_budget_vnd) > 0 ? Number(a.weekly_grocery_budget_vnd) : null;
      const db = load();
      const profile = {
        id: `prof_${idFor(`${req.user_contact?.phone_or_email}${Object.keys(db.profiles).length}${now().getTime()}`)}`,
        contact: req.user_contact || {}, leadId: req.lead_id || null, zoneId: zone.zone_id, zoneName: zone.zone_name, province: zone.province || null,
        livingArea: a.living_area, householdSize: size, needs, goals, restrictions,
        cuisine: a.cuisine === 'viet_western' ? 'viet_western' : a.cuisine === 'western' ? 'western' : 'viet',
        mealsPerWeek, weeklyBudgetVnd: budget,
        survey: {
          household_needs: needs, avoid: (a.allergies_and_restrictions || []).filter((r) => r.startsWith('no_')), weekly_grocery_budget_vnd: budget,
          cuisine_preferences: a.cuisine_preferences || null
        },
        createdAt: now().toISOString()
      };
      db.profiles[profile.id] = profile;
      save(db);
      const tier = goals.includes('high_protein') ? (goals.includes('limit_sugar') || goals.includes('low_carb') ? 'Low_Carb_High_Protein' : 'High_Protein') : goals.includes('limit_sugar') || goals.includes('low_carb') ? 'Low_Carb' : 'Balanced';
      const sample = generateMeals({ householdSize: size, goals, restrictions, mealsCount: mealsPerWeek, rand: rng(hash(profile.id)), westernCount: westernCountFor(profile.cuisine, mealsPerWeek, cfg), weeklyBudgetVnd: budget });
      return {
        profile,
        out: {
          profile_id: profile.id,
          household_type: size === 1 ? 'single' : 'family',
          dietary_tier: tier,
          recommended_caloric_target_per_meal: goals.includes('low_carb') ? 550 : goals.includes('high_protein') ? 700 : 650,
          suggested_package: size === 1 ? 'solo_4_weeks' : 'family_care_4_weeks',
          estimated_weekly_budget_vnd: mealsPriceVnd(sample, size),
          initial_credit_bonus_earned_vnd: cfg.incentives.rewards.profileComplete,
          zone_id: zone.zone_id
        }
      };
    },

    profileOf(profileId) {
      return load().profiles[profileId] || null;
    },

    /** Tạo (hoặc dựng lại) bản nháp thực đơn của một tuần. `baseMeals` là thực đơn do Đầu bếp (AI) đề xuất, đã kiểm kiêng; vắng thì dùng bộ xếp món nội bộ. */
    generate({ profileId, weekNumber = 1, upsellsExtraProtein = false, baseMeals = null }) {
      const db = load();
      const profile = db.profiles[profileId];
      if (!profile) return { error: { code: 'PROFILE_NOT_FOUND', message: 'Không tìm thấy hồ sơ' } };
      const planId = `plan_w${weekNumber}_${profile.id.slice(5)}`;
      const plan = { id: planId, profileId: profile.id, weekNumber, upsells: upsellsExtraProtein ? { more_protein: true } : {}, swaps: {}, createdAt: now().toISOString() };
      if (baseMeals) plan.baseMeals = baseMeals;
      db.plans[planId] = plan;
      save(db);
      return { view: planView(profile, plan), plan, profile };
    },

    get(planId) {
      const db = load();
      const plan = db.plans[planId];
      if (!plan) return { error: { code: 'PLAN_NOT_FOUND', message: 'Không tìm thấy thực đơn' } };
      const profile = db.profiles[plan.profileId];
      if (!profile) return { error: { code: 'PLAN_NOT_FOUND', message: 'Không tìm thấy hồ sơ hoặc thực đơn' } };
      return { view: planView(profile, plan), plan, profile };
    },

    /** Các bữa (đã áp đổi món, câu hỏi giá trị) của bản nháp: nguồn dựng thực đơn gửi lên máy chủ khi xem trước / đăng ký. */
    mealsFor(planId) {
      const db = load();
      const plan = db.plans[planId];
      const profile = plan && db.profiles[plan.profileId];
      if (!plan || !profile) return null;
      return { meals: mealsOf(profile, plan).meals, profile, plan };
    },

    /** Các bữa của tuần thứ n của gói: tuần 1 là thực đơn khách đã chốt; các tuần sau Đầu bếp xếp mới (cùng khẩu vị, kiêng, câu hỏi giá trị). */
    mealsForWeek(planId, weekNumber) {
      const db = load();
      const plan = db.plans[planId];
      const profile = plan && db.profiles[plan.profileId];
      if (!plan || !profile) return [];
      if (weekNumber <= 1) return mealsOf(profile, plan).meals;
      return mealsOf(profile, { ...plan, id: `${plan.id}-w${weekNumber}`, weekNumber, swaps: {}, chefWestern: undefined, baseMeals: undefined }).meals;
    },

    configure(req) {
      const db = load();
      const plan = db.plans[req.plan_id];
      const profile = plan && db.profiles[plan.profileId];
      if (!plan || !profile) return { error: { code: 'PLAN_NOT_FOUND', message: 'Không tìm thấy thực đơn' } };
      if (req.household_size != null) {
        const size = Number(req.household_size);
        if (!Number.isInteger(size) || size < cfg.plan.householdMin || size > cfg.plan.householdMax) {
          return { error: { code: 'HOUSEHOLD_SIZE_INVALID', message: `Số người ăn từ ${cfg.plan.householdMin} đến ${cfg.plan.householdMax}` } };
        }
        profile.householdSize = size;
      }
      if (req.upsells) {
        plan.upsells = { ...(plan.upsells || {}) };
        for (const [id, v] of Object.entries(req.upsells)) {
          if (!['more_protein', 'low_carb_veg', 'western_meal'].includes(id)) return { error: { code: 'UPSELL_INVALID', message: 'Câu hỏi không tồn tại' } };
          if (v === null || v === undefined) delete plan.upsells[id];
          else plan.upsells[id] = Boolean(v);
        }
      }
      if (req.swap) {
        const { meal_index: idx, kind, dish_id: dishId } = req.swap;
        const meal = mealsOf(profile, plan).meals.find((m) => m.index === idx);
        if (!meal) return { error: { code: 'MEAL_NOT_FOUND', message: 'Không tìm thấy bữa ăn' } };
        // Chỉ nhận món nằm trong danh sách đổi được (đã loại món bị kiêng): món nào máy chủ sẽ từ chối thì không bao giờ được chọn.
        if (!swapOptionsFor(meal, kind, profile.restrictions).some((d) => d.id === dishId)) return { error: { code: 'DISH_NOT_ALLOWED', message: 'Món này không đổi được cho bữa này' } };
        plan.swaps = { ...(plan.swaps || {}), [idx]: { ...((plan.swaps || {})[idx] || {}), [kind]: dishId } };
      }
      save(db);
      return { view: planView(profile, plan) };
    },

    swapOptions(req) {
      const got = this.get(req.plan_id);
      if (got.error) return got;
      const { profile, plan } = got;
      const meal = mealsOf(profile, plan).meals.find((m) => m.index === req.meal_index);
      if (!meal || !meal.dishes[req.kind]) return { error: { code: 'MEAL_NOT_FOUND', message: 'Không tìm thấy phần ăn này' } };
      const size = profile.householdSize;
      const current = mealPriceVnd(meal, size);
      const options = swapOptionsFor(meal, req.kind, profile.restrictions).map((d) => {
        const alt = { ...meal, dishes: { ...meal.dishes, [req.kind]: d.id } };
        return {
          dish_id: d.id, name: d.name, sauce_name: d.sauce && SAUCES[d.sauce] ? SAUCES[d.sauce].name : null, prep_time_minutes: d.prepMinutes,
          price_delta_vnd: mealPriceVnd(alt, size) - current, current: d.id === meal.dishes[req.kind]
        };
      });
      return { data: { meal_index: meal.index, kind: req.kind, options } };
    },

    applyChefMenu(req) {
      const db = load();
      const plan = db.plans[req.plan_id];
      const profile = plan && db.profiles[plan.profileId];
      if (!plan || !profile) return { error: { code: 'PLAN_NOT_FOUND', message: 'Không tìm thấy hồ sơ hoặc thực đơn' } };
      if (!Array.isArray(req.meals)) return { error: { code: 'CHEF_MENU_INVALID', message: 'Thực đơn Bếp trưởng chưa đúng định dạng' } };
      const { base } = mealsOf(profile, { ...plan, upsells: {}, swaps: {}, chefWestern: undefined });
      if (req.meals.length !== base.length) return { error: { code: 'CHEF_MENU_INCOMPLETE', message: 'Bếp trưởng chưa tạo đủ số bữa' } };
      const selectedSwaps = {};
      const chefWestern = [];
      for (let i = 0; i < base.length; i++) {
        const selection = req.meals[i];
        const meal = { ...base[i], dishes: { ...base[i].dishes } };
        if (selection?.meal_index !== meal.index || typeof selection.western !== 'boolean' || !selection.dishes) {
          return { error: { code: 'CHEF_MENU_INVALID', message: 'Thứ tự hoặc cấu trúc bữa của Bếp trưởng không hợp lệ' } };
        }
        if (selection.western) meal.western = true;
        else delete meal.western;
        chefWestern.push(selection.western);
        if (Boolean(DISHES[selection.dishes.protein]?.western) !== selection.western) return { error: { code: 'CHEF_MENU_INVALID', message: 'Phong cách món đạm không khớp thực đơn' } };
        const swaps = {};
        for (const kind of KINDS) {
          const dishId = selection.dishes[kind];
          if (Boolean(dishId) !== Boolean(meal.dishes[kind])) return { error: { code: 'CHEF_MENU_INCOMPLETE', message: 'Thực đơn Bếp trưởng thiếu thành phần' } };
          if (!dishId) continue;
          const dish = DISHES[dishId];
          if (!dish || dish.kind !== kind || !swapOptionsFor(meal, kind, profile.restrictions).some((o) => o.id === dishId)) {
            return { error: { code: 'DISH_NOT_ALLOWED', message: 'Một món Bếp trưởng chọn không có trong danh mục MOVA hoặc không phù hợp khảo sát' } };
          }
          meal.dishes[kind] = dishId;
          swaps[kind] = dishId;
        }
        selectedSwaps[meal.index] = swaps;
      }
      plan.swaps = selectedSwaps;
      plan.chefWestern = chefWestern;
      plan.upsells = {};
      save(db);
      return { view: planView(profile, plan) };
    },

    /** Xóa bản nháp (sau khi đăng ký xong hoặc khách làm lại từ đầu). */
    clear() {
      save({ profiles: {}, plans: {} });
    }
  };
}
