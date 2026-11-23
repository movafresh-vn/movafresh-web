import { DISHES, NUTRITION_BASIS } from '../data/catalog';

/**
 * Kiểm danh mục món (F11, F12). Hàm thuần, không đụng mạng hay store.
 * - F11: mỗi món có phần cắt (cut) và dinh dưỡng (kcal, đạm) tính cho 1 người / 1 bữa.
 * - F12: chữ hiển thị cho khách không hứa chữa bệnh; chỉ "hỗ trợ / tham khảo dinh dưỡng".
 * Lưu ý: danh sách 16 món thật do đầu bếp (Anh Hiếu) cấp; giá trị trong catalog hiện là dữ liệu tạm.
 */

export const CUT_GROUPS = ['pork', 'beef', 'chicken', 'seafood', 'veg', 'soup', 'carb', 'fruit'];

/** Nhóm cắt bắt buộc có thêm `part` là phần thịt/cá cụ thể (má đùi gà khác ức gà). */
const MEAT_GROUPS = ['pork', 'beef', 'chicken', 'seafood'];

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

/** Danh sách lỗi cấu trúc của một món (rỗng là hợp lệ). */
export function dishProblems(d) {
  const out = [];
  if (!d || typeof d !== 'object') return ['món rỗng'];
  const cut = d.cut;
  if (!cut || typeof cut !== 'object') out.push('thiếu phần cắt (cut)');
  else {
    if (!CUT_GROUPS.includes(cut.group)) out.push(`nhóm cắt không hợp lệ: ${cut.group}`);
    if (typeof cut.part !== 'string' || !cut.part.trim()) out.push('thiếu cut.part');
    if (typeof cut.label !== 'string' || !cut.label.trim()) out.push('thiếu cut.label');
    if (MEAT_GROUPS.includes(cut.group) && cut.part === 'whole') out.push('món thịt/cá phải nêu phần cắt cụ thể');
  }
  const n = d.nutrition_per_serving;
  if (!n || typeof n !== 'object') out.push('thiếu dinh dưỡng (nutrition_per_serving)');
  else {
    if (!isNum(n.calories) || n.calories <= 0) out.push('kcal phải là số lớn hơn 0');
    if (!isNum(n.protein_g) || n.protein_g < 0) out.push('đạm (g) phải là số không âm');
  }
  if (d.nutrition_basis !== NUTRITION_BASIS) out.push(`dinh dưỡng phải tính theo ${NUTRITION_BASIS}`);
  if (n && d.nutrition && (d.nutrition.kcal !== n.calories || d.nutrition.protein !== n.protein_g)) out.push('nutrition và nutrition_per_serving lệch nhau');
  return out;
}

/** Kiểm cả danh mục: trả `{ ok, problems: [{ dishId, problems }] }`. */
export function validateCatalog(dishes = DISHES) {
  const problems = [];
  for (const [id, d] of Object.entries(dishes)) {
    const p = dishProblems(d);
    if (p.length) problems.push({ dishId: id, problems: p });
  }
  return { ok: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------------------------
// F12: từ ngữ y khoa. Mẫu lấy từ ai-engine/src/guardrails/chefReason.ts (BANNED), chép sang để web tự kiểm.

export const BANNED_WORDING = [
  { re: /(^|[^\p{L}])AI([^\p{L}]|$)/u, why: 'chứa chữ "AI"' },
  { re: /trí tuệ nhân tạo|thuật toán|\bchatbot\b|\bGPT\b|\bGemini\b|\bLLM\b/iu, why: 'nhắc đến công nghệ thay vì Đầu bếp' },
  { re: /100\s*%\s*sạch/iu, why: 'cam kết "100% sạch"' },
  {
    re: /chữa|điều trị|đặc trị|trị bệnh|khỏi bệnh|ngừa (bệnh|ung thư)|phòng (bệnh|ung thư)|hạ (đường|huyết áp)|giảm cân nhanh|detox|thần dược/iu,
    why: 'lời hứa y tế'
  },
  // Mở rộng cho web: khẳng định "lý tưởng cho người bệnh / giảm cân" và nhãn gắn tên bệnh.
  { re: /lý tưởng cho (người )?(giảm cân|giảm mỡ|tiểu đường|gout|gút|tim mạch|bệnh)/iu, why: 'khẳng định phù hợp với bệnh/giảm cân' },
  { re: /(^|[^\p{L}])bệnh (gout|gút|tiểu đường|tim mạch|dạ dày)/iu, why: 'nhãn gắn tên bệnh' },
  { re: /người (bị )?(gout|gút|tiểu đường|tim mạch)/iu, why: 'nhãn gắn tên bệnh' }
];

/** Các lý do vi phạm của một đoạn chữ (rỗng nếu sạch). */
export function bannedWordingProblems(text) {
  if (typeof text !== 'string') return [];
  return BANNED_WORDING.filter((b) => b.re.test(text)).map((b) => b.why);
}

/** Đoạn chữ có chứa từ cấm không. */
export const hasBannedWording = (text) => bannedWordingProblems(text).length > 0;

/** Chữ khách nhìn thấy của một món (tên, câu chuyện, ghi chú, quy cách, các bước nấu). */
function customerTexts(d) {
  const ps = d.portion_specs || {};
  return [d.name, d.terroir_story, d.chef_note, d.spec, ps.size_detail, ps.storage_guide, ...(Array.isArray(d.cooking_steps) ? d.cooking_steps : [])];
}

/** Quét chữ khách thấy của cả danh mục: trả `{ ok, problems: [{ dishId, text, why }] }`. */
export function validateCatalogWording(dishes = DISHES) {
  const problems = [];
  for (const [id, d] of Object.entries(dishes)) {
    for (const text of customerTexts(d)) {
      for (const why of bannedWordingProblems(text)) problems.push({ dishId: id, text, why });
    }
  }
  return { ok: problems.length === 0, problems };
}
