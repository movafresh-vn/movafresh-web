import { computed, ref, shallowRef } from 'vue';
import { api } from '../shared/api';
import { ctx } from './session';
import { online, onQueueChange, pendingOps } from './queue';
import { BUSINESS } from '../shared/config/business';
import { demandTotals, emptyFactory, overlayFactory, progressLines, scopeKey } from '../shared/domain/factory';
import { labelsByOrder } from './labelData';

/**
 * Trạng thái dùng chung của các màn xưởng: ngày giao và chuyến xe đang chọn, ảnh chụp dữ liệu từ server,
 * và dữ liệu hiển thị = ảnh chụp + các thao tác chưa gửi (lớp phủ). Mất mạng thì không tải lại từ server,
 * màn hình vẫn đúng nhờ lớp phủ; có mạng lại thì gửi xong sẽ tải lại.
 */

export const catalog = shallowRef(null);
export const snapshot = shallowRef(null);
export const selDay = ref(null);
export const selTrip = ref(null);
export const loadError = ref('');
/** Nhãn thùng theo mã đơn của ngày đang chọn (Order_Code, Batch_ID, Route_ID, Lot_IDs; không có thông tin khách). */
export const labels = shallowRef({});

export async function loadCatalog() {
  if (!catalog.value && ctx.value) catalog.value = await api.ops.factory.catalog(ctx.value);
}

/** Nhãn của lô đang chọn. Chưa có lô hoặc lỗi thì để trống: màn in nhãn vẫn dùng được phần còn lại. */
async function loadLabels(day) {
  if (!day) {
    labels.value = {};
    return;
  }
  try {
    labels.value = labelsByOrder(await api.ops.batches.labels(ctx.value, day));
  } catch {
    labels.value = {};
  }
}

function pickTrip(snap) {
  const trips = snap.trips || [];
  if (trips.some((t) => t.id === selTrip.value)) return;
  const next = trips.find((t) => t.boxes > 0 && !t.departedAt) || trips.find((t) => t.boxes > 0) || trips[0];
  selTrip.value = next ? next.id : null;
}

/** Tải lại ảnh chụp từ server (bỏ qua nếu đang mất mạng và đã có dữ liệu). */
export async function reload({ force = false } = {}) {
  if (!ctx.value) return;
  try {
    await loadCatalog();
    if (!force && !online.value && snapshot.value) return;
    const snap = await api.ops.factory.snapshot(ctx.value, selDay.value);
    snapshot.value = snap;
    selDay.value = snap.day;
    pickTrip(snap);
    loadError.value = '';
    await loadLabels(snap.day);
  } catch (e) {
    loadError.value = e.message;
  }
}

export function setDay(day) {
  selDay.value = day;
  selTrip.value = null;
  return reload({ force: true });
}

export function setTrip(id) {
  selTrip.value = id;
}

// Gửi xong một thao tác thì lấy lại dữ liệu server; hàng đợi đã bỏ mục đó trong cùng lượt nên không bị tính hai lần.
onQueueChange(() => reload({ force: online.value }));

/** Lát cắt db.factory đã cộng các thao tác chưa gửi. */
export const factory = computed(() => {
  const base = snapshot.value ? snapshot.value.factory : emptyFactory();
  return overlayFactory(base, pendingOps.value);
});

export const scope = computed(() => (selDay.value && selTrip.value ? scopeKey(selDay.value, selTrip.value) : null));

/** Phiếu nhặt của các đơn thuộc chuyến đang chọn. */
export const tripOrders = computed(() => (snapshot.value ? snapshot.value.orders.filter((o) => o.tripId === selTrip.value) : []));
export const tripTotals = computed(() => demandTotals(tripOrders.value));
export const tripProgress = computed(() => (scope.value && factory.value.progress[scope.value]) || {});
export const lines = computed(() => progressLines(tripTotals.value, tripProgress.value));

export const tripInfo = computed(() => {
  const snap = snapshot.value;
  if (!snap) return null;
  const t = snap.trips.find((x) => x.id === selTrip.value);
  return t || null;
});

/** Thông tin từng đơn trong chuyến kèm tiến độ đóng thùng và trạng thái lên xe (đã cộng lớp phủ). */
export const boxes = computed(() => {
  const f = factory.value;
  const load = (scope.value && f.loads[scope.value]) || { loaded: {}, departedAt: null };
  return tripOrders.value.map((o) => {
    const box = f.boxes[o.orderId] || { ticks: {}, startedAt: null, packedAt: null };
    return { list: o, box, loadedAt: load.loaded[o.orderId] || null };
  });
});

export const loadState = computed(() => (scope.value && factory.value.loads[scope.value]) || { loaded: {}, tempC: null, sealNo: '', departedAt: null, missing: [], tempOk: null });

// Tên khu và khung giờ lấy từ cấu hình kinh doanh (không phải dữ liệu khách)
const ZONES = Object.fromEntries(BUSINESS.zones.map((z) => [z.id, z]));
export const zoneName = (zoneId) => (ZONES[zoneId] ? ZONES[zoneId].name : zoneId);
export const slotLabel = (zoneId, slotId) => {
  const s = ZONES[zoneId] && ZONES[zoneId].slots.find((x) => x.id === slotId);
  return s ? s.label : slotId;
};
