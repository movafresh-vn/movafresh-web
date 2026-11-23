// Nhãn thùng in được (rule 5/7): Order_Code, Batch_ID, Route_ID và Lot_IDs. TUYỆT ĐỐI không có tên, SĐT hay địa chỉ khách:
// dữ liệu nhãn đến từ GET /ops/batches/:date/labels và máy chủ đã loại sẵn; hàm dưới đây chỉ chọn đúng các trường được in.
export const LABEL_FIELDS = ['order_code', 'batch_id', 'route_id', 'lot_ids'];

/** Chỉ giữ các trường được phép in (phòng thủ nếu máy chủ sau này thêm trường). */
export function printableLabel(l) {
  return {
    orderCode: l.order_code,
    batchId: l.batch_id,
    routeId: l.route_id || null,
    lotIds: Array.isArray(l.lot_ids) ? [...l.lot_ids] : [],
    stopSeq: l.stop_seq ?? null,
    printCode: l.print_code || [l.order_code, l.batch_id, l.route_id].join('|')
  };
}

/** Nhãn theo mã đơn, để ghép vào phiếu nhặt của xưởng. */
export function labelsByOrder(data) {
  const out = {};
  for (const l of (data && data.labels) || []) out[l.order_code] = printableLabel(l);
  return out;
}
