import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { DEFAULT_DIAL } from '../config/countries';

// Số thử của môi trường local (OTP cố định): dải 555-01xx libphonenumber coi là không hợp lệ nên nhận riêng, giống backend.
const FIXTURE_PHONES = new Set(['15555550100']);
const VN_MOBILE = /^0[35789]\d{8}$/;

/**
 * Chuẩn hóa thông tin liên hệ khách nhập: số điện thoại (Zalo) hoặc email. Trả null nếu không hợp lệ.
 * - Số Việt Nam (0xxxxxxxxx, 84..., +84...) về dạng 10 số bắt đầu bằng 0 như trước.
 * - Số quốc tế phải đúng mã nước: gõ "+81 90 1234 5678", hoặc chọn mã vùng ở bộ chọn rồi gõ số nội địa (tham số `dial`, mặc định 84).
 *   Kết quả là E.164 (+819012345678), kiểm bằng libphonenumber-js.
 * - Số thử 15555550100 vẫn hợp lệ (xem FIXTURE_PHONES).
 */
export function normalizeContact(raw, { dial = DEFAULT_DIAL } = {}) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (text.includes('@')) {
    const email = text.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? { type: 'email', value: email } : null;
  }
  let p = text.replace(/[\s.\-()]/g, '');
  if (FIXTURE_PHONES.has(p.replace(/^\+/, ''))) return { type: 'phone', value: p.replace(/^\+/, '') };
  const d = String(dial || DEFAULT_DIAL).replace(/^\+/, '');
  // Đã chọn mã vùng khác +84 mà số gõ không có "+": đó là số nội địa của nước đó, không phải số Việt Nam.
  const national = d !== DEFAULT_DIAL && !p.startsWith('+');
  if (!national) {
    if (p.startsWith('+84')) p = '0' + p.slice(3).replace(/^0+/, '');
    else if (p.startsWith('84') && (p.length === 11 || p.length === 12)) p = '0' + p.slice(2).replace(/^0+/, '');
    if (VN_MOBILE.test(p)) return { type: 'phone', value: p };
  }
  if (!p.startsWith('+')) {
    if (!national || !/^\d+$/.test(p)) return null;
    p = `+${d}${p.replace(/^0+/, '')}`;
  }
  if (!/^\+[0-9]{6,15}$/.test(p)) return null;
  const intl = parsePhoneNumberFromString(p);
  return intl && intl.isValid() ? { type: 'phone', value: intl.number } : null;
}

export const contactKey = (c) => `${c.type}:${c.value}`;

/** Số điện thoại/email đã chuẩn hóa → định danh gửi Supabase Auth OTP (điện thoại dạng E.164: 0908123456 → +84908123456, 15555550100 → +15555550100, +81 90 1234 5678 → +819012345678). */
export function otpIdentity(raw, opts) {
  const c = normalizeContact(raw, opts);
  if (!c) return null;
  if (c.type === 'email') return c.value;
  if (c.value.startsWith('+')) return c.value;
  return c.value.startsWith('0') ? `+84${c.value.slice(1)}` : `+${c.value}`;
}

/** Số lưu dạng E.164 hoặc 0xxxxxxxxx → { dial, national } để điền lại ô nhập (không đoán được thì mặc định +84). */
export function splitPhone(value) {
  const v = String(value ?? '').replace(/[\s.\-()]/g, '');
  if (/^0\d{9}$/.test(v)) return { dial: DEFAULT_DIAL, national: v };
  if (v.startsWith('+')) {
    const p = parsePhoneNumberFromString(v);
    if (p && p.countryCallingCode) return { dial: String(p.countryCallingCode), national: p.nationalNumber };
  }
  return { dial: DEFAULT_DIAL, national: v.replace(/^\+/, '') };
}
