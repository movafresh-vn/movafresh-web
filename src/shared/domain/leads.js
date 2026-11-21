/**
 * Chuẩn hóa thông tin liên hệ khách nhập ở màn đầu của phễu: số điện thoại (Zalo) hoặc email.
 * Trả null nếu không hợp lệ. Số điện thoại về dạng 10 số bắt đầu bằng 0.
 */
export function normalizeContact(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (text.includes('@')) {
    const email = text.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? { type: 'email', value: email } : null;
  }
  let digits = text.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+84')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('84') && digits.length === 11) digits = '0' + digits.slice(2);
  return /^0\d{9}$/.test(digits) ? { type: 'phone', value: digits } : null;
}

export const contactKey = (c) => `${c.type}:${c.value}`;

/** Số điện thoại/email đã chuẩn hóa → định danh gửi Supabase Auth OTP (điện thoại dạng E.164: 0908123456 → +84908123456). */
export function otpIdentity(raw) {
  const c = normalizeContact(raw);
  if (!c) return null;
  return c.type === 'email' ? c.value : `+84${c.value.slice(1)}`;
}
