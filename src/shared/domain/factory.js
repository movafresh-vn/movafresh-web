import { BUSINESS } from '../config/business';
import { DISHES, SKUS, SAUCES } from '../data/catalog';
import { packingOf } from '../data/packaging';
import { SOURCES, SOURCE_KINDS } from '../data/sources';
import { aggregateBom } from './bom';
import { cutoffAtFor } from './delivery';
import { mealPriceVnd, swapOptionsFor } from './mealPlan';
import { addDays, atDay, dayKey, dowOfKey } from '../utils/time';

/**
 * Nghiệp vụ xưởng Đắk Lắk (P2A), toàn bộ là hàm thuần để test và để app vận hành dùng chung với lớp API.
 * - Phiếu nhặt từng đơn (túi theo SKU, túi xốt), nhu cầu theo ngày và chuyến xe, dự kiến nhiều ngày.
 * - Phiếu sản xuất 3 bảng theo mẫu BATCH-TEST của platform.
 * - "Lát cắt" db.factory và các hàm ghi (applyFactoryOp) chạy y hệt ở server và ở máy xưởng (xem lớp phủ offline).
 * Dữ liệu ở đây không bao giờ chứa tên, SĐT, địa chỉ hay mã khách: chỉ mã đơn, khu, khung giờ.
 */

export const FACTORY_SUPPLIER = 'S-FACTORY';
export const HUB_SUPPLIER = 'S-SEAFOOD';

/** Đơn còn sản xuất được: loại các đơn đã hủy, tạm hoãn. */
const DEAD_ORDER = ['cancelled', 'postponed', 'skipped_unpaid'];
/** Đơn chưa chốt sổ nhưng nhiều khả năng sẽ sản xuất (để dự kiến). */
const LIVE_ORDER = ['scheduled', 'paid', 'charge_failed'];

const TEMP_ORDER = { chill: 0, frozen: 1, ambient: 2 };

// ---------------------------------------------------------------------------------------------
// Danh mục xưởng

/** Thông tin một mặt hàng xưởng đếm: SKU hoặc gói xốt. */
export function itemInfo(key) {
  const sauce = SAUCES[key];
  if (sauce) {
    return { key, type: 'sauce', name: sauce.name, temp: 'chill', bagGrams: sauce.grams, shelfDays: sauce.shelfLifeDays, prep: '', hub: false, requiresLot: false };
  }
  const sku = SKUS[key];
  if (!sku) return null;
  const p = packingOf(key);
  return {
    key,
    type: 'sku',
    name: sku.name,
    temp: sku.temp,
    bagGrams: p.bagGrams,
    shelfDays: p.shelfDays,
    prep: p.prep,
    hub: sku.supplierId === HUB_SUPPLIER,
    requiresLot: Boolean(sku.requiresLot)
  };
}

/** SKU xưởng Đắk Lắk tự đóng (không gồm hải sản kho phụ và bao bì). */
export const isFactorySku = (key) => Boolean(SKUS[key]) && SKUS[key].supplierId === FACTORY_SUPPLIER;
export const isFactoryItem = (key) => Boolean(SAUCES[key]) || isFactorySku(key);

export function factoryCatalog(cfg = BUSINESS) {
  const items = {};
  for (const id of Object.keys(SKUS)) if (isFactorySku(id) || SKUS[id].supplierId === HUB_SUPPLIER) items[id] = itemInfo(id);
  for (const id of Object.keys(SAUCES)) items[id] = itemInfo(id);
  return {
    items,
    sources: Object.values(SOURCES),
    sourceKinds: SOURCE_KINDS,
    trips: cfg.factory.trips,
    stickers: cfg.stickers,
    temperature: cfg.temperature,
    quickAdds: cfg.factory.quickAdds,
    photoMaxPx: cfg.factory.photoMaxPx
  };
}

/** Số túi cho một lượng gram của SKU (làm tròn lên; có nhu cầu thì ít nhất 1 túi). */
export function bagsFor(key, grams) {
  const info = itemInfo(key);
  if (!info || grams <= 0) return 0;
  return Math.max(1, Math.ceil(grams / info.bagGrams - 1e-9));
}

// ---------------------------------------------------------------------------------------------
// Chuyến xe

export const tripOf = (tripId, cfg = BUSINESS) => cfg.factory.trips.find((t) => t.id === tripId) || null;

export function tripForSlot(slotId, cfg = BUSINESS) {
  const trips = cfg.factory.trips;
  return trips.find((t) => t.slotIds.includes(slotId)) || trips[trips.length - 1];
}

