// Danh mục tùy chọn hồ sơ khách hàng dùng chung giữa khảo sát (/plans) và tab Hồ sơ (/account).

export const ALLERGENS = [
  { code: 'seafood', label: 'Hải sản' },
  { code: 'shellfish', label: 'Động vật có vỏ (tôm, cua)' },
  { code: 'peanut', label: 'Đậu phộng' },
  { code: 'egg', label: 'Trứng' },
  { code: 'lactose', label: 'Sữa / Lactose' },
  { code: 'soy', label: 'Đậu nành' },
  { code: 'gluten', label: 'Gluten' }
];

export const AVOIDS = [
  { code: 'beef', label: 'Không ăn bò' },
  { code: 'pork', label: 'Không ăn heo' },
  { code: 'spicy', label: 'Không ăn cay' }
];

export const PROFILE_HEALTH_NEEDS = [
  { id: 'balanced', label: 'Cân bằng dinh dưỡng' },
  { id: 'gym', label: 'Tăng cơ / Tập Gym' },
  { id: 'weight_loss', label: 'Giảm mỡ / Giữ dáng' },
  { id: 'limit_sugar', label: 'Hạn chế đường (tham khảo dinh dưỡng)' },
  { id: 'sensitive_stomach', label: 'Tiêu hóa nhẹ nhàng' },
  { id: 'elderly', label: 'Người lớn tuổi' },
  { id: 'young_child', label: 'Trẻ nhỏ' },
  { id: 'gout', label: 'Ít đạm purin (tham khảo dinh dưỡng)' },
  { id: 'meat_lover', label: 'Thích ăn nhiều thịt' }
];

export const PROTEIN_SOURCES = [
  { id: 'beef', name: 'Thịt bò Tây Nguyên', icon: '🥩', desc: 'Thăn bò đồi Bazan mềm ngọt' },
  { id: 'pork', name: 'Thịt heo thảo mộc', icon: '🥓', desc: 'Ba rọi, sườn non Cư M\'gar thơm sạch' },
  { id: 'chicken', name: 'Gà đồi Đắk Lắk', icon: '🍗', desc: 'Gà thả vườn thớ thịt săn chắc' },
  { id: 'fish', name: 'Cá biển tươi Vũng Tàu', icon: '🐟', desc: 'Cá bớp cắt khoanh dày ngọt thịt' },
  { id: 'seafood', name: 'Tôm & Hải sản', icon: '🦐', desc: 'Tôm sú bóc nõn rút chỉ tiện lợi' },
  { id: 'plant', name: 'Đạm thực vật & Nấm', icon: '🥑', desc: 'Đậu hũ non, nấm đùi gà thanh nhẹ' }
];

export const CUISINE_STYLES = [
  { id: 'viet', name: 'Thuần Việt', icon: '🍚', desc: 'Cơm nhà 3 miền chuẩn vị Á Đông ấm cúng' },
  { id: 'asian', name: 'Đồ Á hiện đại', icon: '🥢', desc: 'Món Hàn, Trung, Đài phong vị đậm đà' },
  { id: 'western', name: 'Đồ Tây thượng hạng', icon: '🍝', desc: 'Steak bò, áp chảo, mì Ý xốt kem nấm' }
];

const AVOID_FROM_CODE = {
  seafood: 'no_seafood',
  shellfish: 'no_shellfish',
  peanut: 'no_peanuts',
  gluten: 'no_gluten',
  lactose: 'no_lactose'
};

const AVOID_FROM_TAG = {
  beef: 'no_beef',
  pork: 'no_pork',
  spicy: 'no_spicy'
};

/** Ánh xạ safety_profile từ GET /account/overview sang dữ liệu khảo sát cho usePlanFlowStore. */
export function surveyAnswersFromProfile(customer) {
  const sp = (customer && customer.safety_profile) || {};
  const adults = Math.max(1, Math.min(10, Number(sp.adults_count ?? sp.servings_default ?? 2)));
  const children = Math.max(0, Math.min(10, Number(sp.children_count ?? 0)));
  const size = Math.max(1, Math.min(10, adults + children));
  const cuisines = Array.isArray(sp.cuisines) && sp.cuisines.length ? [...sp.cuisines] : ['viet'];
  const cuisine = cuisines.includes('western') ? (cuisines.length > 1 ? 'viet_western' : 'western') : 'viet';
  const avoid = [];
  for (const code of sp.allergen_codes || []) {
    if (AVOID_FROM_CODE[code]) avoid.push(AVOID_FROM_CODE[code]);
  }
  for (const tag of sp.avoid_tags || []) {
    if (AVOID_FROM_TAG[tag]) avoid.push(AVOID_FROM_TAG[tag]);
  }
  const meals = Math.max(3, Math.min(21, Number(sp.weekly_home_meals_count ?? 5)));
  return {
    district: sp.living_area || (customer && customer.district) || 'Quận 1',
    adults,
    children,
    size,
    needs: Array.isArray(sp.household_needs) ? [...sp.household_needs] : [],
    cuisines,
    cuisine,
    proteinPrefs: sp.protein_prefs && typeof sp.protein_prefs === 'object' ? { ...sp.protein_prefs } : {},
    avoid: [...new Set(avoid)],
    meals,
    budget: sp.weekly_grocery_budget_vnd || null
  };
}

/** Kiểm tra tài khoản đã có khảo sát/hồ sơ khẩu vị hoặc từng đặt hàng trước đó hay chưa. */
export function hasCompletedCustomerProfile(account) {
  const c = account && account.customer;
  if (!c) return false;
  if (c.onboarding_completed || c.onboarding_completed_at) return true;
  if (c.has_subscription || (Array.isArray(account.subscriptions) && account.subscriptions.length > 0)) return true;
  const sp = c.safety_profile || {};
  if (String(sp.living_area || '').trim() || String(c.district || '').trim()) return true;
  if (sp.weekly_grocery_budget_vnd != null && Number(sp.weekly_grocery_budget_vnd) > 0) return true;
  if (Array.isArray(sp.household_needs) && sp.household_needs.length > 0) return true;
  if (Array.isArray(sp.cuisines) && sp.cuisines.length > 0) return true;
  if (Array.isArray(sp.allergen_codes) && sp.allergen_codes.length > 0) return true;
  if (Array.isArray(sp.avoid_tags) && sp.avoid_tags.length > 0) return true;
  if (sp.require_vegetarian) return true;
  if (sp.protein_prefs && Object.values(sp.protein_prefs).some((v) => v && v !== 'neutral')) return true;
  if (sp.weekly_home_meals_count != null && Number(sp.weekly_home_meals_count) !== 5) return true;
  if ((sp.adults_count != null && Number(sp.adults_count) !== 2) || (sp.children_count != null && Number(sp.children_count) > 0)) return true;
  return false;
}
