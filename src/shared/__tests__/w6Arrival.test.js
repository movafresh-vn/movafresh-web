import { describe, expect, it, vi } from 'vitest';
import { createOpsApi } from '../api/opsApi';
import { fakeHttp } from './helpers/fakeHttp';
import { read } from './helpers/asyncScan';

const PHOTO = 'data:image/jpeg;base64,AAAA';

describe('W6-03: nhận xe lạnh ở kho phụ cần ảnh dỡ hàng', () => {
  it('W6-03: ArrivalView luôn bắt ảnh trước khi chốt (không còn "tùy chọn"), kiểm trước khi gọi máy chủ', () => {
    const t = read('ops/views/hub/ArrivalView.vue');
    expect(t).toMatch(/if \(!photo\.value\) \{\s*closeError\.value = 'Cần chụp ảnh xe \/ thùng lúc nhận trước khi chốt\.';\s*return;/);
    expect(t).toContain('(bắt buộc: là sổ bàn giao chuỗi lạnh bất biến của kho phụ)');
    expect(t).not.toContain("'(tùy chọn)'");
    expect(t).not.toContain('needPhoto');
    expect(t).toMatch(/<PhotoInput v-model="photo" testid="arr-photo"/);
  });

  it('W6-03: nhiệt độ cũng bắt buộc và gửi dạng số; ngăn đông để trống thì không gửi', () => {
    const t = read('ops/views/hub/ArrivalView.vue');
    expect(t).toContain('tempC: Number(tempC.value)');
    expect(t).toMatch(/frozenTempC: frozenC\.value === '' \|\| !Number\.isFinite\(Number\(frozenC\.value\)\) \? null : Number\(frozenC\.value\)/);
    expect(t).toContain('Nhập nhiệt độ ngăn mát lúc nhận.');
  });

  it('W6-03: ảnh dỡ hàng được tải lên với mục đích handover (sổ bàn giao hub_unloading) trước khi chốt, rồi gửi đường dẫn', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));
    const http = fakeHttp({
      'POST /ops/uploads': { path: 'handover/202612/u.jpg', upload_url: 'https://storage.test/up' },
      'POST /ops/hub/arrivals/close': { missing: ['MV-2'], damaged: [], extra: [], exceptions: ['EX-3'], tempBad: false }
    });
    const r = await createOpsApi({ http, fetchImpl }).hub.closeArrival(null, { scope: '2026-12-03|T1', tempC: 2.5, frozenTempC: -18, photo: PHOTO, note: 'thiếu 1 thùng' });
    expect(r.missing).toEqual(['MV-2']);
    expect(http.calls[0].body).toMatchObject({ purpose: 'handover' });
    expect(http.calls[1].body).toEqual({ scope: '2026-12-03|T1', tempC: 2.5, frozenTempC: -18, photo: 'handover/202612/u.jpg', note: 'thiếu 1 thùng' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('W6-03: kho từ chối ảnh thì lỗi đến nơi gọi và KHÔNG gửi lệnh chốt (không có dòng bàn giao giả)', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403 }));
    const http = fakeHttp({ 'POST /ops/uploads': { path: 'handover/202612/u.jpg', upload_url: 'https://storage.test/up' }, 'POST /ops/hub/arrivals/close': {} });
    await expect(createOpsApi({ http, fetchImpl }).hub.closeArrival(null, { scope: 's', tempC: 3, photo: PHOTO })).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });
    expect(http.calls.some((c) => c.path === '/ops/hub/arrivals/close')).toBe(false);
  });

  it('W6-03: máy chủ từ chối (thiếu ảnh) được dịch sang tiếng Việt; màn dùng logisticsError và chống bấm đúp', () => {
    const t = read('ops/views/hub/ArrivalView.vue');
    expect(t).toContain('closeError.value = logisticsError(e)');
    expect(t).toMatch(/if \(closing\.value\) return;/);
    expect(t).toContain(':disabled="closing"');
  });
});