/** Giờ xe rời xưởng: ngày D-1 của ngày giao. */
export function tripDepartAt(day, trip) {
  return atDay(addDays(day, -1), trip.departHour, trip.departMin || 0);
}

export const scopeKey = (day, tripId) => `${day}|${tripId}`;

// ---------------------------------------------------------------------------------------------
// Phiếu nhặt từng đơn và nhu cầu theo ngày

/**
 * Phiếu nhặt của một đơn (một thùng): mỗi SKU là bao nhiêu túi cỡ chuẩn, mỗi mã xốt bao nhiêu túi.
 * Hải sản (`hub: true`) do kho phụ TP.HCM ghép nên không nằm trong số túi của xưởng.
 * Không có trường nào của khách.
 */
export function orderPackList(order, cfg = BUSINESS) {
  const bom = aggregateBom([order], DISHES);
  const items = [];
  for (const [key, grams] of Object.entries(bom.skuGrams)) {
    const info = itemInfo(key);
    items.push({ key, type: 'sku', name: info.name, temp: info.temp, grams, bags: bagsFor(key, grams), bagGrams: info.bagGrams, hub: info.hub });
  }
  for (const [key, n] of Object.entries(bom.sauces)) {
    const info = itemInfo(key);
    items.push({ key, type: 'sauce', name: info.name, temp: 'chill', grams: n * info.bagGrams, bags: n, bagGrams: info.bagGrams, hub: false });
  }
  items.sort((a, b) => TEMP_ORDER[a.temp] - TEMP_ORDER[b.temp] || a.name.localeCompare(b.name, 'vi'));
  const bagsByTemp = { chill: 0, frozen: 0, ambient: 0 };
  for (const it of items) if (!it.hub) bagsByTemp[it.temp] += it.bags;
  return {
    orderId: order.id,
    zoneId: order.zoneId,
    slotId: order.slotId,
    deliveryDay: order.deliveryDay,
    deliveryAt: order.deliveryAt,
    status: order.status,
    tripId: tripForSlot(order.slotId, cfg).id,
    items,
    bagsByTemp,
    workshopBags: bagsByTemp.chill + bagsByTemp.frozen + bagsByTemp.ambient
  };
}

/** Cộng phiếu nhặt của nhiều đơn: số túi theo SKU, theo mã xốt, số thùng; hàng của kho phụ tách riêng. */
export function demandTotals(lists) {
  const items = {};
  const hub = {};
  for (const l of lists) {
    for (const it of l.items) {
      const target = it.hub ? hub : items;
      const t = (target[it.key] ||= { key: it.key, type: it.type, name: it.name, temp: it.temp, bagGrams: it.bagGrams, bags: 0, grams: 0 });
      t.bags += it.bags;
      t.grams += it.grams;
    }
  }
  return { boxes: lists.length, items, hub };
}

/** Sắp danh sách mặt hàng theo nhóm nhiệt rồi tên. */
export const sortedItems = (map) =>
  Object.values(map).sort((a, b) => TEMP_ORDER[a.temp] - TEMP_ORDER[b.temp] || (a.type === b.type ? 0 : a.type === 'sku' ? -1 : 1) || a.name.localeCompare(b.name, 'vi'));

/**
 * Nhu cầu từng ngày giao: ngày đã chốt lấy đúng các đơn trong kế hoạch sản xuất (theo `plan.orderIds`),
 * ngày chưa chốt lấy đơn còn hiệu lực để dự kiến.
 */
export function buildDemandDays(db, cfg = BUSINESS, { closedOnly = false } = {}) {
  const byId = new Map(db.orders.map((o) => [o.id, o]));
  const plans = new Map(db.productionPlans.map((p) => [p.day, p]));
  const days = [...new Set(db.orders.map((o) => o.deliveryDay))].sort().filter((d) => !closedOnly || plans.has(d));
  return days.map((day) => {
    const plan = plans.get(day) || null;
    const orders = plan
      ? plan.orderIds.map((id) => byId.get(id)).filter((o) => o && !DEAD_ORDER.includes(o.status))
      : db.orders.filter((o) => o.deliveryDay === day && LIVE_ORDER.includes(o.status));
    const lists = orders.map((o) => orderPackList(o, cfg));
    return {
      day,
      closed: Boolean(plan),
      plan,
      cutoffAt: cutoffAtFor(day, cfg).toISOString(),
      lists,
      bom: plan ? plan.bom : aggregateBom(orders, DISHES),
      totals: demandTotals(lists)
    };
  });
}

/** Thứ Hai của tuần chứa `key`. */
export const weekStartOf = (key) => addDays(key, -((dowOfKey(key) + 6) % 7));

