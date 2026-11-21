// Logic thuần cho nút "Chốt sổ" của màn Kế hoạch (rule 3: chốt sổ cứng).
// Trạng thái lô lấy từ máy chủ (DRAFT -> LOCKED -> PREPPING ...); giờ chốt cấu hình ở máy chủ (mặc định 08:00 ngày D-2).
// Chốt TRƯỚC giờ chốt cần xác nhận (force) và lý do; máy chủ ghi nhật ký. Web không tự quyết định ai được chốt: chỉ ẩn nút theo quyền.

export const BATCH_PHASE = { open: 'open', locked: 'locked', prepping: 'prepping', closed: 'closed' };

/** Trạng thái lô + hành động còn làm được. `batch` có thể null (ngày chưa có lô = chưa ai chốt). */
export function cutoffState({ batch, cutoffAt, now }) {
  const status = batch ? batch.status : 'DRAFT';
  const cutoffMs = cutoffAt ? Date.parse(cutoffAt) : NaN;
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  const early = Number.isFinite(cutoffMs) && Number.isFinite(nowMs) ? nowMs < cutoffMs : false;
  const phase = status === 'DRAFT' ? BATCH_PHASE.open : status === 'LOCKED' ? BATCH_PHASE.locked : status === 'PREPPING' ? BATCH_PHASE.prepping : BATCH_PHASE.closed;
  return {
    phase,
    status,
    early,
    canLock: phase === BATCH_PHASE.open,
    canStartPrep: phase === BATCH_PHASE.locked,
    // Chốt sớm: bắt buộc nhập lý do, gửi kèm force
    needsReason: phase === BATCH_PHASE.open && early,
    pendingExceptions: batch ? Number(batch.pending_exceptions) || 0 : 0
  };
}

/** Thân yêu cầu chốt sổ. Chốt sớm mà thiếu lý do thì ném lỗi (không gọi máy chủ). */
export function lockRequest({ date, early, reason = '' }) {
  if (!early) return { date, force: false, reason: '' };
  const r = String(reason).trim();
  if (!r) {
    const e = new Error('Chốt sớm hơn giờ chốt sổ cần ghi lý do.');
    e.code = 'REASON_REQUIRED';
    throw e;
  }
  return { date, force: true, reason: r };
}

const MESSAGES = {
  CUTOFF_NOT_REACHED: 'Chưa tới giờ chốt sổ. Chốt sớm cần ghi lý do.',
  BATCH_NOT_FOUND: 'Ngày này chưa có đơn nào để chốt.',
  FORBIDDEN: 'Vai trò của bạn không được chốt sổ.'
};
export const lockErrorMessage = (e) => (e && MESSAGES[e.code]) || (e && e.message) || 'Không chốt được sổ.';

/** Kết quả chốt thành câu ngắn cho người vận hành. */
export function lockSummary(r) {
  if (!r) return '';
  if (r.already_locked) return 'Ngày này đã được chốt trước đó.';
  const parts = [`Đã chốt ${r.locked_weeks} đơn`];
  if (r.unpaid_weeks) parts.push(`${r.unpaid_weeks} đơn chưa trả tiền được giữ lại`);
  return `${parts.join(', ')}.`;
}
