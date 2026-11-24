import { DISHES } from '../data/catalog';
import { BUSINESS } from '../config/business';

const BLOCKING_TAG = {
  no_beef: 'beef',
  no_pork: 'pork',
  no_seafood: 'seafood',
  no_spicy: 'spicy',
  no_gluten: 'gluten',
  no_lactose: 'lactose'
};
const BLOCKING_ALLERGENS = {
  no_seafood: ['seafood', 'shellfish'],
  no_shellfish: ['seafood', 'shellfish'],
  no_peanuts: ['peanut'],
  no_nuts: ['tree_nut'],
  no_gluten: ['gluten'],
  no_lactose: ['lactose']
};
const REQUIRE_ALLERGEN_LABELS = ['no_shellfish', 'no_peanuts', 'no_nuts'];

export const DEFAULT_CARB = 'D-CRB-001'; // cơm gạo ST25: tinh bột mặc định
export const LOW_CARB_CARB = 'D-CRB-003'; // khoai lang thay cơm cho người cần ít tinh bột

const blockedSet = (restrictions) => new Set(restrictions.map((r) => BLOCKING_TAG[r]).filter(Boolean));

/** Món cùng loại, đã bỏ món bị kiêng. `western` chọn nhóm món Tây hoặc nhóm món Việt. */
export function allowedDishes(kind, restrictions = [], { western = false } = {}) {
  const blocked = blockedSet(restrictions);
  const allergens = new Set(restrictions.flatMap((r) => BLOCKING_ALLERGENS[r] || []));
  const requireLabels = restrictions.some((r) => REQUIRE_ALLERGEN_LABELS.includes(r));
  return Object.values(DISHES).filter(
    (d) => d.kind === kind && Boolean(d.western) === western &&
      (!requireLabels || Array.isArray(d.allergen_codes)) &&
      !d.tags.some((t) => blocked.has(t) || allergens.has(t)) &&
      !(d.allergen_codes || []).some((a) => allergens.has(a))
  );
}

/** Hệ số khẩu phần của một món trong một bữa (đạm / tinh bột / rau có thể đổi qua câu hỏi giá trị). */
export function dishFactor(meal, dish) {
  if (dish.kind === 'protein') return meal.proteinFactor || 1;
  if (dish.kind === 'carb') return meal.carbFactor || 1;
  if (dish.kind === 'veg') return meal.vegFactor || 1;
  return 1;
}

/** Số bữa Tây mỗi tuần theo khẩu vị khách chọn. */
export function westernCountFor(cuisine, mealsCount, cfg = BUSINESS) {
  if (cuisine === 'western') return mealsCount >= 5 ? 3 : 2;
  if (cuisine === 'viet_western') {
    const w = cfg.plan.westernMealsWhenMixed;
    return mealsCount >= w.withMealsAtLeast ? w.extra : w.base;
  }
  return 0;
}

/**
 * Sinh thực đơn của một tuần cho một hồ sơ (bản mock, ai-engine thật sẽ thay).
 * - 1 người: món đạm + rau + tinh bột (suất nấu 1 chảo).
 * - Từ 2 người: mâm cơm Việt đủ 5 phần: đạm + rau + canh + tinh bột + tráng miệng.
 * - Tinh bột mặc định là cơm. Muốn ít tinh bột → khoai lang thay cơm. Muốn nhiều đạm → tăng khẩu phần đạm 30%.
 * - westernCount: số bữa Tây ở cuối tuần (đạm Tây + rau + tinh bột, từ 2 người thêm trái cây).
 * - weeklyBudgetVnd: trần MỀM, nếu thực đơn vượt thì thay bớt món đạm đắt bằng món rẻ hơn. Không bao giờ ép dưới mức hợp lý.
 * `rand` là hàm trả số trong [0,1) để kết quả lặp lại được.
 */
export function generateMeals({
  householdSize, goals = [], restrictions = [], mealsCount, rand,
  westernCount = 0, weeklyBudgetVnd = null
}) {
  const pick = (kind, opts) => {
    const pool = allowedDishes(kind, restrictions, opts);
    if (!pool.length) throw new Error('Chưa có đủ món phù hợp với mục kiêng của bạn.');
    return pool[Math.floor(rand() * pool.length)];
  };
  const lowCarb = goals.includes('low_carb') || goals.includes('limit_sugar');
  const highProtein = goals.includes('high_protein');
  const family = householdSize >= 2;
  const westFrom = mealsCount - Math.min(westernCount, mealsCount);

  const meals = [];
  for (let i = 0; i < mealsCount; i++) {
    const dishes = {};
    const west = i >= westFrom;
    dishes.protein = pick('protein', { western: west }).id;
    dishes.veg = pick('veg').id;
    const preferredCarb = lowCarb ? LOW_CARB_CARB : DEFAULT_CARB;
    const carbs = allowedDishes('carb', restrictions);
    dishes.carb = carbs.find((d) => d.id === preferredCarb)?.id || pick('carb').id;
    if (family) {
      if (!west) dishes.soup = pick('soup').id;
      dishes.dessert = pick('dessert').id;
    }
    const meal = { index: i + 1, dishes, proteinFactor: highProtein ? 1.3 : 1 };
    if (west) meal.western = true;
    meals.push(meal);
  }
  return weeklyBudgetVnd ? fitSoftBudget(meals, { householdSize, restrictions, weeklyBudgetVnd }) : meals;
}

