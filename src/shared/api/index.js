// Mặt tiền API duy nhất của web: tên hàm giữ như trước, tất cả chạy trên backend thật qua http.js (không còn bản giả lập).
//  - api.customer: app khách; trả phong bì { status, data | error } nên errorKind() cũ vẫn dùng được.
//  - api.ops:      app vận hành; ném HttpError { code, status, details } khi lỗi.
//  - api.demo:     công cụ dev (đồng hồ, job, dữ liệu mẫu, tiền ngân hàng giả); chỉ có khi máy chủ bật DEV_TOOLS_ENABLED.
// Đăng nhập: khách = Supabase phone OTP (stores/useMovaStore), nhân viên = email + mật khẩu (ops/session.js).
import { createCustomerApi } from './customerApi';
import { createOpsApi } from './opsApi';
import { createDevApi } from './devApi';
import { HttpError } from './http';

export { HttpError };

export const api = { customer: createCustomerApi(), ops: createOpsApi(), demo: createDevApi() };