/** `weeks` tuần liên tiếp tính từ tuần chứa `fromKey`: [{ start, end }]. */
export function weekRanges(fromKey, weeks = 4) {
  const start = weekStartOf(fromKey);
  return Array.from({ length: weeks }, (_, i) => ({ start: addDays(start, i * 7), end: addDays(start, i * 7 + 6) }));
}

/** Cộng tổng nhu cầu của các ngày thuộc [start, end]: gram nguyên liệu, túi theo SKU và xốt, và phần đã chốt. */
export function sumDays(demandDays, start, end) {
  const out = { days: [], boxes: 0, skuGrams: {}, sauces: {}, items: {}, closedGrams: {}, closedBoxes: 0 };
  for (const d of demandDays) {
    if (d.day < start || d.day > end) continue;
    out.days.push(d.day);
    out.boxes += d.totals.boxes;
    if (d.closed) out.closedBoxes += d.totals.boxes;
    for (const [sku, g] of Object.entries(d.bom.skuGrams)) {
      out.skuGrams[sku] = (out.skuGrams[sku] || 0) + g;
      if (d.closed) out.closedGrams[sku] = (out.closedGrams[sku] || 0) + g;
    }
    for (const [code, n] of Object.entries(d.bom.sauces)) out.sauces[code] = (out.sauces[code] || 0) + n;
    for (const [key, t] of Object.entries(d.totals.items)) {
      const x = (out.items[key] ||= { key, name: t.name, temp: t.temp, type: t.type, bagGrams: t.bagGrams, bags: 0, grams: 0 });
      x.bags += t.bags;
      x.grams += t.grams;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Phiếu sản xuất 3 bảng (mẫu BATCH-TEST của platform/docs/factory-requests)

const r1 = (n) => Math.round(n * 10) / 10;
const TEMP_LABEL = { chill: 'Ngăn mát', frozen: 'Ngăn đông', ambient: 'Nhiệt độ thường' };
export const tempLabel = (t) => TEMP_LABEL[t] || t;

/**
 * Dựng phiếu sản xuất của một ngày giao.
 * - Bảng 1: nguyên liệu thô sơ chế tại Đắk Lắk (kg, quy cách sơ chế, cỡ túi và số túi).
 * - Bảng 2: gói xốt theo mã (định lượng, số túi, hạn dùng).
 * - Bảng 3: hải sản ghép ở kho phụ TP.HCM.
 * bagsBySku: số túi tính theo từng đơn (nếu có); không có thì làm tròn từ tổng gram.
 */
export function buildProductionSheet({ day, bom, bagsBySku = {}, boxes, closedAt = null, status = 'closed', skipped = 0 }) {
  const table1 = [];
  const table3 = [];
  for (const [key, grams] of Object.entries(bom.skuGrams).sort(([a], [b]) => a.localeCompare(b))) {
    const info = itemInfo(key);
    if (!info) continue;
    if (info.hub) {
      table3.push({ code: key, name: info.name, spec: info.prep, unit: 'kg', qtyKg: r1(grams / 1000) });
    } else if (isFactorySku(key)) {
      const bags = bagsBySku[key] != null ? bagsBySku[key] : bagsFor(key, grams);
      table1.push({
        code: key, name: info.name, prep: info.prep, unit: 'kg', qtyKg: r1(grams / 1000), temp: info.temp,
        bagGrams: info.bagGrams, bags, packNote: `Túi ${info.bagGrams}g × ${bags} túi (${tempLabel(info.temp)})`
      });
    }
  }
  const table2 = Object.entries(bom.sauces)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, bags]) => {
      const s = SAUCES[code];
      return { code, name: s.name, grams: s.grams, bags, shelf: `${s.shelfLifeDays} ngày (${tempLabel('chill')})` };
    });
  return {
    code: `BATCH-${day.replace(/-/g, '')}`,
    day,
    status,
    closedAt,
    boxes,
    skippedUnpaid: skipped,
    table1,
    table2,
    table3
  };
}

// ---------------------------------------------------------------------------------------------
// Lát cắt db.factory và hàm ghi

export const emptyFactory = () => ({
  progress: {}, // { 'day|tripId': { [key]: số túi đã làm } }
  receipts: [], // nhận nguyên liệu: mỗi lần nhận một mã lô
  batches: [], // mẻ túi đã gán lô, đã in nhãn
  boxes: {}, // { orderId: { ticks: { [key]: n }, startedAt, packedAt } }
  loads: {}, // { 'day|tripId': { loaded: { orderId: at }, tempC, sealNo, departedAt, missing[], tempOk } }
  shortages: [], // báo thiếu / hỏng
  capacity: {}, // { weekStart: { [key]: { status: 'ok'|'short', shortBags, at } } }
  opIds: [] // mã thao tác đã áp, để khử trùng khi máy xưởng gửi lại
});

