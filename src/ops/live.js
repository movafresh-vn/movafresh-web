// Nhịp tải lại dữ liệu của màn vận hành (logic thuần, test được không cần DOM).
// - Mỗi lần chỉ có MỘT yêu cầu đang chạy: nhịp tới mà lần trước chưa xong thì bỏ qua (mạng chậm không chồng yêu cầu).
// - Tab đang ẩn thì tạm dừng; hiện lại thì tải ngay một lần rồi chạy tiếp.
// - Lỗi của `fn` không làm dừng nhịp.
export function createPoller(fn, { every = 6000, isHidden = () => false, setTimer = setInterval, clearTimer = clearInterval } = {}) {
  let timer = null;
  let inFlight = false;
  let running = false;

  async function tick() {
    if (!running || inFlight || isHidden()) return false;
    inFlight = true;
    try {
      await fn();
    } catch {
      // màn tự hiện lỗi của nó; nhịp vẫn chạy tiếp
    } finally {
      inFlight = false;
    }
    return true;
  }

  return {
    start() {
      if (running) return;
      running = true;
      tick();
      if (every) timer = setTimer(tick, every);
    },
    stop() {
      running = false;
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
    /** Gọi khi tab đổi ẩn/hiện. */
    visibilityChanged() {
      return tick();
    },
    /** Tải ngay (bỏ qua nếu đang chạy). */
    refresh: tick,
    get inFlight() {
      return inFlight;
    }
  };
}
