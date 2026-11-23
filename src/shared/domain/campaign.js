// Chiến dịch theo mùa: gợi ý món theo nguyên liệu mùa vụ kèm ưu đãi chốt món (lock_menu), add-on đồ Tết, và báo tuần dời vì nghỉ Tết.
// MẶC ĐỊNH TẮT: mọi thứ ở đây chỉ hiện khi máy chủ báo chiến dịch đang chạy (xem campaignActive) hoặc build bật VITE_CAMPAIGN_ACTIVE=true
// song song với dòng đang bật trong bảng `campaigns` của backend. Tiền luôn do backend tính: web chỉ gửi cờ lock_menu.

/**
 * Chiến dịch có đang chạy không. Nguồn tin theo thứ tự: phản hồi máy chủ (plan.campaign / preview.campaign có active=true,
 * hoặc preview.lock_menu_available=true), rồi cờ build VITE_CAMPAIGN_ACTIVE=true (backend hiện chưa có đường riêng báo chiến dịch).
 */
export function campaignActive({ plan = null, preview = null } = {}, env = import.meta.env || {}) {
  if (plan && plan.campaign && plan.campaign.active === true) return true;
  if (preview && ((preview.campaign && preview.campaign.active === true) || preview.lock_menu_available === true)) return true;
  return env.VITE_CAMPAIGN_ACTIVE === 'true';
}

/** Từ khóa nguyên liệu vào mùa theo tháng dương lịch (1-12), để khớp tên món hoặc tên nguyên liệu trong BOM. */
export const SEASONAL_KEYWORDS = Object.freeze({
  1: ['bí đỏ', 'củ sen', 'cải', 'bông cải'],
  2: ['củ sen', 'bí đỏ', 'cải', 'bông cải'],
  3: ['cải', 'cà chua', 'bông cải'],
  4: ['cà chua', 'cải', 'khoai lang'],
  5: ['vải', 'cà chua', 'khoai lang'],
  6: ['vải', 'chuối', 'cà chua'],
  7: ['chuối', 'khoai lang', 'cải'],
  8: ['chuối', 'khoai lang', 'bí đỏ'],
  9: ['bí đỏ', 'khoai lang', 'cải'],
  10: ['bí đỏ', 'củ sen', 'cải'],
  11: ['bí đỏ', 'củ sen', 'bông cải'],
  12: ['bí đỏ', 'củ sen', 'bông cải']
});

const norm = (s) => String(s || '').toLowerCase();

/** Văn bản dùng để khớp từ khóa: tên món + tên các nguyên liệu trong BOM (tra `skus`). */
function dishText(dish, skus = {}) {
  const parts = [dish.name, ...(dish.bom || []).map((b) => (skus[b.sku] ? skus[b.sku].name : ''))];
  return norm(parts.join(' '));
}

/**
 * Chọn tối đa `limit` món vào mùa của tháng `month` (1-12) từ `dishes` (mảng hoặc object như DISHES).
 * Trả [{ dish, ingredient }] với ingredient là từ khóa mùa vụ khớp. Món Tây không gợi ý.
 */
export function seasonalDishes(dishes, month, { skus = {}, limit = 3 } = {}) {
  const list = Array.isArray(dishes) ? dishes : Object.values(dishes || {});
  const keys = SEASONAL_KEYWORDS[month] || [];
  const out = [];
  for (const dish of list) {
    if (dish.western) continue;
    const text = dishText(dish, skus);
    const hit = keys.find((k) => text.includes(k));
    if (hit) out.push({ dish, ingredient: hit });
    if (out.length >= limit) break;
  }
  return out;
}

/** Nội dung ưu đãi chốt món hiện cho khách. Không nêu số tiền: mức giảm do chiến dịch backend quy định, hiện ở bước thanh toán. */
export const LOCK_MENU_OFFER = Object.freeze({
  title: 'Chốt món sớm, nhận ưu đãi chiến dịch',
  body: 'Chốt thực đơn các tuần còn xa mốc trừ tiền 72 giờ để nhận ưu đãi của chiến dịch. Các tuần đã chốt không đổi món được nữa.',
  accept: 'Chốt món và nhận ưu đãi',
  decline: 'Để sau, tôi muốn đổi món linh hoạt'
});

/**
 * Add-on đồ Tết bán kèm ở bước chọn món.
 * GIÁ DƯỚI ĐÂY LÀ GIẢ ĐỊNH (chờ anh Trung / anh Hiếu xác nhận giá thật). Chưa có đường backend tính hay thu tiền add-on,
 * nên đây chỉ là danh sách khách quan tâm; MOVA xác nhận giá và thanh toán riêng khi chiến dịch chạy thật.
 */
export const TET_ADDONS = Object.freeze([
  { id: 'banh_chung', name: 'Bánh chưng gói sẵn', unit: 'cái', priceVnd: 95000, assumedPrice: true },
  { id: 'cu_kieu', name: 'Củ kiệu muối chua ngọt', unit: 'hũ', priceVnd: 55000, assumedPrice: true }
]);

/** Add-on Tết chỉ hiện khi chiến dịch đang chạy. */
export const tetAddons = (active) => (active ? TET_ADDONS.map((a) => ({ ...a })) : []);

/** Thêm hoặc bỏ một add-on khỏi danh sách đã chọn (trả mảng mới, không trùng, chỉ nhận mã có thật). */
export function toggleAddon(selected, id) {
  if (!TET_ADDONS.some((a) => a.id === id)) return [...selected];
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

/** Tuần dời vì nghỉ lễ → câu báo cho khách, ví dụ "Tuần 2 giao ngày 11/02 thay vì 05/02 vì nghỉ Tết". */
export function shiftedNotice(week, fmtDate = (d) => d) {
  if (!week || !week.shifted_from) return '';
  return `Tuần ${week.week_index + 1} giao ngày ${fmtDate(week.delivery_date)} thay vì ${fmtDate(week.shifted_from)} vì nghỉ lễ Tết.`;
}

/** Lỗi đổi món vì tuần đã chốt theo ưu đãi. */
export const isMenuLocked = (res) => Boolean(res && res.error && res.error.code === 'MENU_LOCKED');
