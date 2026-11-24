// Lỗi nghiệp vụ ở phễu thanh toán → thông báo tiếng Việt và cách phục hồi (không hiện thông báo thô của máy chủ).
// Mã lấy từ docs/api-contract.json của backend.

/** Khóa lưu trạng thái phễu /plans (cùng khóa với usePlanFlowStore). */
export const PLAN_FLOW_KEY = 'mova_plans_flow_v2';

export const PAYMENT_TOKEN_REQUIRED = 'PAYMENT_TOKEN_REQUIRED';

const MESSAGES = {
  PAYMENT_TOKEN_REQUIRED: 'Bạn chưa liên kết thẻ hoặc ví đối tác. Hãy liên kết thẻ/ví để trừ tiền định kỳ, hoặc chọn cách thanh toán khác bên dưới.',
  PHONE_NOT_VERIFIED: 'Số điện thoại của bạn chưa được xác thực. Tài khoản đăng nhập bằng Google cần xác thực số điện thoại ở mục 2 (Nơi nhận hàng) bằng mã OTP trước khi thanh toán.',
  MENU_LOCKED: 'Tuần này đã được chốt món theo ưu đãi nên không đổi món được nữa.',
  TOPUP_AMOUNT_NOT_ALLOWED: 'Chỉ mua được các Gói Suất ăn trả trước có sẵn, không nạp số tiền tùy ý.'
};

/** Thông báo cho một mã lỗi; mã lạ thì dùng `fallback` (thông báo máy chủ trả). */
export function checkoutErrorMessage(code, fallback = '') {
  return MESSAGES[code] || fallback || 'Có lỗi xảy ra, bạn thử lại nhé.';
}

/**
 * Phục hồi khi máy chủ báo PAYMENT_TOKEN_REQUIRED (chọn "Thẻ / Ví" mà chưa liên kết token): đưa lựa chọn về Fresh Credit để
 * danh sách phương thức vẫn hiện và tính được giá. Sửa trực tiếp object `checkout` (state của store) và trả về nó.
 */
export function recoverFromTokenRequired(checkout) {
  checkout.method = 'fresh_credit';
  checkout.packId = 'exact';
  return checkout;
}

/**
 * Xóa lựa chọn phương thức đã lưu trong bộ nhớ phễu (mova_plans_flow_v2) để tải lại trang không kẹt ở "Thẻ / Ví".
 * `storage` được truyền từ store (nơi được phép truy cập kho cục bộ); lỗi chế độ riêng tư bị bỏ qua. Trả true nếu có sửa.
 */
export function clearPersistedPaymentChoice(storage = null) {
  if (!storage) return false;
  try {
    const raw = storage.getItem(PLAN_FLOW_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved || !saved.checkout) return false;
    saved.checkout.method = 'fresh_credit';
    saved.checkout.packId = 'exact';
    storage.setItem(PLAN_FLOW_KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}
