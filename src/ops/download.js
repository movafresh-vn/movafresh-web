/** Tải một file văn bản về máy (CSV xuất cho kế toán, file chi mock). */
export function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Excel mở CSV UTF-8 đúng tiếng Việt khi có BOM đầu tệp. Thêm một lần, không thêm nếu đã có. */
export const withBom = (text) => (String(text).startsWith('﻿') ? String(text) : `﻿${text}`);

/** Tên tệp lệnh mua của một ngày giao (khớp Content-Disposition của máy chủ). */
export const poCsvName = (date) => `po-${date}.csv`;
