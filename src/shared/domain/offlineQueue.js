// Hàng đợi thao tác khi mất mạng của app vận hành (xưởng lạnh, mạng chập chờn). Module thuần, không đụng DOM hay localStorage:
// phần lưu và lắng nghe sự kiện `online` nằm ở src/ops/queue.js.
//
// Một mục: { id, call, args, at, status: 'pending' | 'failed', tries, error }
// - id: mã duy nhất do máy khách sinh; server dùng lại làm opId để khử trùng khi gửi lại.
// - call: tên hàm API (ví dụ 'factory.apply', 'substituteDish'); args: tham số truyền cho hàm.
// Gửi theo đúng thứ tự thao tác. Lỗi mạng (code 'NETWORK') dừng cả lượt và giữ nguyên mục để gửi lại;
// lỗi nghiệp vụ (đơn không còn hợp lệ...) đánh dấu 'failed' kèm lý do, các mục sau vẫn được gửi.

export const QUEUE_KEY = 'mova_ops_queue_v1';

export function networkError(message = 'Không có mạng') {
  const e = new Error(message);
  e.code = 'NETWORK';
  return e;
}
// 'NETWORK' là mã của hàng đợi; 'NETWORK_ERROR' là mã client HTTP (http.js) khi không tới được máy chủ.
export const isNetworkError = (e) => Boolean(e) && (e.code === 'NETWORK' || e.code === 'NETWORK_ERROR');

let seq = 0;
/** Mã thao tác duy nhất trên máy: thời gian + bộ đếm + số ngẫu nhiên. */
export function newOpId(prefix = 'op', now = Date.now(), rand = Math.random) {
  seq = (seq + 1) % 1e6;
  return `${prefix}-${now.toString(36)}-${seq.toString(36)}-${Math.floor(rand() * 1e6).toString(36)}`;
}

export function makeEntry({ id, call, args = {}, at = null }) {
  if (!id || !call) throw new Error('Thao tác cần có id và call');
  return { id, call, args, at, status: 'pending', tries: 0, error: null };
}

/** Thêm vào cuối hàng. Mã trùng thì bỏ qua (nhấn đúp, đọc lại từ bộ nhớ). */
export function enqueue(items, entry) {
  if (items.some((i) => i.id === entry.id)) return items;
  return [...items, entry];
}

export const pendingOf = (items) => items.filter((i) => i.status === 'pending');
export const failedOf = (items) => items.filter((i) => i.status === 'failed');
export const unsentCount = (items) => items.length;

export const removeEntry = (items, id) => items.filter((i) => i.id !== id);

/** Cho các mục lỗi nghiệp vụ được gửi lại ở lượt sau. */
export const retryFailed = (items) => items.map((i) => (i.status === 'failed' ? { ...i, status: 'pending', error: null } : i));

/** Mục đang chờ gửi thuộc một nhóm (ví dụ để hiện nhãn "chưa gửi" trên đúng dòng). */
export const hasPending = (items, predicate) => items.some((i) => predicate(i));

export function serialize(items) {
  return JSON.stringify({ v: 1, items });
}

/** Đọc lại từ bộ nhớ, bỏ qua mục hỏng; không bao giờ ném lỗi. */
export function parse(text) {
  if (!text) return [];
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [];
    return list
      .filter((i) => i && typeof i.id === 'string' && typeof i.call === 'string')
      .map((i) => ({
        id: i.id,
        call: i.call,
        args: i.args || {},
        at: i.at || null,
        status: i.status === 'failed' ? 'failed' : 'pending',
        tries: Number(i.tries) || 0,
        error: i.error || null
      }));
  } catch {
    return [];
  }
}

/**
 * Gửi các mục đang chờ theo thứ tự.
 * @param {object} p
 * @param {Array} p.items hàng đợi hiện tại
 * @param {(entry) => Promise<any>|any} p.send hàm gửi một mục; ném Error (code 'NETWORK' nếu mất mạng)
 * @param {(entry) => Promise<object|null>|object|null} [p.prepare] chạy TRƯỚC `send`: trả `args` mới (ví dụ ảnh đã tải lên kho đổi từ data URL
 *   sang đường dẫn) hoặc null nếu không đổi. `args` mới được ghi lại vào hàng đợi (onChange 'prepared') nên lần gửi lại không tải ảnh lần nữa.
 * @param {() => boolean} [p.isOnline] false thì không gửi gì
 * @param {(items, event) => void} [p.onChange] gọi sau mỗi mục được xử lý, với hàng đợi mới
 * @returns {Promise<{ items: Array, sent: number, failed: number, stopped: null|'offline'|'network' }>}
 */
export async function flush({ items, send, prepare = null, isOnline = () => true, onChange = () => {} }) {
  let current = items;
  let sent = 0;
  let failed = 0;
  if (!isOnline()) return { items: current, sent, failed, stopped: 'offline' };

  for (const entry of pendingOf(items)) {
    if (!isOnline()) return { items: current, sent, failed, stopped: 'offline' };
    try {
      let toSend = entry;
      if (prepare) {
        const args = await prepare(entry);
        if (args) {
          toSend = { ...entry, args };
          current = current.map((i) => (i.id === entry.id ? toSend : i));
          onChange(current, { id: entry.id, result: 'prepared' });
        }
      }
      await send(toSend);
      current = removeEntry(current, entry.id);
      sent++;
      onChange(current, { id: entry.id, result: 'sent' });
    } catch (e) {
      if (isNetworkError(e)) {
        current = current.map((i) => (i.id === entry.id ? { ...i, tries: i.tries + 1 } : i));
        onChange(current, { id: entry.id, result: 'network' });
        return { items: current, sent, failed, stopped: 'network' };
      }
      current = current.map((i) => (i.id === entry.id ? { ...i, status: 'failed', tries: i.tries + 1, error: (e && e.message) || 'Lỗi không rõ' } : i));
      failed++;
      onChange(current, { id: entry.id, result: 'failed' });
    }
  }
  return { items: current, sent, failed, stopped: null };
}
