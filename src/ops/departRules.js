// Xuất xe lạnh (rule 7): mỗi chuyến phải có sổ bàn giao chuỗi lạnh gồm NHIỆT ĐỘ + ẢNH + thời điểm; không có thì máy chủ từ chối
// (PHOTO_REQUIRED / HANDOVER_REQUIRED) và đơn không sang IN_TRANSIT. Kiểm ở web chỉ để báo lỗi sớm, đỡ phải chờ mạng.
export function checkDepart({ tempC, sealNo, photo, loadedCount, missingCount, confirmMissing }) {
  if (tempC === '' || tempC === null || tempC === undefined || !Number.isFinite(Number(tempC))) return 'Nhập nhiệt độ thùng xe.';
  if (!String(sealNo || '').trim()) return 'Nhập số niêm phong.';
  if (!photo) return 'Chụp ảnh thùng xe và nhiệt kế trước khi xuất xe.';
  if (!loadedCount) return 'Chưa có thùng nào lên xe.';
  if (missingCount && !confirmMissing) return `Còn ${missingCount} thùng chưa lên xe. Tích xác nhận nếu vẫn xuất xe.`;
  return '';
}

/** Thao tác `depart` gửi vào hàng đợi. `photo` là data URL; hàng đợi tải lên kho rồi đổi thành đường dẫn trước khi gửi. */
export function departOp({ scope, tempC, sealNo, photo, confirmMissing, expected }) {
  return { scope, tempC: Number(tempC), sealNo: String(sealNo).trim(), photo, confirmMissing: Boolean(confirmMissing), expected };
}
