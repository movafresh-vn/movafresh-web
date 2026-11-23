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
