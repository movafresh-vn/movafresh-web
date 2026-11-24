// Sản lượng thực tế so hệ số chuẩn (rule 7). Máy chủ tính cờ (lệch tương đối > 5%); web chỉ hiển thị và đổi kg sang gram.
export const toGrams = (kg) => Math.round(Number(kg) * 1000);

/** Kiểm đầu vào trước khi gửi. Trả chuỗi lỗi hoặc ''. */
export function checkYieldInput({ skuId, rawKg, netKg }) {
  if (!skuId) return 'Chọn nguyên liệu.';
  const raw = toGrams(rawKg);
  const net = toGrams(netKg);
  if (!(raw > 0)) return 'Khối lượng nguyên liệu thô nhận vào phải lớn hơn 0 kg.';
  if (!(net > 0)) return 'Khối lượng thành phẩm sau sơ chế phải lớn hơn 0 kg.';
  if (net > raw) return 'Thành phẩm không thể nặng hơn nguyên liệu thô.';
  return '';
}

/** Một dòng nhật ký sản lượng thành dữ liệu hiển thị (phần trăm, cờ). */
export function describeYield(row) {
  const pct = (bp) => Math.round(bp) / 100;
  return {
    id: row.id,
    skuId: row.sku_id,
    rawKg: row.raw_received_g / 1000,
    netKg: row.net_prepped_g / 1000,
    actualPct: pct(row.actual_yield_bp),
    standardPct: pct(row.standard_yield_bp),
    variancePct: pct(row.variance_bp),
    flagged: Boolean(row.flagged),
    lotQrCode: row.lot_qr_code || null,
    at: row.at
  };
}
