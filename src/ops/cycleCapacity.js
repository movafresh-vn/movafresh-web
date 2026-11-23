// Sức chứa chu kỳ giao = MIN của ba nút thắt vật lý (quy tắc 2): nguồn cung nông sản Đắk Lắk (gram thô theo SKU), công suất sơ chế nhà máy,
// xe lạnh chặng dài (số thùng và kg). Hàm thuần để dựng form và thân PUT; máy chủ mới là nơi tính "còn lại" và chặn đặt quá.

export const LIMIT_LABEL = {
  factory_prep: 'Công suất sơ chế nhà máy',
  truck_boxes: 'Số thùng xe lạnh',
  truck_kg: 'Tải trọng xe lạnh (kg)',
  farm_supply: 'Nguồn cung nông sản'
};

/** Nút thắt đang quyết định số thùng còn lại của một chu kỳ: { key, label, remaining } hoặc null khi không có dữ liệu. */
export function bindingLimit(cycle) {
  if (!cycle || !cycle.by_limit) return null;
  const rows = Object.entries(cycle.by_limit)
    .filter(([, v]) => Number.isFinite(Number(v)))
    .map(([key, v]) => ({ key, label: LIMIT_LABEL[key] || key, remaining: Number(v) }));
  for (const s of cycle.sku_supply || []) {
    if (Number.isFinite(Number(s.remaining_boxes))) rows.push({ key: `sku:${s.sku}`, label: `Nguồn cung ${s.sku}`, remaining: Number(s.remaining_boxes) });
  }
  if (!rows.length) return null;
  return rows.reduce((a, b) => (b.remaining < a.remaining ? b : a));
}

/** Giá trị ban đầu của form một ngày: số trên ô là chuỗi để ô trống = "về mặc định". Trần SKU hiển thị bằng kg. */
export function formFromCycle(cycle) {
  const l = cycle.limits || {};
  return {
    factory_max_boxes: l.factory_max_boxes == null ? '' : String(l.factory_max_boxes),
    truck_max_boxes: l.truck_max_boxes == null ? '' : String(l.truck_max_boxes),
    truck_max_kg: l.truck_max_kg == null ? '' : String(l.truck_max_kg),
    sku_supply: (cycle.sku_supply || []).map((s) => ({ sku_id: s.sku, kg: s.max_gross_g == null ? '' : String(Math.round(s.max_gross_g) / 1000) })),
    note: ''
  };
}

const intOrNull = (v) => (v === '' || v == null ? null : Number(v));

/**
 * Thân PUT /ops/logistics/cycle-capacity/:date từ form: CHỈ gửi trường đã đổi so với ban đầu (không ghi đè trường người khác vừa sửa).
 * Ô để trống = null = về mặc định cấu hình. Trần SKU nhập bằng kg, gửi bằng gram nguyên; xóa ô = gỡ trần.
 * Ném Error { code: 'CAPACITY_INVALID' } khi có số âm / không phải số.
 */
export function buildCycleBody(form, original) {
  const bad = (m) => Object.assign(new Error(m), { code: 'CAPACITY_INVALID' });
  const body = {};
  for (const k of ['factory_max_boxes', 'truck_max_boxes']) {
    if (form[k] === original[k]) continue;
    const n = intOrNull(form[k]);
    if (n !== null && (!Number.isInteger(n) || n < 0)) throw bad('Số thùng phải là số nguyên không âm.');
    body[k] = n;
  }
  if (form.truck_max_kg !== original.truck_max_kg) {
    const n = intOrNull(form.truck_max_kg);
    if (n !== null && (!Number.isFinite(n) || n < 0)) throw bad('Tải trọng xe phải là số không âm.');
    body.truck_max_kg = n;
  }
  const before = new Map((original.sku_supply || []).map((s) => [s.sku_id, s.kg]));
  const sku = [];
  for (const s of form.sku_supply || []) {
    if (!s.sku_id) continue;
    if (before.get(s.sku_id) === s.kg) continue;
    const kg = intOrNull(s.kg);
    if (kg !== null && (!Number.isFinite(kg) || kg < 0)) throw bad(`Trần nguồn cung ${s.sku_id} phải là số không âm.`);
    sku.push({ sku_id: s.sku_id, max_gross_g: kg === null ? null : Math.round(kg * 1000) });
  }
  if (sku.length) body.sku_supply = sku;
  if (form.note && form.note.trim()) body.note = form.note.trim();
  return body;
}