const MAX_OP_IDS = 800;
const ok = (extra = {}) => ({ ok: true, ...extra });
const bad = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });

export const FACTORY_ERRORS = {
  OP_INVALID: 'Thao tác không hợp lệ',
  LOT_CODE_TAKEN: 'Mã lô này đã có',
  LOT_REQUIRED: 'Bò và gạo bắt buộc gắn mã lô nguyên liệu',
  LOT_MISMATCH: 'Lô này không phải lô của nguyên liệu đang đóng',
  TEMP_OUT_OF_RANGE: 'Nhiệt độ vượt ngưỡng nên không thể chọn Đạt',
  BOXES_MISSING: 'Còn thùng chưa lên xe',
  TRIP_DEPARTED: 'Chuyến xe đã xuất bến'
};

const posInt = (n) => Number.isInteger(n) && n > 0;
const str = (s) => typeof s === 'string' && s.trim().length > 0;

/** Nhiệt độ nhận hàng có nằm trong ngưỡng của nhóm nhiệt không. */
export function isTempOk(skuId, tempC, cfg = BUSINESS) {
  const t = SKUS[skuId] && SKUS[skuId].temp;
  if (typeof tempC !== 'number' || Number.isNaN(tempC)) return false;
  if (t === 'chill') return tempC <= cfg.temperature.chill.max;
  if (t === 'frozen') return tempC <= cfg.temperature.frozen.max;
  return true;
}

