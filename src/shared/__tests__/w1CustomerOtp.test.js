import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const sb = vi.hoisted(() => ({ getAccessToken: vi.fn(), requestOtp: vi.fn(), verifyOtp: vi.fn(), signOut: vi.fn() }));
vi.mock('../../services/supabase', () => sb);
const cust = vi.hoisted(() => ({ getAccount: vi.fn(), notifications: vi.fn(), markNotificationsRead: vi.fn(), reset: vi.fn() }));
vi.mock('../api', () => ({ api: { customer: cust } }));

import { otpIdentity } from '../domain/leads';
import { useMovaStore } from '../../stores/useMovaStore';

const ACCOUNT = { customer: { name: 'Lan' }, subscription: null, credit: { real_vnd: 0, promo_vnd: 0, total_vnd: 0 }, alert: null, renewal: null };

beforeEach(() => {
  setActivePinia(createPinia());
  for (const f of [...Object.values(sb), ...Object.values(cust)]) f.mockReset();
  sb.getAccessToken.mockResolvedValue('tok');
  sb.requestOtp.mockResolvedValue(undefined);
  sb.signOut.mockResolvedValue(undefined);
  cust.getAccount.mockResolvedValue({ status: 'success', data: ACCOUNT });
  cust.notifications.mockResolvedValue([{ id: '1', read: false }]);
});

describe('W1-05: khách đăng nhập bằng mã OTP điện thoại', () => {
  it('W1-05: số điện thoại Việt Nam thành E.164, email giữ nguyên chữ thường, chữ lạ bị từ chối', () => {
    expect(otpIdentity('0908 123 456')).toBe('+84908123456');
    expect(otpIdentity('+84 908.123.456')).toBe('+84908123456');
    expect(otpIdentity('0901000001')).toBe('+84901000001');
    expect(otpIdentity('15555550100')).toBe('+15555550100');
    expect(otpIdentity('+15555550100')).toBe('+15555550100');
    expect(otpIdentity('Lan@Mail.VN')).toBe('lan@mail.vn');
    expect(otpIdentity('12345')).toBeNull();
    expect(otpIdentity('')).toBeNull();
  });

  it('W1-05: gửi OTP dùng định danh chuẩn hóa; số sai không gọi Supabase; lỗi của Supabase trả thành lời nhắc', async () => {
    const s = useMovaStore();
    expect(await s.requestOtp('0908 123 456')).toBe('');
    expect(sb.requestOtp).toHaveBeenCalledWith('+84908123456');
    expect(await s.requestOtp('abc')).toMatch(/số điện thoại/);
    expect(sb.requestOtp).toHaveBeenCalledTimes(1);
    sb.requestOtp.mockRejectedValueOnce(new Error('Quá nhiều lần thử'));
    expect(await s.requestOtp('0908123456')).toBe('Quá nhiều lần thử');
  });

  it('W1-05: xác thực đúng mã thì vào tài khoản, tải dữ liệu từ máy chủ (không có đăng nhập demo bằng SĐT đã đăng ký)', async () => {
    sb.verifyOtp.mockResolvedValue({ id: 'u1', phone: '+84908123456' });
    const s = useMovaStore();
    s.openModal('login');
    expect(await s.verifyOtp('0908 123 456', ' 123456 ')).toBe('');
    expect(sb.verifyOtp).toHaveBeenCalledWith('+84908123456', '123456');
    expect(s.customerId).toBe('u1');
    expect(s.isLoggedIn).toBe(true);
    expect(s.userName).toBe('Lan');
    expect(s.notifications).toHaveLength(1);
    expect(s.activeModal).toBeNull();
    expect(cust.getAccount).toHaveBeenCalledTimes(1);
  });

  it('W1-05: sai mã OTP không tạo phiên', async () => {
    sb.verifyOtp.mockRejectedValue(new Error('Token has expired or is invalid'));
    const s = useMovaStore();
    expect(await s.verifyOtp('0908123456', '000000')).toBe('Token has expired or is invalid');
    expect(s.isLoggedIn).toBe(false);
    expect(cust.getAccount).not.toHaveBeenCalled();
  });

  it('W1-05: refresh khi chưa có token thì không gọi máy chủ; token hết hạn (401) thì đăng xuất êm', async () => {
    const s = useMovaStore();
    sb.getAccessToken.mockResolvedValueOnce(null);
    expect(await s.refresh()).toBe(false);
    expect(cust.getAccount).not.toHaveBeenCalled();

    s.setAuthUser({ id: 'u1' });
    cust.getAccount.mockResolvedValueOnce({ status: 'error', error: { code: 'UNAUTHORIZED', status: 401, message: 'x' } });
    expect(await s.refresh()).toBe(false);
    expect(sb.signOut).toHaveBeenCalled();
    expect(s.customerId).toBeNull();
    expect(cust.reset).toHaveBeenCalled();
  });

  it('W1-05: tài khoản mới chưa có hồ sơ (404 / PROFILE_NOT_FOUND) không bị đăng xuất, giữ nguyên phiên Supabase', async () => {
    const s = useMovaStore();
    s.setAuthUser({ id: 'u1', phone: '+15555550100' });
    cust.getAccount.mockResolvedValueOnce({ status: 'error', error: { code: 'PROFILE_NOT_FOUND', status: 404, message: 'Không tìm thấy hồ sơ của bạn.' } });
    expect(await s.refresh()).toBe(false);
    expect(sb.signOut).not.toHaveBeenCalled();
    expect(s.customerId).toBe('u1');
    expect(s.hasMovaSession).toBe(true);
    expect(s.account).toBeNull();
  });

  it('W1-05: khách mới đăng nhập bằng SĐT test 15555550100 thành công dù chưa có hồ sơ (404)', async () => {
    sb.verifyOtp.mockResolvedValue({ id: 'u_new', phone: '+15555550100' });
    cust.getAccount.mockResolvedValueOnce({ status: 'error', error: { code: 'PROFILE_NOT_FOUND', status: 404, message: 'Không tìm thấy hồ sơ của bạn.' } });
    const s = useMovaStore();
    s.openModal('login');
    expect(await s.verifyOtp('15555550100', '123456')).toBe('');
    expect(sb.verifyOtp).toHaveBeenCalledWith('+15555550100', '123456');
    expect(sb.signOut).not.toHaveBeenCalled();
    expect(s.customerId).toBe('u_new');
    expect(s.hasMovaSession).toBe(true);
    expect(s.isLoggedIn).toBe(false);
    expect(s.toastMessage).toMatch(/Đăng nhập MOVA thành công/);
    expect(s.activeModal).toBeNull();
  });

  it('W1-05: đăng xuất xóa tài khoản, bản nháp thực đơn và phiên Supabase', async () => {
    const s = useMovaStore();
    s.setAuthUser({ id: 'u1' });
    await s.refresh();
    expect(s.isLoggedIn).toBe(true);
    await s.logout();
    expect(s.isLoggedIn).toBe(false);
    expect(s.account).toBeNull();
    expect(cust.reset).toHaveBeenCalled();
    expect(sb.signOut).toHaveBeenCalled();
    expect(s.toastMessage).toBe('Đã đăng xuất');
  });

  it('W1-05: hai lần refresh chồng nhau chỉ gọi máy chủ một lần', async () => {
    const s = useMovaStore();
    s.setAuthUser({ id: 'u1' });
    await Promise.all([s.refresh(), s.refresh(), s.refresh()]);
    expect(cust.getAccount).toHaveBeenCalledTimes(1);
  });
});
