// Hạng món để HIỂN THỊ thay cho giá lẻ từng món trên mọi màn hình khách (F-feedback 23/11: ẩn giá lẻ, hiện hạng).
// Chỉ phục vụ hiển thị: tiền backend tính không đổi, web không dùng hạng này để tính hay gửi số tiền nào.
// Bảng giá chốt theo hạng (Standard / Signature) còn chờ Anh Trung và Anh Hiếu, nên ngưỡng dưới đây là GIẢ ĐỊNH.

export const TIERS = Object.freeze({
  standard: { id: 'standard', label: 'Hạng Standard', short: 'Standard' },
  signature: { id: 'signature', label: 'Hạng Signature', short: 'Signature' }
});

/** Món đạm có giá nguyên liệu từ ngưỡng này (đ/người/bữa) trở lên thì xếp Signature (GIẢ ĐỊNH, chờ chốt bảng giá theo hạng). */
export const SIGNATURE_MIN_PROTEIN_VND = 30000;

/** Hạng của một món (object trong DISHES). Chỉ món đạm phân hạng; rau, canh, tinh bột, tráng miệng luôn Standard. */
export function tierOf(dish) {
  if (!dish) return TIERS.standard;
  const price = Number(dish.pricePerPersonVnd ?? dish.price_per_person_vnd) || 0;
  return dish.kind === 'protein' && price >= SIGNATURE_MIN_PROTEIN_VND ? TIERS.signature : TIERS.standard;
}

export const tierLabel = (dish) => tierOf(dish).label;

/** Một lựa chọn đổi món (đã có dish_id) → nhãn hạng, tra món trong bảng `dishes` truyền vào. */
export const tierLabelById = (dishes, id) => tierLabel(dishes && dishes[id]);