const HANDLERS = {
  /** Ghi số túi / túi xốt đã làm: delta (cộng thêm, có thể âm để sửa) hoặc set (đặt lại). */
  progress(f, op) {
    if (!str(op.scope) || !isFactoryItem(op.key)) return bad('OP_INVALID', 'Thiếu chuyến hoặc mặt hàng');
    const bucket = (f.progress[op.scope] ||= {});
    const cur = bucket[op.key] || 0;
    let next;
    if (op.set != null) {
      if (!Number.isInteger(op.set) || op.set < 0) return bad('OP_INVALID', 'Số lượng không hợp lệ');
      next = op.set;
    } else {
      if (!Number.isInteger(op.delta) || op.delta === 0) return bad('OP_INVALID', 'Số lượng không hợp lệ');
      next = cur + op.delta;
    }
    bucket[op.key] = Math.max(0, next);
    return ok();
  },

  /** Nhận nguyên liệu: nguồn, khối lượng, nhiệt độ, ảnh, Đạt / Không đạt, mã lô. */
  receipt(f, op, cfg) {
    if (!isFactorySku(op.sku)) return bad('OP_INVALID', 'Nguyên liệu không có trong danh mục xưởng');
    const src = SOURCES[op.sourceId];
    if (!src) return bad('OP_INVALID', 'Chọn nguồn nguyên liệu');
    if (!(typeof op.weightKg === 'number' && op.weightKg > 0)) return bad('OP_INVALID', 'Nhập khối lượng nhận');
    if (typeof op.tempC !== 'number' || Number.isNaN(op.tempC)) return bad('OP_INVALID', 'Nhập nhiệt độ lúc nhận');
    if (!str(op.photo)) return bad('OP_INVALID', 'Cần 1 ảnh lô hàng');
    if (!/^MOVA-TRACE-[A-Z0-9-]{4,}$/.test(String(op.lotCode || ''))) return bad('OP_INVALID', 'Mã lô không hợp lệ');
    if (!['pass', 'fail'].includes(op.verdict)) return bad('OP_INVALID', 'Chọn Đạt hoặc Không đạt');
    if (op.verdict === 'fail' && !str(op.failReason)) return bad('OP_INVALID', 'Ghi lý do không đạt');
    const tempOk = isTempOk(op.sku, op.tempC, cfg);
    if (op.verdict === 'pass' && !tempOk) return bad('TEMP_OUT_OF_RANGE');
    if (f.receipts.some((r) => r.lotCode === op.lotCode)) return bad('LOT_CODE_TAKEN');
    f.receipts.push({
      lotCode: op.lotCode, sku: op.sku, sourceId: src.id, sourceKind: src.kind, sourceName: src.name, location: src.location, region: src.region,
      weightKg: op.weightKg, tempC: op.tempC, tempOk, photo: op.photo, verdict: op.verdict, failReason: op.verdict === 'fail' ? op.failReason.trim() : '',
      at: op.at
    });
    return ok();
  },

  /** Mẻ túi: số túi của một SKU (hoặc mã xốt) gán một lô nguyên liệu; từ đó in nhãn túi. */
  batch(f, op) {
    const info = itemInfo(op.key);
    if (!info || info.hub) return bad('OP_INVALID', 'Mặt hàng không đóng ở xưởng');
    if (!posInt(op.bags)) return bad('OP_INVALID', 'Nhập số túi của mẻ');
    if (!str(op.id)) return bad('OP_INVALID', 'Thiếu mã mẻ');
    if (f.batches.some((b) => b.id === op.id)) return bad('OP_INVALID', 'Mã mẻ đã có');
    let lotCode = null;
    if (info.type === 'sku') {
      if (op.lotCode) {
        const lot = f.receipts.find((r) => r.lotCode === op.lotCode && r.verdict === 'pass');
        if (!lot) return bad('LOT_MISMATCH', 'Không tìm thấy lô đạt này');
        if (lot.sku !== op.key) return bad('LOT_MISMATCH');
        lotCode = lot.lotCode;
      } else if (info.requiresLot) {
        return bad('LOT_REQUIRED');
      }
    }
    f.batches.push({
      id: op.id, key: op.key, type: info.type, bags: op.bags, bagGrams: info.bagGrams, lotCode,
      producedAt: op.at, expiresAt: op.expiresAt || null, scope: op.scope || null, labelsPrintedAt: null
    });
    return ok();
  },

  printed(f, op) {
    const b = f.batches.find((x) => x.id === op.batchId);
    if (!b) return bad('OP_INVALID', 'Không tìm thấy mẻ');
    b.labelsPrintedAt = op.at;
    return ok();
  },

  /** Tích từng túi vào thùng của một đơn: đặt số túi đã tích của một mặt hàng. */
  tick(f, op) {
    if (!str(op.orderId) || !itemInfo(op.key) || !Number.isInteger(op.count) || op.count < 0) return bad('OP_INVALID', 'Tích túi không hợp lệ');
    const box = (f.boxes[op.orderId] ||= { ticks: {}, startedAt: null, packedAt: null });
    if (box.packedAt) return bad('OP_INVALID', 'Thùng đã đóng, mở lại thùng nếu cần sửa');
    box.ticks[op.key] = op.count;
    box.startedAt ||= op.at;
    return ok();
  },

  closeBox(f, op) {
    if (!str(op.orderId)) return bad('OP_INVALID', 'Thiếu mã đơn');
    const box = (f.boxes[op.orderId] ||= { ticks: {}, startedAt: op.at, packedAt: null });
    box.packedAt = op.at;
    return ok();
  },

  reopenBox(f, op) {
    const box = f.boxes[op.orderId];
    if (!box) return bad('OP_INVALID', 'Thùng chưa có');
    const loaded = Object.values(f.loads).some((l) => l.loaded && l.loaded[op.orderId]);
    if (loaded) return bad('OP_INVALID', 'Thùng đã lên xe, bỏ khỏi xe trước khi mở lại');
    box.packedAt = null;
    return ok();
  },

  /** Quét / tích thùng lên xe (loaded: true) hoặc bỏ khỏi xe (false). */
  load(f, op) {
    if (!str(op.scope) || !str(op.orderId)) return bad('OP_INVALID', 'Thiếu chuyến hoặc mã đơn');
    const l = (f.loads[op.scope] ||= { loaded: {}, tempC: null, sealNo: '', departedAt: null, missing: [], tempOk: null });
    if (l.departedAt) return bad('TRIP_DEPARTED');
    if (op.loaded === false) delete l.loaded[op.orderId];
    else l.loaded[op.orderId] = op.at;
    return ok();
  },

  /** Xuất xe: nhiệt độ thùng xe, số niêm phong, giờ xuất. Thiếu thùng thì phải xác nhận. */
  depart(f, op, cfg) {
    if (!str(op.scope)) return bad('OP_INVALID', 'Thiếu chuyến');
    const l = (f.loads[op.scope] ||= { loaded: {}, tempC: null, sealNo: '', departedAt: null, missing: [], tempOk: null });
    if (l.departedAt) return bad('TRIP_DEPARTED');
    if (typeof op.tempC !== 'number' || Number.isNaN(op.tempC)) return bad('OP_INVALID', 'Nhập nhiệt độ thùng xe');
    if (!str(op.sealNo)) return bad('OP_INVALID', 'Nhập số niêm phong');
    const expected = Array.isArray(op.expected) ? op.expected : Object.keys(l.loaded);
    const missing = expected.filter((id) => !l.loaded[id]);
    if (missing.length && !op.confirmMissing) return bad('BOXES_MISSING', `Còn ${missing.length} thùng chưa lên xe`, { missing });
    l.tempC = op.tempC;
    l.sealNo = op.sealNo.trim();
    l.departedAt = op.at;
    l.missing = missing;
    l.tempOk = op.tempC <= cfg.temperature.chill.max;
    if (op.photo) l.photo = op.photo;
    return ok();
  },

  /** Xưởng xác nhận năng lực cho tuần sau theo SKU: đủ, hoặc thiếu bao nhiêu túi. */
  capacity(f, op) {
    if (!str(op.weekStart) || !itemInfo(op.key)) return bad('OP_INVALID', 'Thiếu tuần hoặc mặt hàng');
    if (!['ok', 'short'].includes(op.status)) return bad('OP_INVALID', 'Trạng thái không hợp lệ');
    if (op.status === 'short' && !posInt(op.shortBags)) return bad('OP_INVALID', 'Nhập số túi thiếu');
    (f.capacity[op.weekStart] ||= {})[op.key] = { status: op.status, shortBags: op.status === 'short' ? op.shortBags : 0, at: op.at };
    return ok();
  },

  /** Báo thiếu / hỏng: mặt hàng, số lượng (túi hoặc kg), ảnh. */
  shortage(f, op) {
    if (!isFactoryItem(op.key)) return bad('OP_INVALID', 'Chọn mặt hàng của xưởng');
    if (!(typeof op.qty === 'number' && op.qty > 0)) return bad('OP_INVALID', 'Nhập số lượng thiếu / hỏng');
    if (!['bag', 'kg'].includes(op.unit)) return bad('OP_INVALID', 'Chọn đơn vị');
    if (!['short', 'damaged'].includes(op.kind)) return bad('OP_INVALID', 'Chọn thiếu hay hỏng');
    if (op.kind === 'damaged' && !str(op.photo)) return bad('OP_INVALID', 'Hàng hỏng cần 1 ảnh');
    if (!str(op.id) || !str(op.day)) return bad('OP_INVALID', 'Thiếu mã báo cáo hoặc ngày giao');
    if (f.shortages.some((s) => s.id === op.id)) return bad('OP_INVALID', 'Mã báo cáo đã có');
    f.shortages.push({
      id: op.id, key: op.key, qty: op.qty, unit: op.unit, kind: op.kind, note: op.note || '', photo: op.photo || null,
      day: op.day, at: op.at, status: 'open', handled: []
    });
    return ok();
  },

  closeShortage(f, op) {
    const s = f.shortages.find((x) => x.id === op.id);
    if (!s) return bad('OP_INVALID', 'Không tìm thấy báo cáo');
    s.status = 'closed';
    return ok();
  }
};

