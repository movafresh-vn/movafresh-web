// Hàng chờ thanh toán muộn (rule 3): tiền về SAU khi lô đã khóa thì KHÔNG tự nhét vào lô; admin quyết định nhận hay từ chối.
export const STATUS_LABEL = {
  pending_review: 'Chờ duyệt',
  accepted: 'Đã nhận vào lô',
  rolled_over: 'Đã dời sang ngày giao khác',
  credited: 'Đã hoàn vào Fresh Credit'
};

export const OUTCOME_TEXT = {
  accepted: 'Đã nhận đơn vào lô đã khóa; BOM tăng đúng phần chênh và có lệnh mua bổ sung.',
  rolled_over: 'Đã dời đơn sang ngày giao kế tiếp còn chỗ, tiền đi theo đơn. Khách đã được báo.',
  credited: 'Không còn ngày nào còn chỗ nên đã hoàn tiền vào Fresh Credit (hoàn được khi dừng gói). Khách đã được báo.'
};

export const isPending = (ex) => ex.status === 'pending_review';
export const statusLabel = (s) => STATUS_LABEL[s] || s;
export const sourceLabel = (s) => (s === 'bank_transfer' ? 'Chuyển khoản' : s === 'card' ? 'Thẻ' : s);

/** Kết quả của accept/reject thành câu cho người duyệt. */
export function outcomeText(result) {
  const status = result && (result.status || result.outcome);
  return OUTCOME_TEXT[status] || '';
}

export function decisionError(e) {
  const map = {
    PAYMENT_EXCEPTION_NOT_PENDING: 'Khoản này đã được xử lý rồi.',
    BATCH_LOCKED: 'Lô đã qua giai đoạn nhận thêm đơn, không thể nhận vào lô được nữa. Hãy từ chối để dời ngày.',
    CYCLE_FULL: 'Chu kỳ giao hôm đó đã hết sức chứa, không nhận thêm được.'
  };
  return (e && map[e.code]) || (e && e.message) || 'Không xử lý được.';
}
