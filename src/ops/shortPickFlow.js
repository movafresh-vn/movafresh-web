// Hoàn tiền thiếu hàng loạt (rule 6): xem trước (không ghi gì) -> xác nhận bằng chính mã băm của bản xem trước.
// Số gram thiếu lấy từ báo cáo thiếu của xưởng (túi hoặc kg); máy chủ tự phân bổ đơn theo thứ tự mã đơn.

/** Gram thiếu của một báo cáo, hoặc null nếu mặt hàng không phải nguyên liệu SKU (xốt, hải sản kho phụ). */
export function shortageGramsOf(report, item) {
  if (!report || !item || item.type !== 'sku') return null;
  const grams = report.unit === 'kg' ? Number(report.qty) * 1000 : Number(report.qty) * Number(item.bagGrams);
  return Number.isFinite(grams) && grams > 0 ? Math.round(grams) : null;
}

export function previewSummary(p) {
  const orders = (p && p.orders) || [];
  return {
    skuId: p.sku_id,
    orders: orders.length,
    totalVnd: p.total_vnd,
    uncoveredG: p.uncovered_g,
    hash: p.preview_hash,
    realVnd: orders.reduce((s, o) => s + (o.real_vnd || 0), 0),
    promoVnd: orders.reduce((s, o) => s + (o.promo_vnd || 0), 0)
  };
}

/** Trạng thái màn: 'stale' khi bản xem trước đã cũ (phải xem lại), 'none' khi không có đơn nào để hoàn. */
export function confirmOutcome(err) {
  if (!err) return { kind: 'ok', message: '' };
  if (err.code === 'SHORT_PICK_PREVIEW_STALE') return { kind: 'stale', message: 'Số liệu đã đổi từ lúc xem trước (có đơn mới hoặc tiền đã hoàn). Hãy xem trước lại rồi xác nhận.' };
  if (err.code === 'SHORT_PICK_NO_ORDERS') return { kind: 'none', message: 'Không có đơn nào bị ảnh hưởng để hoàn tiền.' };
  if (err.code === 'FORBIDDEN') return { kind: 'forbidden', message: 'Chỉ mua hàng hoặc admin được xác nhận hoàn tiền.' };
  return { kind: 'error', message: err.message || 'Không hoàn được tiền.' };
}