/**
 * Áp một thao tác vào lát cắt `factory` (thay đổi tại chỗ). op = { type, opId, at, ...tham số }.
 * Cùng một hàm chạy ở server (ghi thật) và ở máy xưởng (lớp phủ "chưa gửi"), nên màn hình luôn khớp với kết quả sau khi gửi.
 * Cùng opId chỉ áp một lần.
 */
export function applyFactoryOp(f, op, cfg = BUSINESS) {
  if (!op || typeof op.type !== 'string' || !HANDLERS[op.type]) return bad('OP_INVALID', FACTORY_ERRORS.OP_INVALID);
  if (op.opId && f.opIds.includes(op.opId)) return ok({ duplicate: true });
  const res = HANDLERS[op.type](f, op, cfg);
  if (res.ok && op.opId) {
    f.opIds.push(op.opId);
    if (f.opIds.length > MAX_OP_IDS) f.opIds.splice(0, f.opIds.length - MAX_OP_IDS);
  }
  if (!res.ok && !res.message) res.message = FACTORY_ERRORS[res.code] || res.code;
  return res;
}

const clone = (x) => JSON.parse(JSON.stringify(x));

/** Lát cắt đã cộng các thao tác chưa gửi (để màn hình xưởng thấy ngay kết quả khi mất mạng). Không thay đổi bản gốc. */
export function overlayFactory(factory, ops, cfg = BUSINESS) {
  const f = clone({ ...emptyFactory(), ...factory });
  for (const op of ops) applyFactoryOp(f, op, cfg);
  return f;
}

// ---------------------------------------------------------------------------------------------
// Số liệu hiển thị

/** Các dòng "đã làm / cần làm" của một chuyến: túi theo SKU và túi xốt theo mã. */
export function progressLines(totals, bucket = {}) {
  return sortedItems(totals.items).map((t) => ({
    key: t.key, type: t.type, name: t.name, temp: t.temp, bagGrams: t.bagGrams,
    need: t.bags, done: bucket[t.key] || 0, kg: r1((t.bags * t.bagGrams) / 1000)
  }));
}