function fitSoftBudget(meals, { householdSize, restrictions, weeklyBudgetVnd }) {
  const out = meals.map((m) => ({ ...m, dishes: { ...m.dishes } }));
  let total = mealsPriceVnd(out, householdSize);
  if (total <= weeklyBudgetVnd) return out;
  const cheapest = allowedDishes('protein', restrictions).sort((a, b) => a.pricePerPersonVnd - b.pricePerPersonVnd);
  const order = out
    .map((m, i) => ({ i, price: mealPriceVnd(m, householdSize) }))
    .filter(({ i }) => !out[i].western)
    .sort((a, b) => b.price - a.price);
  for (const { i } of order) {
    if (total <= weeklyBudgetVnd) break;
    const cur = DISHES[out[i].dishes.protein];
    const cheaper = cheapest.find((d) => d.pricePerPersonVnd < cur.pricePerPersonVnd);
    if (!cheaper) continue;
    out[i].dishes.protein = cheaper.id;
    total = mealsPriceVnd(out, householdSize);
  }
  return out;
}

/** Giá một bữa cho cả hộ. */
export function mealPriceVnd(meal, householdSize) {
  let total = 0;
  for (const dishId of Object.values(meal.dishes)) {
    const d = DISHES[dishId];
    total += d.pricePerPersonVnd * householdSize * dishFactor(meal, d);
  }
  return Math.round(total / 1000) * 1000;
}

export const mealsPriceVnd = (meals, householdSize) =>
  meals.reduce((sum, m) => sum + mealPriceVnd(m, householdSize), 0);

/** Dinh dưỡng một bữa cho cả hộ. */
export function mealNutrition(meal, householdSize) {
  const sum = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  for (const dishId of Object.values(meal.dishes)) {
    const d = DISHES[dishId];
    const factor = dishFactor(meal, d);
    for (const k of Object.keys(sum)) sum[k] += d.nutrition[k] * householdSize * factor;
  }
  for (const k of Object.keys(sum)) sum[k] = Math.round(sum[k]);
  return sum;
}

/** Các món tinh bột khách được chọn cho một bữa: cơm, món đang có, và món tinh bột hợp với các món trong bữa. */
export function carbOptionsFor(meal, restrictions = []) {
  const allowed = new Set(allowedDishes('carb', restrictions).map((d) => d.id));
  return [...new Set([DEFAULT_CARB, meal.dishes.carb, ...carbAlternatives(meal)])].filter((id) => allowed.has(id));
}

function carbAlternatives(meal) {
  const ids = [];
  for (const [kind, id] of Object.entries(meal.dishes)) {
    if (kind !== 'carb') ids.push(...(DISHES[id].carbAlt || []));
  }
  return ids;
}

/** Các món khách đổi được cho một phần của bữa (đạm, rau, canh, tinh bột). */
export function swapOptionsFor(meal, kind, restrictions = []) {
  if (kind === 'carb') return carbOptionsFor(meal, restrictions).map((id) => DISHES[id]);
  if (!meal.dishes[kind]) return [];
  return allowedDishes(kind, restrictions, { western: kind === 'protein' && Boolean(meal.western) });
}

/**
 * Áp các lần đổi món của khách: swaps = { [meal.index]: { protein?, veg?, soup?, carb?, dessert? } }.
 * Món không hợp lệ (bị kiêng, sai loại, tinh bột không hợp) bị bỏ qua; đổi đạm xong mà tinh bột
 * đang chọn không còn hợp thì quay về cơm.
 */
export function applySwaps(meals, swaps = {}, restrictions = []) {
  return meals.map((m) => {
    const sw = swaps[m.index];
    if (!sw) return m;
    const next = { ...m, dishes: { ...m.dishes } };
    for (const kind of ['protein', 'veg', 'soup', 'dessert']) {
      const id = sw[kind];
      if (!id || !next.dishes[kind]) continue;
      if (swapOptionsFor(next, kind, restrictions).some((d) => d.id === id)) next.dishes[kind] = id;
    }
    const carbOptions = carbOptionsFor(next, restrictions);
    if (sw.carb && carbOptions.includes(sw.carb)) next.dishes.carb = sw.carb;
    if (!carbOptions.includes(next.dishes.carb) || ![DEFAULT_CARB, LOW_CARB_CARB, ...carbAlternatives(next)].includes(next.dishes.carb)) {
      if (!carbOptions.length) throw new Error('Chưa có món tinh bột phù hợp với mục kiêng của bạn.');
      next.dishes.carb = carbOptions.includes(DEFAULT_CARB) ? DEFAULT_CARB : carbOptions[0];
    }
    return next;
  });
}
