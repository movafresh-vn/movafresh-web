import { fmt } from '../shared/utils/formatters';

// Mã lỗi của máy chủ (nhóm tài chính, C17) thành câu tiếng Việt cho kế toán. Mã lạ thì dùng lời nhắn của máy chủ.
const FINANCE_ERRORS = {
  NETWORK_ERROR: 'Không kết nối được máy chủ. Thử lại sau.',
  FORBIDDEN: 'Tài khoản này không có quyền thao tác này.',
  ADJUST_INVALID: 'Đề nghị điều chỉnh chưa hợp lệ: kiểm tra khách, ngăn, số tiền và lý do.',
  ADJUST_NOT_FOUND: 'Không tìm thấy đề nghị điều chỉnh này.',
  ADJUST_STATE: 'Đề nghị này đã được xử lý theo hướng khác.',
  SELF_APPROVE: 'Người đề nghị không được tự duyệt. Cần một admin khác duyệt.',
  TXN_INVALID: 'Giao dịch chưa hợp lệ: mã giao dịch 4–100 ký tự, số tiền là số nguyên dương.',
  TXN_NOT_FOUND: 'Không tìm thấy giao dịch ngân hàng này.',
  TXN_STATE: 'Giao dịch này không còn trong hàng chờ khớp tay.',
  LEDGER_NOT_FOUND: 'Khoản chờ tiền về này không còn (đã hết hạn hoặc đã trả).',
  ALREADY_MATCHED: 'Giao dịch này đã được khớp trước đó.',
  NOTE_REQUIRED: 'Cần ghi lý do.',
  SETTINGS_INVALID: 'Cài đặt chưa hợp lệ.',
  CASH_OVER_LIMIT: 'Tiền mặt từ 5.000.000đ không được chi: chuyển khoản để còn khấu trừ VAT.'
};

/** Câu báo lỗi cho các màn tài chính. Số tiền lệch của AMOUNT_DIFF được nêu rõ. */
export function financeError(e) {
  if (e && e.code === 'AMOUNT_DIFF') {
    const d = e.details && e.details.diffVnd;
    return `Số tiền phải đúng bằng giá gói hoặc tổng tuần chưa trả${typeof d === 'number' ? ` (đang lệch ${d > 0 ? '+' : '−'}${fmt(Math.abs(d))})` : ''}. Hệ thống không nhận số tiền lẻ; liên hệ khách để chuyển đúng số.`;
  }
  if (e && FINANCE_ERRORS[e.code]) return FINANCE_ERRORS[e.code];
  return (e && e.message) || 'Không thực hiện được.';
}

/**
 * Ô "Sổ Fresh Credit" ở màn tổng quan (W8.3): xanh khi mọi khách khớp sổ, đỏ kèm số khách lệch.
 * Nhận kết quả GET /ops/finance/credit/integrity { ok, users_checked, mismatches: [...] }; null khi chưa tải được.
 */
export function integrityTile(v) {
  if (!v) return { tone: 'unknown', title: 'Sổ Fresh Credit', big: '—', detail: 'Chưa kiểm được' };
  const bad = Array.isArray(v.mismatches) ? v.mismatches.length : Number(v.mismatches) || 0;
  if (v.ok && bad === 0) return { tone: 'ok', title: 'Sổ Fresh Credit', big: 'Khớp', detail: `${v.users_checked} tài khoản đã kiểm, không lệch đồng nào`, mismatches: 0 };
  return { tone: 'bad', title: 'Sổ Fresh Credit', big: `${bad} lệch`, detail: `${bad} / ${v.users_checked} tài khoản lệch sổ: kiểm ngay`, mismatches: bad };
}
