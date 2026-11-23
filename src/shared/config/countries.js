// Mã vùng điện thoại cho ô nhập số: mặc định Việt Nam (+84), ưu tiên các thị trường khách expat hay dùng (+81, +65, +82, +1).
// Chỉ phục vụ hiển thị bộ chọn; việc kiểm số hợp lệ nằm ở src/shared/domain/leads.js (libphonenumber-js).

export const DEFAULT_DIAL = '84';
export const PRIORITY_DIALS = ['81', '65', '82', '1'];

/** iso: mã nước ISO 3166-1 alpha-2; dial: mã vùng không có dấu "+"; name: tên hiển thị tiếng Việt. */
const ALL = [
  { iso: 'VN', dial: '84', name: 'Việt Nam' },
  { iso: 'JP', dial: '81', name: 'Nhật Bản' },
  { iso: 'SG', dial: '65', name: 'Singapore' },
  { iso: 'KR', dial: '82', name: 'Hàn Quốc' },
  { iso: 'US', dial: '1', name: 'Hoa Kỳ / Canada' },
  { iso: 'AU', dial: '61', name: 'Úc' },
  { iso: 'CN', dial: '86', name: 'Trung Quốc' },
  { iso: 'DE', dial: '49', name: 'Đức' },
  { iso: 'FR', dial: '33', name: 'Pháp' },
  { iso: 'GB', dial: '44', name: 'Anh' },
  { iso: 'HK', dial: '852', name: 'Hồng Kông' },
  { iso: 'MY', dial: '60', name: 'Malaysia' },
  { iso: 'TH', dial: '66', name: 'Thái Lan' },
  { iso: 'TW', dial: '886', name: 'Đài Loan' }
];

/** Danh sách cho bộ chọn: Việt Nam đầu, rồi các mã ưu tiên theo thứ tự, rồi phần còn lại theo tên. */
export const COUNTRIES = (() => {
  const first = ALL.find((c) => c.dial === DEFAULT_DIAL);
  const prio = PRIORITY_DIALS.map((d) => ALL.find((c) => c.dial === d)).filter(Boolean);
  const rest = ALL.filter((c) => c !== first && !prio.includes(c)).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  return [first, ...prio, ...rest];
})();

export const countryByDial = (dial) => COUNTRIES.find((c) => c.dial === String(dial).replace(/^\+/, '')) || null;

/** Nhãn một dòng trong bộ chọn, ví dụ "Nhật Bản (+81)". */
export const countryLabel = (c) => `${c.name} (+${c.dial})`;