/** Tiến độ đóng thùng của một đơn: số túi đã tích / cần tích. */
export function boxProgress(list, box) {
  const ticks = (box && box.ticks) || {};
  let total = 0;
  let done = 0;
  for (const it of list.items) {
    if (it.hub) continue;
    total += it.bags;
    done += Math.min(ticks[it.key] || 0, it.bags);
  }
  return { total, done, complete: total > 0 && done >= total, packed: Boolean(box && box.packedAt) };
}

/** Số túi đã làm còn lại để đóng thùng / gán lô: đã làm trừ đã gán lô. */
export function unbatchedBags(bucket, batches, key, scope = null) {
  const made = bucket[key] || 0;
  const batched = batches.filter((b) => b.key === key && (!scope || b.scope === scope)).reduce((s, b) => s + b.bags, 0);
  return Math.max(0, made - batched);
}

/** Khối lượng nguyên liệu thô của lô đã dùng (kg), tính ngược từ số túi thành phẩm và tỷ lệ thu hồi sơ chế. */
export function lotUsedKg(lotCode, batches, skuId) {
  const yieldRate = (SKUS[skuId] && SKUS[skuId].yield) || 1;
  return r1(batches.filter((b) => b.lotCode === lotCode).reduce((s, b) => s + (b.bags * b.bagGrams) / 1000 / yieldRate, 0));
}

// ---------------------------------------------------------------------------------------------
// Mã lô, mã mẻ, hạn dùng (sinh trên máy xưởng nên chạy được khi mất mạng)

const ym = (iso) => dayKey(new Date(iso)).slice(0, 7).replace('-', '');
const ymd = (iso) => dayKey(new Date(iso)).replace(/-/g, '');

