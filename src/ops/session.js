import { ref, computed } from 'vue';
import { ROLES } from '../shared/config/roles';
import { http } from '../shared/api/http';
import { signInWithPassword, signOut, getAccessToken } from '../services/supabase';

// Phiên vận hành = hồ sơ nhân viên do máy chủ trả (GET /ops/me): vai trò, trang chủ, quyền, shipper/nhà cung cấp của chính họ.
// Đăng nhập là email + mật khẩu Supabase. Token nằm trong Supabase client, KHÔNG lưu ở đây; sessionStorage chỉ giữ hồ sơ để
// hiện giao diện ngay khi tải lại, còn quyền thật luôn do máy chủ kiểm ở mỗi lệnh gọi.
const KEY = 'mova_ops_session';

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const session = ref(load());

export const ctx = computed(() =>
  session.value ? { role: session.value.role, supplierId: session.value.supplierId || null, shipperId: session.value.shipperId || null } : null
);

export function setSession(s) {
  session.value = s;
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
    else sessionStorage.removeItem(KEY);
  } catch {
    // sessionStorage có thể bị chặn; phiên vẫn chạy trong bộ nhớ
  }
}

/** Đổi phản hồi GET /ops/me thành phiên của web. */
export function sessionFromMe(me) {
  if (!me || !ROLES[me.role]) return null;
  const base = ROLES[me.role].label;
  return {
    role: me.role,
    label: me.display_name ? `${base}: ${me.display_name}` : base,
    home: me.home || ROLES[me.role].home,
    userId: me.user_id,
    displayName: me.display_name || null,
    supplierId: me.supplier_id || null,
    shipperId: me.shipper_id || null,
    permissions: Array.isArray(me.permissions) ? me.permissions : []
  };
}

/** Phiên có quyền này không (menu và nút ẩn theo quyền; máy chủ vẫn là nơi quyết định). */
export function can(permission) {
  return Boolean(session.value && session.value.permissions && session.value.permissions.includes(permission));
}

const DEPS = { signIn: signInWithPassword, signOut, token: getAccessToken, getMe: () => http().get('/ops/me') };

/**
 * Đăng nhập nhân viên. Sai mật khẩu hoặc tài khoản không phải nhân viên (máy chủ trả 403) thì không để lại phiên nào.
 * Trả về phiên; ném lỗi có `code` ('INVALID_CREDENTIALS' | 'NOT_STAFF' | mã của máy chủ).
 */
export async function loginStaff(email, password, deps = DEPS) {
  try {
    await deps.signIn(email, password);
  } catch (e) {
    const err = new Error('Email hoặc mật khẩu không đúng.');
    err.code = 'INVALID_CREDENTIALS';
    err.cause = e;
    throw err;
  }
  let me;
  try {
    me = await deps.getMe();
  } catch (e) {
    await deps.signOut().catch(() => {});
    if (e && (e.status === 401 || e.status === 403)) {
      const err = new Error('Tài khoản này chưa được cấp quyền vận hành.');
      err.code = 'NOT_STAFF';
      throw err;
    }
    throw e;
  }
  const s = sessionFromMe(me);
  if (!s) {
    await deps.signOut().catch(() => {});
    const err = new Error('Vai trò vận hành không hợp lệ.');
    err.code = 'NOT_STAFF';
    throw err;
  }
  setSession(s);
  return s;
}

/**
 * Khôi phục phiên khi tải lại trang: có token Supabase thì hỏi lại /ops/me (nguồn sự thật), không có hoặc bị từ chối thì xóa phiên.
 */
export async function restoreStaff(deps = DEPS) {
  const token = await deps.token().catch(() => null);
  if (!token) {
    setSession(null);
    return null;
  }
  try {
    const s = sessionFromMe(await deps.getMe());
    setSession(s);
    return s;
  } catch (e) {
    if (e && (e.status === 401 || e.status === 403)) setSession(null);
    return session.value;
  }
}

export async function logoutStaff(deps = DEPS) {
  setSession(null);
  await deps.signOut().catch(() => {});
}
