import { ref, computed } from 'vue';
import { api } from '../shared/api';
import {
  QUEUE_KEY, enqueue, failedOf, flush, makeEntry, networkError, newOpId, parse, pendingOf, removeEntry, retryFailed, serialize
} from '../shared/domain/offlineQueue';
import { ctx } from './session';
import { serverNow } from '../shared/utils/time';
import { preparePhotos } from './queuePhotos';

/**
 * Hàng đợi thao tác của app vận hành. Mọi lần ghi của xưởng đi qua đây: lưu vào localStorage trước (nhãn "chưa gửi"),
 * rồi gửi khi có mạng; mất mạng thì giữ, có mạng lại (sự kiện `online`) tự gửi. Logic thuần ở domain/offlineQueue.js.
 */

const readStored = () => {
  try {
    return parse(localStorage.getItem(QUEUE_KEY));
  } catch {
    return [];
  }
};

export const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
export const items = ref(readStored());
export const flushing = ref(false);
export const saveError = ref('');

export const unsent = computed(() => items.value.filter((i) => i.status === 'pending'));
export const failed = computed(() => failedOf(items.value));

const listeners = new Set();
/** Gọi `fn` sau mỗi lần hàng đợi đổi (gửi xong một mục...). Trả về hàm hủy đăng ký. */
export function onQueueChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = () => listeners.forEach((fn) => fn());

function persist() {
  try {
    localStorage.setItem(QUEUE_KEY, serialize(items.value));
    saveError.value = '';
  } catch {
    saveError.value = 'Bộ nhớ máy đầy, thao tác chưa gửi có thể mất khi tắt trang. Hãy gửi hết rồi xóa bớt dữ liệu.';
  }
}

/** Thời điểm nghiệp vụ theo giờ máy chủ (độ lệch đã đồng bộ ở lần gọi summary gần nhất) để ghi giờ đúng lúc bấm, kể cả khi gửi muộn. */
export function clientNow() {
  return serverNow().toISOString();
}

/** Tải ảnh (data URL) của thao tác lên kho trước khi gửi; trả args mới hoặc null. Lỗi mạng thành NETWORK để hàng đợi giữ lại. */
async function prepare(entry) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw networkError();
  return preparePhotos(entry, (dataUrl, purpose) => api.ops.uploads.photo(ctx.value, dataUrl, purpose));
}

async function send(entry) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw networkError();
  const c = ctx.value;
  if (!c) throw networkError('Chưa đăng nhập');
  if (entry.call === 'factory.apply') return api.ops.factory.apply(c, entry.args);
  if (entry.call === 'substituteDish') return api.ops.substituteDish(c, entry.args);
  throw new Error(`Thao tác không biết: ${entry.call}`);
}

let rerun = false;

/** Gửi các thao tác đang chờ (nếu có mạng). An toàn khi gọi nhiều lần cùng lúc. */
export async function flushNow() {
  if (flushing.value) {
    rerun = true;
    return;
  }
  flushing.value = true;
  try {
    do {
      rerun = false;
      await flush({
        items: items.value,
        send,
        prepare,
        isOnline: () => online.value && (typeof navigator === 'undefined' || navigator.onLine !== false),
        onChange: (next, ev) => {
          if (ev.result === 'sent') items.value = removeEntry(items.value, ev.id);
          else {
            const upd = next.find((i) => i.id === ev.id);
            items.value = items.value.map((i) => (i.id === ev.id && upd ? upd : i));
          }
          persist();
          emit();
        }
      });
    } while (rerun);
  } finally {
    flushing.value = false;
    emit();
  }
}

/**
 * Xếp một thao tác vào hàng đợi và gửi ngay nếu có mạng.
 * call: 'factory.apply' (args = { type, ...}) hoặc 'substituteDish'. Trả về mã thao tác (opId).
 */
export function submit(call, args) {
  const id = newOpId('op');
  const entry = makeEntry({ id, call, args: { ...args, opId: id }, at: args.at || clientNow() });
  items.value = enqueue(items.value, entry);
  persist();
  emit();
  if (online.value) flushNow();
  return id;
}

/** Ghi một thao tác của xưởng (một cửa factory.apply). */
export const apply = (type, payload = {}) => submit('factory.apply', { type, ...payload, at: payload.at || clientNow() });

export function retryAll() {
  items.value = retryFailed(items.value);
  persist();
  emit();
  flushNow();
}

export function discard(id) {
  items.value = removeEntry(items.value, id);
  persist();
  emit();
}

/** Các thao tác `factory.apply` đang chờ gửi, theo thứ tự (để phủ lên dữ liệu server). */
export const pendingOps = computed(() => pendingOf(items.value).filter((i) => i.call === 'factory.apply').map((i) => i.args));

/** Có thao tác chờ gửi khớp điều kiện không (để hiện nhãn "chưa gửi" trên đúng dòng). */
export const hasUnsent = (pred) => items.value.some((i) => i.status === 'pending' && pred(i.args, i));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online.value = true;
    flushNow();
  });
  window.addEventListener('offline', () => {
    online.value = false;
  });
  // Tab khác (cùng máy) vừa ghi hàng đợi: đọc lại để số "chưa gửi" luôn đúng
  window.addEventListener('storage', (e) => {
    if (e.key === QUEUE_KEY) {
      items.value = readStored();
      emit();
    }
  });
  if (items.value.length && online.value) setTimeout(flushNow, 0);
}
