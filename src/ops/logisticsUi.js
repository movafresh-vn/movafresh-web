import { fmtDeadline } from '../shared/utils/time';

const nf1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** "2,5°C" */
export const tempText = (n) => (n == null ? '—' : `${nf1.format(n)}°C`);

/** "75%" hoặc "—" khi chưa có dữ liệu */
export const pctText = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);

export const dt = (iso) => (iso ? fmtDeadline(new Date(iso)) : '—');

/** Số thập phân kiểu Việt */
export const dec = (n) => (n == null ? '—' : nf1.format(n));

export const EXCEPTION_KIND = {
  missing_box: 'Thùng thiếu ở kho phụ',
  damaged_box: 'Thùng hỏng ở kho phụ',
  delivery_failed: 'Giao không thành công',
  cold_discard: 'QC hủy hàng (vượt nhiệt)'
};

export const FAIL_REASON = { unreachable: 'Không liên lạc được', wrong_address: 'Sai địa chỉ', customer_reschedule: 'Khách hẹn lại' };

export const WAIT_REASON = {
  waiting_truck: 'Chờ xe về kho phụ',
  box_missing: 'Thùng thiếu / hỏng',
  seafood: 'Chưa ghép hải sản',
  exception: 'Đang có ngoại lệ'
};

export const ROUTE_STATUS = { planned: 'Đã lập, chưa xuất kho', dispatched: 'Đang giao', done: 'Đã xong' };
export const STOP_STATUS = { planned: 'Chờ xuất kho', pending: 'Chờ giao', delivered: 'Đã giao', failed: 'Không giao được', moved: 'Đã chuyển', unrouted: 'Chưa lên tuyến' };
export const STOP_PILL = { planned: '', pending: 'ops-pill-warn', delivered: 'ops-pill-ok', failed: 'ops-pill-bad', moved: '' };

// Mã lỗi của máy chủ (nhóm logistics, C16) thành câu tiếng Việt cho người đứng ở kho / ngoài đường. Mã lạ thì dùng lời nhắn của máy chủ.
const LOGISTICS_ERRORS = {
  NETWORK_ERROR: 'Không kết nối được máy chủ. Thử lại sau.',
  UPLOAD_FAILED: 'Không tải được ảnh lên. Chụp lại rồi thử lại.',
  PHOTO_INVALID: 'Ảnh không đúng định dạng. Chụp lại.',
  PHOTO_REQUIRED: 'Cần chụp ảnh trước khi xác nhận.',
  ARRIVAL_CLOSED: 'Chuyến này đã chốt nhận xe.',
  ARRIVAL_INVALID: 'Thông tin nhận xe chưa hợp lệ.',
  TRIP_NOT_DEPARTED: 'Chuyến xe này chưa xuất bến từ xưởng.',
  TRIP_INVALID: 'Thông tin chuyến xe chưa hợp lệ.',
  SEAFOOD_INVALID: 'Số liệu hải sản chưa hợp lệ.',
  SEAFOOD_INCOMPLETE: 'Chưa ghép đủ hải sản cho thùng này.',
  BOX_NOT_AT_HUB: 'Thùng này chưa về tới kho phụ.',
  ROUTE_NOT_FOUND: 'Không tìm thấy tuyến này (có thể đã được lập lại).',
  ROUTE_STATE: 'Tuyến này không còn ở trạng thái cho phép thao tác.',
  NOT_SORTED: 'Còn thùng chưa chia vào tuyến.',
  TEMP_REQUIRED: 'Nhập nhiệt độ trước khi xuất kho.',
  ORDER_ON_HOLD: 'Có thùng đang bị giữ vì thu hồi lô nguyên liệu.',
  SHIPPER_NOT_FOUND: 'Không tìm thấy shipper.',
  NOT_YOUR_STOP: 'Điểm giao này không thuộc tuyến của bạn.',
  STOP_STATE: 'Điểm giao này đã được xử lý.',
  REASON_INVALID: 'Chọn lý do không giao được.',
  CALL_REQUIRED: 'Cần gọi khách ít nhất một lần trước khi báo không liên lạc được.',
  EXCEPTION_NOT_FOUND: 'Không tìm thấy ngoại lệ này.',
  RESOLVE_INVALID: 'Cách xử lý chưa hợp lệ cho ngoại lệ này.',
  ALERT_NOT_FOUND: 'Không tìm thấy cảnh báo nhiệt độ này.',
  DECISION_INVALID: 'Quyết định chưa hợp lệ.',
  COST_INVALID: 'Số chi phí chưa hợp lệ.',
  CAPACITY_INVALID: 'Sức chứa chưa hợp lệ.',
  ZONE_NOT_FOUND: 'Không tìm thấy khu giao này.',
  RECOVERY_INVALID: 'Số thùng xốp / túi gel thu về chưa hợp lệ.',
  RECOVERY_EXCEEDS: 'Số thu về nhiều hơn số đã giao.',
  FORBIDDEN: 'Tài khoản này không có quyền thao tác này.'
};

export function logisticsError(e) {
  if (e && LOGISTICS_ERRORS[e.code] && e.code !== 'CAPACITY_BELOW_USED') return LOGISTICS_ERRORS[e.code];
  return (e && e.message) || 'Không thực hiện được.';
}

/** Mã tuyến của máy chủ là "<lô>:<khung>:<tuyến>"; người dùng chỉ cần phần cuối ("R-Q2-THAODIEN~2"). */
export const routeLabel = (id) => (typeof id === 'string' && id.includes(':') ? id.slice(id.lastIndexOf(':') + 1) : id || '');

/** Điểm giao có cần ảnh bằng chứng không: mặc định CÓ (hướng dẫn mặc định của khách là "để ở lễ tân + shipper chụp ảnh"); chỉ khi máy chủ báo rõ photoRequired=false mới được bỏ. */
export const photoRequired = (stop) => !stop || stop.photoRequired !== false;
