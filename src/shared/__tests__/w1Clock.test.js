import { afterEach, describe, expect, it } from 'vitest';
import { clockOffsetMs, dayKey, serverNow, syncServerTime } from '../utils/time';

afterEach(() => syncServerTime(new Date(1000).toISOString(), 1000));

describe('W1-06: đồng hồ web theo giờ máy chủ', () => {
  it('W1-06: chưa đồng bộ thì dùng giờ máy; sau đồng bộ, serverNow = giờ máy + độ lệch', () => {
    expect(clockOffsetMs()).toBe(0);
    expect(serverNow(5000).getTime()).toBe(5000);
    syncServerTime('2026-12-01T01:00:00.000Z', Date.parse('2026-11-22T00:00:00.000Z'));
    expect(serverNow(Date.parse('2026-11-22T00:00:10.000Z')).toISOString()).toBe('2026-12-01T01:00:10.000Z');
  });

  it('W1-06: giờ máy chủ sai định dạng bị bỏ qua, độ lệch giữ nguyên', () => {
    syncServerTime('2026-12-01T01:00:00.000Z', Date.parse('2026-12-01T00:00:00.000Z'));
    const before = clockOffsetMs();
    syncServerTime('không phải ngày', 123);
    expect(clockOffsetMs()).toBe(before);
    expect(before).toBe(3600_000);
  });

  it('W1-06: ngày nghiệp vụ theo giờ Việt Nam của giờ máy chủ (đồng hồ dev nhảy ngày)', () => {
    syncServerTime('2026-12-01T18:00:00.000Z', Date.parse('2026-11-22T00:00:00.000Z')); // 01:00 ngày 02/12 giờ VN
    expect(dayKey(serverNow(Date.parse('2026-11-22T00:00:00.000Z')))).toBe('2026-12-02');
  });
});
