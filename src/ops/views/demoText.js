// Câu thông báo của bảng demo, tách ra để test không cần dựng giao diện.
const JOB_LABEL = {
  'charge-due': 'lần trừ tiền',
  'lock-due-batches': 'lần chốt sổ',
  'renewal-reminders': 'lần nhắc gia hạn',
  'issue-invoices': 'lần xuất hóa đơn'
};

/** Kết quả đổi đồng hồ / chạy job: `fired` là danh sách {job, ...số đếm} do máy chủ trả. */
export function demoSummary(r) {
  if (!r) return 'Xong.';
  if (r.target === null) return 'Không còn mốc nào phía trước.';
  const fired = Array.isArray(r.fired) ? r.fired : [];
  if (!fired.length) return 'Đã đổi giờ; không có job nào đến hạn.';
  const parts = fired.map((f) => `${JOB_LABEL[f.job] || f.job}${f.error ? ' (lỗi)' : ''}`);
  return `Đã chạy: ${parts.join(', ')}.`;
}

/** Kết quả POST /dev/bank-transfer: {transaction, webhook:{http_status, body:{result}}}. */
export function bankSummary(r) {
  const t = r && r.transaction ? r.transaction : {};
  const w = r && r.webhook ? r.webhook : {};
  const amount = Number(t.amount_vnd || 0).toLocaleString('vi-VN');
  const result = w.body && w.body.result ? w.body.result : w.http_status >= 400 ? `lỗi ${w.http_status}` : 'đã nhận';
  return `Ngân hàng báo ${amount}đ nội dung "${t.content || ''}": ${result}.`;
}
