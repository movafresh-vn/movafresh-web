// Bảng giá vốn món (rule 4): chi phí TÍNH ĐỘNG từ BOM x yield x giá nguyên liệu mới nhất + bao bì + nhân công, so với giá bán.
// Món có food cost vượt ngưỡng (mặc định 35%) bị cờ đỏ để admin xem lại giá bán hoặc giá nhập. Ngưỡng do máy chủ trả (max_bp).
export const bpToPct = (bp) => Math.round(Number(bp)) / 100;

export function describeDish(d) {
  return {
    id: d.dish_id,
    name: d.name,
    kind: d.kind,
    priceVnd: d.price_vnd,
    ingredientVnd: d.ingredient_cost_vnd,
    packagingVnd: d.packaging_vnd,
    laborVnd: d.labor_vnd,
    totalCostVnd: d.total_cost_vnd,
    foodCostPct: bpToPct(d.food_cost_bp),
    over: Boolean(d.over_guardrail),
    missingPrices: Array.isArray(d.missing_prices) ? d.missing_prices : []
  };
}

/** Dữ liệu cho màn: danh sách món, ngưỡng %, số món bị cờ; chỉ lọc món vượt ngưỡng khi `onlyFlagged`. */
export function costingView(data, { onlyFlagged = false } = {}) {
  const dishes = (data && data.dishes ? data.dishes : []).map(describeDish);
  return {
    on: data ? data.on : null,
    maxPct: bpToPct(data ? data.max_bp : 3500),
    flagged: dishes.filter((d) => d.over).length,
    dishes: onlyFlagged ? dishes.filter((d) => d.over) : dishes
  };
}
