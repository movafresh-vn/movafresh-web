import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { read, scanUnawaitedOps } from './helpers/asyncScan';
import { SUPPLIER_ROUTES } from '../api/opsRoutes';

const BACKEND = resolve(process.cwd(), '../movafresh-platform');
const have = existsSync(join(BACKEND, 'backend/src/routes/supplier.ts'));

describe('W5-02: cổng nhà cung cấp chạy trên backend thật', () => {
  it('W5-02: màn cổng nhà cung cấp chờ mọi lời gọi API (overview, xác nhận PO, hóa đơn, khiếu nại, liên hệ, giấy chứng nhận)', () => {
    expect(scanUnawaitedOps('ops/views/supplier/SupplierPortalView.vue')).toEqual([]);
    const t = read('ops/views/supplier/SupplierPortalView.vue');
    expect(t).toMatch(/async function load\(\)/);
    expect(t).toMatch(/async function guard\(/);
    expect(t).toContain('await fn()');
  });

  it('W5-02: bảng đường của cổng nằm dưới /supplier, không trùng cặp HTTP + đường', () => {
    const seen = new Set();
    for (const [name, [method, path]] of Object.entries(SUPPLIER_ROUTES)) {
      expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], name).toContain(method);
      expect(path.startsWith('/supplier/'), name).toBe(true);
      expect(seen.has(`${method} ${path}`), name).toBe(false);
      seen.add(`${method} ${path}`);
    }
  });

  it.skipIf(!have)('W5-02: mọi đường của cổng có thật trong routes/supplier.ts của backend', () => {
    const src = readFileSync(join(BACKEND, 'backend/src/routes/supplier.ts'), 'utf8');
    const server = new Set([...src.matchAll(/\br\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map((m) => `${m[1].toUpperCase()} ${m[2]}`));
    for (const [name, [method, path]] of Object.entries(SUPPLIER_ROUTES)) expect(server.has(`${method} ${path}`), `${name}: ${method} ${path}`).toBe(true);
  });

  it('W5-02: màn cổng không tự lọc dữ liệu theo nhà cung cấp phía trình duyệt: id nhà cung cấp chỉ đi qua as_supplier_id của admin', () => {
    const t = read('ops/views/supplier/SupplierPortalView.vue');
    expect(t).toContain('asSupplierId');
    // nhà cung cấp thật không có ô chọn nhà cung cấp; chỉ admin chọn để xem thử
    expect(t).toMatch(/isAdmin/);
  });
});