/** Mã lô nguyên liệu kế tiếp, dạng MOVA-TRACE-BO-202611-0914 (nối số thứ tự của các lô đã có trong tháng). */
export function nextLotCode(skuId, existingCodes, atIso) {
  const seg = skuId.split('-')[1];
  const prefix = `MOVA-TRACE-${seg}-${ym(atIso)}-`;
  let max = 0;
  for (const c of existingCodes) {
    if (typeof c === 'string' && c.startsWith(prefix)) max = Math.max(max, parseInt(c.slice(prefix.length), 10) || 0);
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

/** Mã mẻ / báo cáo kế tiếp theo ngày: B-20261117-001, SH-20261117-001. */
export function nextDailyId(prefix, existingIds, atIso) {
  const base = `${prefix}-${ymd(atIso)}-`;
  let max = 0;
  for (const id of existingIds) if (typeof id === 'string' && id.startsWith(base)) max = Math.max(max, parseInt(id.slice(base.length), 10) || 0);
  return `${base}${String(max + 1).padStart(3, '0')}`;
}

/** Hạn dùng của túi đóng lúc `producedIso` (cuối ngày thứ `shelfDays`). */
export function expiryOf(key, producedIso) {
  const info = itemInfo(key);
  const days = (info && info.shelfDays) || 3;
  return new Date(atDay(addDays(dayKey(new Date(producedIso)), days), 23, 59).getTime()).toISOString();
}

// ---------------------------------------------------------------------------------------------
// Báo thiếu / hỏng: đơn bị ảnh hưởng và món thay

const dishUses = (dishId, key) => {
  const d = DISHES[dishId];
  return Boolean(d) && (d.sauce === key || d.bom.some((b) => b.sku === key));
};

/** Gram của một mặt hàng trong đơn (xốt: số túi × định lượng). */
function gramsOfItem(order, key) {
  const bom = aggregateBom([order], DISHES);
  if (SAUCES[key]) return (bom.sauces[key] || 0) * SAUCES[key].grams;
  return bom.skuGrams[key] || 0;
}

/** Gram của một mặt hàng trong MỘT món của một bữa (xốt: định lượng một túi). */
export function dishItemGrams(dishId, key, meal, people) {
  const d = DISHES[dishId];
  if (!d) return 0;
  if (SAUCES[key]) return d.sauce === key ? SAUCES[key].grams : 0;
  const entry = d.bom.find((b) => b.sku === key);
  if (!entry) return 0;
  const factor = d.kind === 'protein' ? meal.proteinFactor || 1 : d.kind === 'carb' ? meal.carbFactor || 1 : d.kind === 'veg' ? meal.vegFactor || 1 : 1;
  return Math.round(entry.gramsPerPerson * people * factor);
}

/** Lượng thiếu quy ra gram. */
export function shortageGrams(shortage) {
  const info = itemInfo(shortage.key);
  return shortage.unit === 'kg' ? shortage.qty * 1000 : shortage.qty * info.bagGrams;
}

/**
 * Các món trong đơn dùng mặt hàng `key` và món thay đề xuất cho từng món (cùng loại, không dùng mặt hàng đang thiếu,
 * tôn trọng kiêng cữ của khách đọc ở server, ưu tiên món không đắt hơn và gần giá nhất). Dùng cho báo thiếu / hỏng
 * của xưởng, PO nhà cung cấp xác nhận thiếu và thu hồi lô. Không trả thông tin khách.
 */
export function substitutionHits(db, order, key, blockedKeys = [key]) {
  const profile = db.profiles.find((p) => p.customerId === order.customerId);
  const restrictions = (profile && profile.restrictions) || [];
  const hits = [];
  for (const meal of order.meals) {
    for (const [kind, dishId] of Object.entries(meal.dishes)) {
      if (!dishUses(dishId, key)) continue;
      const before = mealPriceVnd(meal, order.householdSize);
      const options = swapOptionsFor(meal, kind, restrictions)
        .filter((d) => d.id !== dishId && !blockedKeys.some((k) => dishUses(d.id, k)))
        .map((d) => {
          const after = mealPriceVnd({ ...meal, dishes: { ...meal.dishes, [kind]: d.id } }, order.householdSize);
          return { dishId: d.id, name: d.name, priceDeltaVnd: after - before, compensationVnd: Math.max(0, before - after) };
        })
        .sort((a, b) => (a.priceDeltaVnd > 0) - (b.priceDeltaVnd > 0) || Math.abs(a.priceDeltaVnd) - Math.abs(b.priceDeltaVnd));
      hits.push({
        mealIndex: meal.index, kind, dishId, dishName: DISHES[dishId].name,
        options: options.slice(0, 5), suggestedDishId: options.length ? options[0].dishId : null
      });
    }
  }
  return hits;
}

/**
 * Các đơn bị ảnh hưởng bởi một báo cáo thiếu / hỏng và món thay đề xuất.
 * Đơn của ngày giao đã chốt, chưa lên xe, có món dùng mặt hàng thiếu; lấy đơn giao muộn nhất trước cho tới khi đủ lượng thiếu.
 * Món thay: cùng loại, không dùng mặt hàng đang thiếu, tôn trọng kiêng cữ của khách (đọc ở server, không trả ra ngoài),
 * ưu tiên món không đắt hơn món cũ và gần giá nhất. Trả về không có thông tin khách.
 */
export function shortageImpact(db, shortage, cfg = BUSINESS) {
  const need = shortageGrams(shortage) - shortage.handled.reduce((s, h) => s + (h.grams || 0), 0);
  const plan = db.productionPlans.find((p) => p.day === shortage.day);
  const f = db.factory || emptyFactory();
  const loadedIds = new Set();
  for (const [scope, l] of Object.entries(f.loads)) if (scope.startsWith(`${shortage.day}|`)) Object.keys(l.loaded || {}).forEach((id) => loadedIds.add(id));
  const blocked = [shortage.key, ...f.shortages.filter((s) => s.status === 'open' && s.id !== shortage.id && s.day === shortage.day).map((s) => s.key)];
  const byId = new Map(db.orders.map((o) => [o.id, o]));

  const candidates = (plan ? plan.orderIds : [])
    .map((id) => byId.get(id))
    .filter((o) => o && ['locked', 'in_production'].includes(o.status) && !loadedIds.has(o.id))
    .map((o) => ({ order: o, grams: gramsOfItem(o, shortage.key) }))
    .filter((c) => c.grams > 0)
    .sort((a, b) => Date.parse(b.order.deliveryAt) - Date.parse(a.order.deliveryAt) || b.order.id.localeCompare(a.order.id));

  const affected = [];
  let covered = 0;
  for (const { order, grams } of candidates) {
    if (covered >= Math.max(need, 0)) break;
    const hits = substitutionHits(db, order, shortage.key, blocked);
    if (!hits.length) continue;
    affected.push({
      orderId: order.id, zoneId: order.zoneId, slotId: order.slotId, tripId: tripForSlot(order.slotId, cfg).id,
      deliveryDay: order.deliveryDay, grams, hits
    });
    covered += grams;
  }
  return { shortageId: shortage.id, key: shortage.key, needGrams: Math.max(need, 0), coveredGrams: covered, affected, handled: shortage.handled };
}

