import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd(), 'src');
const SYNC = ['reset']; // hàm đồng bộ có chủ ý

/**
 * Quét mã nguồn: mọi lời gọi `api.customer.xxx(` phải được chờ (await), trả về (return / mũi tên) hoặc nằm trong Promise.all/allSettled.
 * Và không được đọc `.data` / `.status` / `.error` trực tiếp trên kết quả chưa chờ (kiểu đồng bộ của bản giả lập cũ).
 * Trả danh sách vi phạm "tệp:dòng: nội dung".
 */
export function scanUnawaited(relPath) {
  const text = readFileSync(resolve(ROOT, relPath), 'utf8');
  const lines = text.split(/\r?\n/);
  const bad = [];
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|<!--)/.test(line)) return;
    for (const m of line.matchAll(/api\.customer\.(\w+)\(/g)) {
      if (SYNC.includes(m[1])) continue;
      const before = line.slice(0, m.index);
      const awaited = /await\s*\(?\s*$/.test(before);
      const returned = /(\breturn|=>)\s*$/.test(before);
      const grouped = /Promise\.(all|allSettled)\(/.test(line) || (/^\s*$/.test(before) && /Promise\.(all|allSettled)\(\[\s*$/.test(lines[i - 1] || ''));
      if (!awaited && !returned && !grouped) bad.push(`${relPath}:${i + 1}: ${line.trim()}`);
    }
    if (/api\.customer\.\w+\([^)]*\)\s*\.(data|status|error)\b/.test(line)) bad.push(`${relPath}:${i + 1}: đọc đồng bộ ${line.trim()}`);
  });
  return bad;
}

export const read = (relPath) => readFileSync(resolve(ROOT, relPath), 'utf8');

// Các hàm api.ops đã chạy trên backend thật (bất đồng bộ). Nhóm còn ở bản giả lập (kho phụ tồn/thu hồi/nhận xe, logistics, finance, demo) không nằm đây.
const REAL_OPS = String.raw`(?:summary|me|planning\.\w+|factory\.\w+|listOrders|listProductionPlans|getProductionPlan|batches\.\w+|paymentExceptions\.\w+|shortPick\.\w+|uploads\.\w+|costing\.\w+|cycleCapacity\.\w+|handovers\.\w+|transitionOrder|substituteDish|saveLot|listLots|listPurchaseOrders|listSuppliers|procurement\.\w+|supplierPortal\.\w+|hub\.(?:receivable|receive|receipts))`;
const CALL = new RegExp(String.raw`api\.ops\.${REAL_OPS}\(`, 'g');
const READ_SYNC = new RegExp(String.raw`api\.ops\.${REAL_OPS}\([^)]*\)\s*\.(?!then|catch)\w+`);

/** Giống scanUnawaited nhưng cho api.ops.<hàm đã chuyển>(: phải await / return / mũi tên / Promise.all, không đọc kết quả đồng bộ. */
export function scanUnawaitedOps(relPath, source = null) {
  const text = source ?? readFileSync(resolve(ROOT, relPath), 'utf8');
  const lines = text.split(/\r?\n/);
  const bad = [];
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|<!--)/.test(line)) return;
    for (const m of line.matchAll(CALL)) {
      const before = line.slice(0, m.index);
      const awaited = /await\s*\(?\s*$/.test(before);
      const returned = /(\breturn|=>)\s*$/.test(before);
      const grouped = /Promise\.(all|allSettled)\(/.test(line) || (/^\s*$/.test(before) && /Promise\.(all|allSettled)\(\[\s*$/.test(lines[i - 1] || ''));
      if (!awaited && !returned && !grouped) bad.push(`${relPath}:${i + 1}: ${line.trim()}`);
    }
    if (READ_SYNC.test(line) && !/await/.test(line)) bad.push(`${relPath}:${i + 1}: đọc đồng bộ ${line.trim()}`);
  });
  return bad;
}
