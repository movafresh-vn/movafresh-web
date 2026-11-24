import { describe, expect, it } from 'vitest';
import { aiMealsToBase, createPlanDrafts, profileGoalsFor } from '../api/planDraft';
import { DISHES } from '../data/catalog';
import { allowedDishes, swapOptionsFor } from '../domain/mealPlan';

const store = () => { let v = { profiles: {}, plans: {} }; return { read: () => v, write: (x) => { v = x; } }; };
const NOW = new Date('2026-11-23T01:00:00.000Z');
const ZONE = { zone_id: 'Z2', zone_name: 'Quận 7', province: 'TP. HCM' };
const req = (extra = {}) => ({ user_contact: { phone_or_email: '0987654321' }, survey_answers: { living_area: 'Quận 7', household_size: 3, household_needs: ['young_child'], allergies_and_restrictions: ['no_seafood'], weekly_home_meals_count: 5, cuisine: 'viet', ...extra } });
const setup = (e) => {
  const d = createPlanDrafts({ storage: store(), now: () => NOW });
  const { profile, out } = d.createProfile({ req: req(e), zone: ZONE });
  return { d, profile, out };
};

describe('W1-07: bản nháp thực đơn ở trình duyệt (kiểm lại ở máy chủ)', () => {
  it('lọc các mã dị ứng mới theo nhãn món và không dùng món thiếu nhãn', () => {
    const fixtures = {
      'test-safe': { id: 'test-safe', kind: 'test', tags: [], allergen_codes: [] },
      'test-nut': { id: 'test-nut', kind: 'test', tags: [], allergen_codes: ['tree_nut'] },
      'test-peanut': { id: 'test-peanut', kind: 'test', tags: [], allergen_codes: ['peanut'] },
      'test-shellfish': { id: 'test-shellfish', kind: 'test', tags: [], allergen_codes: ['shellfish'] },
      'test-unknown': { id: 'test-unknown', kind: 'test', tags: [] }
    };
    Object.assign(DISHES, fixtures);
    try {
      const ids = (avoid) => allowedDishes('test', avoid).map((d) => d.id);
      expect(ids(['no_nuts'])).toEqual(['test-safe', 'test-peanut', 'test-shellfish']);
      expect(ids(['no_peanuts'])).toEqual(['test-safe', 'test-nut', 'test-shellfish']);
      expect(ids(['no_shellfish'])).toEqual(['test-safe', 'test-nut', 'test-peanut']);
      expect(ids(['no_nuts', 'no_peanuts', 'no_shellfish'])).toEqual(['test-safe']);
    } finally {
      for (const id of Object.keys(fixtures)) delete DISHES[id];
    }
  });

  it('không cho đổi tinh bột sang món chứa chất dị ứng', () => {
    const id = 'test-allergen-carb';
    DISHES[id] = { id, kind: 'carb', tags: [], allergen_codes: ['tree_nut'], western: false };
    try {
      const protein = Object.values(DISHES).find((d) => d.kind === 'protein' && !d.western);
      const previous = protein.carbAlt;
      protein.carbAlt = [id];
      try {
        expect(swapOptionsFor({ dishes: { protein: protein.id, carb: id } }, 'carb', ['no_nuts']).map((d) => d.id)).not.toContain(id);
      } finally {
        protein.carbAlt = previous;
      }
    } finally {
      delete DISHES[id];
    }
  });

  it('W1-07: hồ sơ nháp: trẻ nhỏ kéo theo không cay; tỉ lệ và khu từ máy chủ', () => {
    const { profile, out } = setup();
    expect(profile.restrictions).toEqual(expect.arrayContaining(['no_seafood', 'no_spicy']));
    expect(out).toMatchObject({ zone_id: 'Z2', household_type: 'family', initial_credit_bonus_earned_vnd: 20000 });
    expect(profileGoalsFor({ household_needs: ['gout'] }).restrictions).toContain('no_seafood');
    expect(profileGoalsFor({ household_needs: ['weight_loss'] }).goals).toContain('low_carb');
  });

  it('W1-07: thực đơn đủ số bữa, không có món bị kiêng (hải sản, cay) trong bất kỳ bữa nào', () => {
    const { d, profile } = setup();
    const g = d.generate({ profileId: profile.id });
    expect(g.view.meals).toHaveLength(5);
    for (const m of g.view.meals) {
      for (const dish of Object.values(m.meal_structure).filter(Boolean)) {
        const tags = DISHES[dish.dish_id].tags;
        expect(tags).not.toContain('seafood');
        expect(tags).not.toContain('spicy');
      }
    }
    expect(g.view.week_value_vnd).toBeGreaterThan(0);
  });

  it('W1-07: đổi món chỉ nhận món nằm trong danh sách đổi được (món bị kiêng bị từ chối)', () => {
    const { d, profile } = setup();
    const g = d.generate({ profileId: profile.id });
    const opts = d.swapOptions({ plan_id: g.plan.id, meal_index: 1, kind: 'protein' }).data.options;
    expect(opts.length).toBeGreaterThan(1);
    expect(opts.every((o) => !DISHES[o.dish_id].tags.includes('seafood'))).toBe(true);
    const seafood = Object.values(DISHES).find((x) => x.kind === 'protein' && x.tags.includes('seafood'));
    if (seafood) expect(d.configure({ plan_id: g.plan.id, swap: { meal_index: 1, kind: 'protein', dish_id: seafood.id } }).error.code).toBe('DISH_NOT_ALLOWED');
    const other = opts.find((o) => !o.current);
    const done = d.configure({ plan_id: g.plan.id, swap: { meal_index: 1, kind: 'protein', dish_id: other.dish_id } });
    expect(done.view.meals[0].meal_structure.protein_dish.dish_id).toBe(other.dish_id);
    expect(d.configure({ plan_id: 'plan-la' }).error.code).toBe('PLAN_NOT_FOUND');
  });

  it('W1-07: đổi số người ăn trong giới hạn; câu hỏi giá trị chỉ nhận mã có thật', () => {
    const { d, profile } = setup();
    const g = d.generate({ profileId: profile.id });
    expect(d.configure({ plan_id: g.plan.id, household_size: 4 }).view.household_size).toBe(4);
    expect(d.configure({ plan_id: g.plan.id, household_size: 99 }).error.code).toBe('HOUSEHOLD_SIZE_INVALID');
    expect(d.configure({ plan_id: g.plan.id, upsells: { khong_co: true } }).error.code).toBe('UPSELL_INVALID');
  });

  it('W1-07: các bữa của tuần sau khác tuần 1 nhưng cùng số bữa; tuần 1 là thực đơn khách chốt', () => {
    const { d, profile } = setup();
    const g = d.generate({ profileId: profile.id });
    const w1 = d.mealsFor(g.plan.id).meals;
    expect(d.mealsForWeek(g.plan.id, 1)).toEqual(w1);
    const w2 = d.mealsForWeek(g.plan.id, 2);
    expect(w2).toHaveLength(5);
    expect(d.mealsForWeek('plan-la', 2)).toEqual([]);
  });

  it('W1-07: thực đơn của AI chỉ được dùng khi đủ số bữa và mọi món có trong catalog, đúng loại, không bị kiêng; ngược lại bỏ (an toàn mặc định)', () => {
    const prot = Object.values(DISHES).find((x) => x.kind === 'protein' && !x.western && !x.tags.includes('seafood'));
    const veg = Object.values(DISHES).find((x) => x.kind === 'veg');
    const carb = DISHES['D-CRB-001'];
    const meal = (i, p) => ({ meal_index: i, western: false, meal_structure: { protein_dish: { dish_id: p }, veggie_dish: { dish_id: veg.id }, carb_dish: { dish_id: carb.id } } });
    const good = { meals: [1, 2].map((i) => meal(i, prot.id)) };
    expect(aiMealsToBase(good, { restrictions: [], mealsCount: 2 })).toHaveLength(2);
    expect(aiMealsToBase(good, { restrictions: [], mealsCount: 3 })).toBeNull();
    expect(aiMealsToBase({ meals: [meal(1, 'D-LA-000'), meal(2, prot.id)] }, { restrictions: [], mealsCount: 2 })).toBeNull();
    const blocked = prot.tags[0] ? { no_beef: 'beef', no_pork: 'pork' } : {};
    const code = Object.entries(blocked).find(([, tag]) => prot.tags.includes(tag));
    if (code) expect(aiMealsToBase(good, { restrictions: [code[0]], mealsCount: 2 })).toBeNull();
    expect(aiMealsToBase({ meals: [meal(1, veg.id), meal(2, prot.id)] }, { restrictions: [], mealsCount: 2 })).toBeNull(); // sai loại món
    expect(aiMealsToBase(null, { restrictions: [], mealsCount: 2 })).toBeNull();
  });

  it('W1-07: thực đơn AI hợp lệ trở thành thực đơn nền của bản nháp', () => {
    const { d, profile } = setup({ weekly_home_meals_count: 3 });
    const prot = Object.values(DISHES).filter((x) => x.kind === 'protein' && !x.western && !x.tags.includes('seafood') && !x.tags.includes('spicy'))[0];
    const veg = Object.values(DISHES).find((x) => x.kind === 'veg' && !x.tags.includes('spicy') && !x.tags.includes('seafood'));
    const base = aiMealsToBase({ meals: [1, 2, 3].map((i) => ({ meal_index: i, meal_structure: { protein_dish: { dish_id: prot.id }, veggie_dish: { dish_id: veg.id }, carb_dish: { dish_id: 'D-CRB-001' } } })) }, { restrictions: profile.restrictions, mealsCount: 3 });
    expect(base).not.toBeNull();
    const g = d.generate({ profileId: profile.id, baseMeals: base });
    expect(g.view.meals.map((m) => m.meal_structure.protein_dish.dish_id)).toEqual([prot.id, prot.id, prot.id]);
  });

  it('W1-07: dọn bản nháp xóa hồ sơ và thực đơn', () => {
    const { d, profile } = setup();
    const g = d.generate({ profileId: profile.id });
    d.clear();
    expect(d.profileOf(profile.id)).toBeNull();
    expect(d.get(g.plan.id).error.code).toBe('PLAN_NOT_FOUND');
  });
});
