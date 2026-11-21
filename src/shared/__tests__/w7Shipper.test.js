import { describe, expect, it, vi } from 'vitest';
import { createOpsApi } from '../api/opsApi';
import { logisticsError, photoRequired, routeLabel } from '../../ops/logisticsUi';
import { fakeHttp } from './helpers/fakeHttp';
import { read } from './helpers/asyncScan';

const PHOTO = 'data:image/jpeg;base64,AAAA';

describe('W7-03: app shipper bắt ảnh bằng chứng theo hướng dẫn giao', () => {
  it('W7-03: mặc định CÓ ảnh; chỉ khi máy chủ báo rõ photoRequired=false mới được bỏ ảnh', () => {
    expect(photoRequired({})).toBe(true);
    expect(photoRequired({ photoRequired: true })).toBe(true);
    expect(photoRequired({ photoRequired: null })).toBe(true);
    expect(photoRequired(undefined)).toBe(true);
    expect(photoRequired({ photoRequired: false })).toBe(false);
  });

  it('W7-03: ShipperView chặn xác nhận khi cần ảnh mà chưa chụp (trước khi gọi máy chủ), và chỉ bỏ ảnh khi điểm giao cho phép', () => {
    const t = read('ops/views/shipper/ShipperView.vue');
    expect(t).toMatch(/if \(photoRequired\(st\) && !photo\.value\)/);
    expect(t).toContain('Cần chụp ảnh thùng hàng trước cửa');
    expect(t).toContain("photoRequired(st) ? '(bắt buộc)'");
    expect(t).toMatch(/<PhotoInput v-model="photo" testid="sp-photo"/);
  });

  it('W7-03: ảnh là tệp chụp tại chỗ: tải lên bằng vé một lần (delivery_proof) rồi gửi đường dẫn; không gửi data URL tới /deliver', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));
    const http = fakeHttp({
      'POST /ops/uploads': { path: 'delivery_proof/202612/p.jpg', upload_url: 'https://storage.test/up' },
      'POST /shipper/stops/MV-261203-0001/deliver': { to: 'COMPLETED', routeDone: true }
    });
    const r = await createOpsApi({ http, fetchImpl }).shipper.deliver(null, { orderId: 'MV-261203-0001', photo: PHOTO, tempC: 3.8 });
    expect(r).toMatchObject({ to: 'COMPLETED' });
    expect(http.calls.map((c) => c.path)).toEqual(['/ops/uploads', '/shipper/stops/MV-261203-0001/deliver']);
    expect(http.calls[0].body.purpose).toBe('delivery_proof');
    expect(http.calls[1].body).toEqual({ photo_path: 'delivery_proof/202612/p.jpg', temp_c: 3.8 });
    expect(JSON.stringify(http.calls[1].body)).not.toContain('data:');
  });

  it('W7-03: lỗi PHOTO_REQUIRED của máy chủ hiện bằng tiếng Việt (cho trường hợp máy chủ bắt ảnh mà màn chưa biết)', () => {
    expect(logisticsError({ code: 'PHOTO_REQUIRED', message: 'x' })).toMatch(/ảnh/);
    expect(logisticsError({ code: 'NOT_YOUR_STOP', message: 'x' })).toMatch(/không thuộc tuyến/);
    expect(logisticsError({ code: 'CALL_REQUIRED' })).toMatch(/gọi khách/i);
    expect(logisticsError({ code: 'NETWORK_ERROR' })).toMatch(/kết nối/);
    expect(logisticsError({ code: 'LA_LUNG', message: 'Lời nhắn của máy chủ' })).toBe('Lời nhắn của máy chủ');
    expect(logisticsError(null)).toMatch(/Không thực hiện được/);
    // CAPACITY_BELOW_USED có xử lý riêng ở màn sức chứa (xác nhận hạ), giữ nguyên lời nhắn kèm số liệu của máy chủ
    expect(logisticsError({ code: 'CAPACITY_BELOW_USED', message: 'Đã đặt 12, hạ xuống 8?' })).toBe('Đã đặt 12, hạ xuống 8?');
  });

  it('W7-03: không giao được: gửi lý do + ghi chú; ngoại lệ mở cho điều phối; gọi khách ghi lượt gọi', async () => {
    const http = fakeHttp({
      'POST /shipper/stops/MV-1/fail': { orderId: 'MV-1', status: 'failed', exceptionId: 'EX-1', routeDone: false },
      'POST /shipper/stops/MV-1/call': { calls: 2, via: 'masked-proxy' }
    });
    const a = createOpsApi({ http });
    expect(await a.shipper.fail(null, { orderId: 'MV-1', reason: 'wrong_address', note: 'Không có số 14' })).toMatchObject({ exceptionId: 'EX-1' });
    expect(http.calls[0].body).toEqual({ reason: 'wrong_address', note: 'Không có số 14' });
    expect((await a.shipper.callCustomer(null, { orderId: 'MV-1' })).calls).toBe(2);
  });

  it('W7-03: ShipperView báo lỗi qua logisticsError, chỉ shipper / admin thao tác, điều phối chỉ xem', () => {
    const t = read('ops/views/shipper/ShipperView.vue');
    expect(t).toContain("['shipper', 'admin'].includes(ctx.value.role)");
    expect(t).toContain('logisticsError(e)');
    expect(t).toContain('Điều phối chỉ xem, không thao tác thay shipper.');
    // shipper thật không gửi asShipperId (máy chủ ép về chính họ)
    expect(t).toContain('isShipper.value ? {} : { asShipperId: asId.value }');
  });

  it('W7-03: mã tuyến dài chỉ hiện phần cuối', () => {
    expect(routeLabel('BATCH-20261203:early_morning_06_08:R-Q2-THAODIEN~2')).toBe('R-Q2-THAODIEN~2');
    expect(routeLabel('R-Q2-CHUNG')).toBe('R-Q2-CHUNG');
    expect(routeLabel(undefined)).toBe('');
  });
});
