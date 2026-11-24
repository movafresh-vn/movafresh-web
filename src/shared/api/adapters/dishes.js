import { DISHES } from '../../data/catalog';

/**
 * Món của backend (GET /dishes) → hình dạng món của catalog dùng trong phễu (pricePerPersonVnd, prepMinutes, sauce, carbAlt...).
 * Backend là nguồn sự thật cho giá, nhãn dị ứng và món nào được hiển thị; phần nội dung phong phú chưa có ở backend (bom
 * của nhà máy, truyện vùng miền dài) giữ nguyên từ catalog tĩnh của trang giới thiệu.
 */
export function dishFromBackend(d, prior = null) {
  const nut = d.nutrition || {};
  const per = d.nutrition_per_serving || null;
  return {
    ...(prior || {}),
    id: d.id,
    kind: d.kind,
    name: d.name,
    pricePerPersonVnd: Number(d.price_per_person_vnd),
    prepMinutes: Number(d.prep_minutes ?? (prior && prior.prepMinutes) ?? 15),
    sauce: d.sauce_code || null,
    tags: Array.isArray(d.tags) ? [...d.tags] : [],
    allergen_codes: Array.isArray(d.allergen_codes) ? [...d.allergen_codes] : null,
    western: Boolean(d.western),
    carbAlt: Array.isArray(d.carb_alt) ? [...d.carb_alt] : [],
    terroir_region: d.terroir_region || (prior && prior.terroir_region) || '',
    terroir: d.terroir_region || (prior && prior.terroir) || '',
    terroir_story: d.terroir_story || (prior && prior.terroir_story) || '',
    chef_note: d.chef_note || (prior && prior.chef_note) || '',
    spec: (d.portion_specs && d.portion_specs.size_detail) || d.size_detail || (prior && prior.spec) || '',
    portion_specs: d.portion_specs || (prior && prior.portion_specs) || { net_weight_grams: 100, size_detail: d.size_detail || '', storage_guide: d.storage_guide || '' },
    nutrition: { kcal: Number(nut.kcal ?? per?.calories ?? 0), protein: Number(nut.protein ?? per?.protein_g ?? 0), carb: Number(nut.carb ?? per?.carbs_g ?? 0), fat: Number(nut.fat ?? per?.fat_g ?? 0) },
    nutrition_per_serving: per || (prior && prior.nutrition_per_serving) || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    cooking_steps: Array.isArray(d.cooking_steps) && d.cooking_steps.length ? d.cooking_steps : (prior && prior.cooking_steps) || [],
    bom: (prior && prior.bom) || [{ sku: 'NL-NA', gramsPerPerson: Number(d.portion_specs?.net_weight_grams ?? 100) }]
  };
}

/**
 * Đồng bộ catalog dùng chung với món từ backend, TẠI CHỖ (các module domain giữ tham chiếu tới cùng một object DISHES).
 * Món backend không có (chưa duyệt nhãn / đã ngừng) bị gỡ khỏi catalog để phễu không bao giờ đưa ra món đó. Trả số món sau khi đồng bộ.
 */
export function applyDishCatalog(list, target = DISHES) {
  if (!Array.isArray(list) || list.length === 0) return Object.keys(target).length;
  const active = list.filter((d) => d.is_active !== false);
  const keep = new Set(active.map((d) => d.id));
  for (const id of Object.keys(target)) if (!keep.has(id)) delete target[id];
  for (const d of active) target[d.id] = dishFromBackend(d, target[d.id] || null);
  return Object.keys(target).length;
}
