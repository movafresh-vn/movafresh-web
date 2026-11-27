import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function getAccessToken() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.access_token ?? null;
}

export async function requestOtp(contact) {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase Auth trong biến môi trường VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  const value = contact.trim();
  const { error } = value.includes('@')
    ? await supabase.auth.signInWithOtp({ email: value })
    : await supabase.auth.signInWithOtp({ phone: value });
  if (error) throw error;
}

export async function verifyOtp(contact, token) {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase Auth trong biến môi trường VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  const value = contact.trim();
  const { data, error } = value.includes('@')
    ? await supabase.auth.verifyOtp({ email: value, token, type: 'email' })
    : await supabase.auth.verifyOtp({ phone: value, token, type: 'sms' });
  if (error) throw error;
  return data.user;
}

function isPhoneAlreadyRegisteredError(err) {
  const msg = String(err?.message || err?.code || '');
  return /already|registered|exists|duplicate|phone_exists/i.test(msg);
}

/**
 * Gửi OTP để gắn SĐT vào chính tài khoản OAuth đang đăng nhập (giữ nguyên phiên Google/Zalo).
 * Nếu SĐT đã tồn tại trên một tài khoản SMS cũ, tự chuyển sang chế độ xác thực OTP để hợp nhất tài khoản mà không mất số dư Fresh Credit.
 */
export async function requestPhoneLinkOtp(phone) {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase Auth trong biến môi trường VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  const value = phone.trim();
  const { error } = await supabase.auth.updateUser({ phone: value });
  if (!error) return { mode: 'phone_change', savedSession: null };
  if (!isPhoneAlreadyRegisteredError(error)) throw error;

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr || !sessionData.session) throw error;

  const { error: otpErr } = await supabase.auth.signInWithOtp({ phone: value });
  if (otpErr) throw otpErr;
  return {
    mode: 'merge_existing',
    savedSession: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token
    }
  };
}

/**
 * Xác thực OTP cho luồng gắn SĐT.
 * - mode === 'phone_change': gắn trực tiếp vào tài khoản hiện tại qua verifyOtp({ type: 'phone_change' }).
 * - mode === 'merge_existing': xác thực OTP tài khoản cũ để lấy phone_access_token, rồi khôi phục ngay phiên OAuth hiện tại để gọi backend hợp nhất.
 */
export async function verifyPhoneLinkOtp(phone, token, opts = {}) {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase Auth trong biến môi trường VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  const value = phone.trim();
  const mode = opts.mode || 'phone_change';

  if (mode === 'merge_existing') {
    const saved = opts.savedSession;
    if (!saved?.access_token || !saved?.refresh_token) {
      throw new Error('Phiên đăng nhập hiện tại đã hết hạn. Vui lòng thử gửi lại mã OTP.');
    }
    const { data, error } = await supabase.auth.verifyOtp({ phone: value, token, type: 'sms' });
    if (error) throw error;
    const phoneAccessToken = data.session?.access_token;
    if (!phoneAccessToken) throw new Error('Không lấy được phiên xác thực số điện thoại cũ.');
    const { data: restored, error: restoreErr } = await supabase.auth.setSession({
      access_token: saved.access_token,
      refresh_token: saved.refresh_token
    });
    if (restoreErr) throw restoreErr;
    return { mode: 'merge_existing', user: restored.user, phoneAccessToken };
  }

  const { data, error } = await supabase.auth.verifyOtp({ phone: value, token, type: 'phone_change' });
  if (error) throw error;
  return { mode: 'phone_change', user: data.user, phoneAccessToken: null };
}

/** Xác thực magiclink token_hash (do backend trả về sau Zalo OAuth v4 PKCE) để lấy phiên Supabase chuẩn. */
export async function verifyMagicLinkToken(tokenHash) {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase Auth trong biến môi trường VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (error) throw error;
  return data.user;
}

/** Làm mới phiên Supabase sau khi backend cập nhật SĐT / hợp nhất tài khoản. */
export async function refreshAuthSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.refreshSession();
  if (error) return null;
  return data.user ?? null;
}

/**
 * Đăng nhập khách bằng Google (OAuth). Trình duyệt chuyển sang Google rồi quay lại `redirectTo` (mặc định trang hiện tại);
 * phiên được Supabase nhận từ URL khi quay về. Khối Google trong supabase/config.toml mặc định tắt, môi trường thật bật ở dashboard.
 * Khách Google chưa có số điện thoại đã xác thực vẫn vào được, nhưng thanh toán sẽ bắt xác thực số (PHONE_NOT_VERIFIED).
 */
export async function signInWithGoogle(redirectTo) {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase Auth trong biến môi trường VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo || `${location.origin}${location.pathname}` }
  });
  if (error) throw error;
}

/** Đăng nhập nhân viên vận hành bằng email + mật khẩu (tài khoản do admin tạo, xem backend `npm run seed:staff`). */
export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase Auth trong biến môi trường VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.auth.signInWithPassword({ email: String(email).trim(), password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
