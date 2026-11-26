// Bộ bảo vệ input số cho cổng Xưởng Đắk Lắk: chặn '-', '+', 'e'/'E' và chọn sẵn nội dung khi focus
// để tránh nối chuỗi spinbutton trên Playwright/Chromium (vd. '-5' + '9.2' thành '-59.2').

const BLOCKED_NUMBER_KEYS = new Set(['-', '+', 'e', 'E']);

export function blockInvalidNumberKeys(e) {
  if (BLOCKED_NUMBER_KEYS.has(e?.key)) {
    e.preventDefault();
    return true;
  }
  return false;
}

export function selectInputOnFocus(e) {
  const el = e?.target;
  if (el && typeof el.select === 'function') el.select();
}
