import { BUSINESS } from '../config/business';
import { allowedDishes, mealsPriceVnd, LOW_CARB_CARB } from './mealPlan';

/**
 * Câu hỏi giá trị ở bước xem thực đơn. Mỗi câu một dòng; trả lời là thực đơn và giá đổi ngay,
 * giao diện hiện chênh lệch theo bữa.
 */
export const UPSELL_IDS = ['more_protein', 'low_carb_veg', 'western_meal'];

export const UPSELLS = {
  more_protein: {
    id: 'more_protein',
    question: 'Thêm đạm cho người tập gym?',
    note: 'Tăng thêm khẩu phần đạm ở mọi bữa.',
    relevantFor: (profile) => (profile.needs || []).includes('gym')
  },
  low_carb_veg: {
    id: 'low_carb_veg',
    question: 'Bớt tinh bột, thêm rau?',
    note: 'Giảm một nửa phần tinh bột, thêm rau cho mỗi bữa.',
    relevantFor: (profile) =>
      (profile.needs || []).some((n) => ['weight_loss', 'limit_sugar', 'elderly'].includes(n)) ||
      (profile.goals || []).some((g) => ['low_carb', 'limit_sugar'].includes(g))
  },
  western_meal: {
    id: 'western_meal',
    question: 'Thêm 1 bữa Tây cuối tuần?',
    note: 'Một bữa steak hoặc gà xốt kem cho cuối tuần, thêm vào cùng chuyến giao.',
    relevantFor: (profile) => profile.cuisine !== 'viet_western'
  }
};

/** Các câu hỏi hợp với hồ sơ, câu hợp nhất đứng trước. Câu không còn ý nghĩa (đã có bữa Tây) thì bỏ. */
export function questionsFor(profile) {
  const all = UPSELL_IDS.map((id) => UPSELLS[id]);
  const usable = all.filter((q) => q.id !== 'western_meal' || profile.cuisine !== 'viet_western');
  const relevant = usable.filter((q) => q.relevantFor(profile));
  const rest = usable.filter((q) => !q.relevantFor(profile));
  return [...relevant, ...rest];
}

const cloneMeals = (meals) => meals.map((m) => ({ ...m, dishes: { ...m.dishes } }));

/**
 * Áp các câu trả lời "có" lên thực đơn gốc. answers = { more_protein?: bool, ... }.
 * Thuần túy: không sửa meals đầu vào. `rand` chỉ dùng để chọn món cho bữa Tây thêm.
 */
export function applyUpsells(meals, answers = {}, { householdSize, restrictions = [], rand, cfg = BUSINESS } = {}) {
  const out = cloneMeals(meals);
  const u = cfg.plan.upsells;
  if (answers.more_protein) {
    for (const m of out) m.proteinFactor = Math.max(m.proteinFactor || 1, u.proteinFactor);
  }
  if (answers.low_carb_veg) {
    for (const m of out) {
      m.carbFactor = u.lowCarbCarbFactor;
      m.vegFactor = u.lowCarbVegFactor;
    }
  }
  if (answers.western_meal) {
    const pool = allowedDishes('protein', restrictions, { western: true });
    const veg = allowedDishes('veg', restrictions);
    const dessert = allowedDishes('dessert', restrictions);
    const carbs = allowedDishes('carb', restrictions);
    if (!pool.length || !veg.length || !carbs.length || (householdSize >= 2 && !dessert.length)) {
      throw new Error('Chưa có đủ món phù hợp với mục kiêng của bạn.');
    }
    const pick = (list) => list[Math.floor(rand() * list.length)];
    const proteinDish = pick(pool);
    const dishes = {
      protein: proteinDish.id,
      veg: pick(veg).id,
      carb: proteinDish.carbAlt?.find((id) => carbs.some((d) => d.id === id)) || carbs.find((d) => d.id === LOW_CARB_CARB)?.id || carbs[0].id
    };
    if (householdSize >= 2) dishes.dessert = pick(dessert).id;
    const base = out[0] || { proteinFactor: 1 };
    out.push({
      index: out.length + 1,
      dishes,
      proteinFactor: base.proteinFactor || 1,
      carbFactor: base.carbFactor || 1,
      vegFactor: base.vegFactor || 1,
      western: true
    });
  }
  return out;
}

/**
 * Chênh lệch giá khi bật một câu hỏi, so với trạng thái hiện tại của các câu khác.
 * ctx.post: bước áp sau cùng (đổi món của khách); ctx.makeRand: tạo bộ sinh số ngẫu nhiên mới cho mỗi lần áp.
 * perMealVnd: chênh lệch trên MỖI bữa bị ảnh hưởng (câu Tây: giá của một bữa Tây thêm vào).
 */
export function upsellDelta(baseMeals, answers, id, ctx) {
  const post = ctx.post || ((m) => m);
  // Mỗi lần áp dùng một bộ sinh số ngẫu nhiên mới để cùng một bữa Tây được chọn ở cả hai trạng thái
  const run = (a) => post(applyUpsells(baseMeals, a, { ...ctx, rand: ctx.makeRand ? ctx.makeRand() : ctx.rand }));
  const without = run({ ...answers, [id]: false });
  const withIt = run({ ...answers, [id]: true });
  const size = ctx.householdSize;
  const weekDeltaVnd = mealsPriceVnd(withIt, size) - mealsPriceVnd(without, size);
  const affected = id === 'western_meal' ? 1 : Math.max(1, without.length);
  return { weekDeltaVnd, perMealVnd: Math.round(weekDeltaVnd / affected / 1000) * 1000, affectedMeals: affected };
}
