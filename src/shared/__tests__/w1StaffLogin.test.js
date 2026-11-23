import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabase', () => ({ signInWithPassword: vi.fn(), signOut: vi.fn(), getAccessToken: vi.fn() }));

const ME = { user_id: 'u1', role: 'workshop', display_name: 'Lan', home: '/xuong', shipper_id: null, supplier_id: null, permissions: ['factory', 'yieldLog'] };

let S;
beforeEach(async () => {
  vi.resetModules();
  S = await import('../../ops/session');
  S.setSession(null);
});

const deps = (over = {}) => ({
  signIn: vi.fn(async () => ({})),
  signOut: vi.fn(async () => {}),
  token: vi.fn(async () => 'tok'),
  getMe: vi.fn(async () => ME),
  ...over
});

describe('W1-04: đăng nhập nhân viên bằng email + mật khẩu', () => {
  it('W1-04: đăng nhập đúng thì phiên lấy từ /ops/me (vai trò, nhãn, trang chủ, quyền), không còn PIN nào', async () => {
    const d = deps();
    const s = await S.loginStaff('lan@mova.vn', 'mk', d);
    expect(d.signIn).toHaveBeenCalledWith('lan@mova.vn', 'mk');
    expect(s).toMatchObject({ role: 'workshop', home: '/xuong', userId: 'u1', displayName: 'Lan', shipperId: null, supplierId: null });
    expect(s.label).toBe('Xưởng Đắk Lắk: Lan');
    expect(S.session.value.permissions).toEqual(['factory', 'yieldLog']);
    expect(S.can('factory')).toBe(true);
    expect(S.can('batchLock')).toBe(false);
    expect(S.ctx.value).toEqual({ role: 'workshop', supplierId: null, shipperId: null });
  });

  it('W1-04: sai mật khẩu là INVALID_CREDENTIALS và không để lại phiên', async () => {
    const d = deps({ signIn: vi.fn(async () => { throw new Error('Invalid login credentials'); }) });
    await expect(S.loginStaff('a@b.vn', 'x', d)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(S.session.value).toBeNull();
    expect(d.getMe).not.toHaveBeenCalled();
  });

  it('W1-04: tài khoản khách (máy chủ từ chối /ops/me) là NOT_STAFF, đăng xuất khỏi Supabase, không có phiên', async () => {
    const d = deps({ getMe: vi.fn(async () => { throw Object.assign(new Error('no'), { status: 403, code: 'FORBIDDEN' }); }) });
    await expect(S.loginStaff('khach@x.vn', 'x', d)).rejects.toMatchObject({ code: 'NOT_STAFF' });
    expect(d.signOut).toHaveBeenCalled();
    expect(S.session.value).toBeNull();
  });

  it('W1-04: lỗi mạng khi lấy hồ sơ không bị nuốt thành NOT_STAFF', async () => {
    const d = deps({ getMe: vi.fn(async () => { throw Object.assign(new Error('mạng'), { code: 'NETWORK_ERROR', status: 0 }); }) });
    await expect(S.loginStaff('a@b.vn', 'x', d)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('W1-04: vai trò shipper và nhà cung cấp mang đúng id của chính họ', async () => {
    const d = deps({ getMe: vi.fn(async () => ({ ...ME, role: 'shipper', home: '/giao-hang', shipper_id: 'SH-1' })) });
    expect((await S.loginStaff('s@x.vn', 'x', d)).shipperId).toBe('SH-1');
    const d2 = deps({ getMe: vi.fn(async () => ({ ...ME, role: 'supplier', home: '/nha-cung-cap', supplier_id: 'NCC-2' })) });
    expect((await S.loginStaff('n@x.vn', 'x', d2)).supplierId).toBe('NCC-2');
  });

  it('W1-04: khôi phục khi tải lại: có token thì hỏi lại máy chủ; không token hoặc bị từ chối thì xóa phiên; lỗi mạng giữ phiên cũ', async () => {
    S.setSession({ role: 'admin', label: 'cũ', home: '/tong-quan', permissions: [] });
    expect(await S.restoreStaff(deps({ token: vi.fn(async () => null) }))).toBeNull();
    expect(S.session.value).toBeNull();

    expect((await S.restoreStaff(deps())).role).toBe('workshop');
    expect(S.session.value.role).toBe('workshop');

    const denied = deps({ getMe: vi.fn(async () => { throw Object.assign(new Error('x'), { status: 401 }); }) });
    expect(await S.restoreStaff(denied)).toBeNull();

    S.setSession({ role: 'hub', label: 'Kho', home: '/kho', permissions: [] });
    const offline = deps({ getMe: vi.fn(async () => { throw Object.assign(new Error('mạng'), { status: 0 }); }) });
    expect((await S.restoreStaff(offline)).role).toBe('hub');
  });

  it('W1-04: đăng xuất xóa phiên và gọi signOut', async () => {
    const d = deps();
    await S.loginStaff('lan@mova.vn', 'mk', d);
    await S.logoutStaff(d);
    expect(S.session.value).toBeNull();
    expect(d.signOut).toHaveBeenCalled();
  });

  it('W1-04: vai trò lạ từ máy chủ không tạo phiên', () => {
    expect(S.sessionFromMe({ role: 'hacker' })).toBeNull();
    expect(S.sessionFromMe(null)).toBeNull();
  });
});
