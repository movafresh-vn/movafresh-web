import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPoller } from '../../ops/live';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

describe('W4-02: nhịp tải lại không chồng yêu cầu và nghỉ khi tab ẩn', () => {
  it('W4-02: tải ngay khi bắt đầu rồi mỗi 6 giây; stop thì hết chạy', async () => {
    const fn = vi.fn(async () => {});
    const p = createPoller(fn, { every: 6000 });
    p.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(6000);
    await vi.advanceTimersByTimeAsync(6000);
    expect(fn).toHaveBeenCalledTimes(3);
    p.stop();
    await vi.advanceTimersByTimeAsync(30000);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('W4-02: lần trước chưa xong thì bỏ qua nhịp tới (mạng chậm không chồng yêu cầu)', async () => {
    const d = deferred();
    const fn = vi.fn(() => d.promise);
    const p = createPoller(fn, { every: 1000 });
    p.start();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(p.inFlight).toBe(true);
    d.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(p.inFlight).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
    p.stop();
  });

  it('W4-02: tab đang ẩn thì không gọi; hiện lại thì tải ngay một lần', async () => {
    let hidden = true;
    const fn = vi.fn(async () => {});
    const p = createPoller(fn, { every: 1000, isHidden: () => hidden });
    p.start();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fn).not.toHaveBeenCalled();
    hidden = false;
    await p.visibilityChanged();
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    p.stop();
  });

  it('W4-02: lỗi của một lần tải không dừng nhịp, và không để cờ inFlight kẹt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('mạng'))
      .mockResolvedValue(undefined);
    const p = createPoller(fn, { every: 1000 });
    p.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(p.inFlight).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    p.stop();
  });

  it('W4-02: start hai lần không tạo hai nhịp; refresh sau stop không gọi; every=0 chỉ tải một lần', async () => {
    const fn = vi.fn(async () => {});
    const p = createPoller(fn, { every: 1000 });
    p.start();
    p.start();
    await vi.advanceTimersByTimeAsync(2500);
    expect(fn).toHaveBeenCalledTimes(3); // 0s, 1s, 2s: đúng một nhịp
    p.stop();
    expect(await p.refresh()).toBe(false);

    const once = vi.fn(async () => {});
    const q = createPoller(once, { every: 0 });
    q.start();
    await vi.advanceTimersByTimeAsync(10000);
    expect(once).toHaveBeenCalledTimes(1);
    q.stop();
  });

  it('W4-02: useLive dùng bộ poller và nghỉ khi document.hidden; mặc định 6 giây', async () => {
    const { read } = await import('./helpers/asyncScan');
    const src = read('ops/useLive.js');
    expect(src).toMatch(/createPoller/);
    expect(src).toMatch(/document\.hidden/);
    expect(src).toMatch(/visibilitychange/);
    expect(src).toMatch(/every = 6000/);
  });
});
