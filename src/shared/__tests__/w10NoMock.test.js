import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(process.cwd(), 'src');
// Ghép chuỗi để chính tệp này không chứa các từ khóa nó đi tìm.
const WORDS = ['mock' + '-server', 'createMemory' + 'Storage', 'getServer' + '\\('];
const FORBIDDEN = new RegExp(WORDS.join('|'));

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const rel = (p) => p.slice(SRC.length + 1).replace(/\\/g, '/');
const all = walk(SRC);
const code = all.filter((p) => /\.(js|vue)$/.test(p) && !rel(p).includes('__tests__'));
const sourceCache = new Map();
const text = (p) => {
  if (!sourceCache.has(p)) sourceCache.set(p, readFileSync(p, 'utf8'));
  return sourceCache.get(p);
};

describe('W10-01: không còn mock server hay dữ liệu giả', () => {
  it('W10-01: các tệp mock đã bị xóa', () => {
    for (const p of [
      'shared/mock' + '-server', 'shared/api/customer.js', 'shared/api/customerAccount.js', 'shared/api/opsFactory.js', 'shared/api/opsFinance.js',
      'shared/api/opsLogistics.js', 'shared/api/opsProcurement.js', 'shared/api/views.js', 'shared/data/traceScenario.js', 'shared/data/logisticsScenario.js',
      'shared/data/procurementSeed.js', 'shared/domain/jobs.js', 'shared/domain/opsEvents.js', 'shared/domain/procurementOps.js', 'shared/domain/recallOps.js',
      'shared/domain/financeOps.js', 'shared/domain/logisticsOps.js', 'components/dashboard/DemoTools.vue'
    ]) expect(existsSync(join(SRC, p)), p).toBe(false);
  });

  it('W10-01: không tệp nguồn nào nhắc máy chủ giả lập hay kho bộ nhớ giả', () => {
    for (const p of code) {
      const t = text(p);
      expect(FORBIDDEN.test(t), rel(p)).toBe(false);
    }
  }, 20_000);

  it('W10-01: mọi import tương đối đều trỏ tới tệp còn tồn tại (không import module đã xóa)', () => {
    const exts = ['', '.js', '.vue', '/index.js', '.css'];
    for (const p of code) {
      for (const m of text(p).matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const base = resolve(p, '..', m[1]);
        expect(exts.some((e) => existsSync(base + e)), `${rel(p)} -> ${m[1]}`).toBe(true);
      }
    }
  }, 20_000);

  it('W10-01: web không giữ kho dữ liệu cục bộ: localStorage chỉ cho bản nháp phễu /plans và hàng đợi offline của xưởng', () => {
    const allowed = new Set(['ops/queue.js', 'shared/api/planDraft.js', 'shared/domain/offlineQueue.js', 'shared/domain/checkoutError.js', 'stores/usePlanFlowStore.js']);
    for (const p of code) {
      if (/localStorage|indexedDB/.test(text(p))) expect(allowed.has(rel(p)), `${rel(p)} dùng localStorage`).toBe(true);
    }
  });

  it('W10-01: đăng nhập vận hành không còn PIN, bản giả lập auth.login hay mã PIN trong cấu hình', () => {
    const roles = text(join(SRC, 'shared/config/roles.js'));
    expect(roles).not.toMatch(/\bpin\b/i);
    expect(text(join(SRC, 'shared/data/catalog.js'))).not.toMatch(/\bpin:/);
    expect(text(join(SRC, 'shared/config/business.js'))).not.toMatch(/\bpin:/);
    expect(text(join(SRC, 'shared/api/index.js'))).not.toMatch(/auth\s*:|login\(pin/);
  });

  it('W10-01: mặt tiền api chỉ có customer, ops và demo (công cụ dev), tất cả chạy qua http.js', () => {
    const idx = text(join(SRC, 'shared/api/index.js'));
    expect(idx).toMatch(/export const api = \{ customer: createCustomerApi\(\), ops: createOpsApi\(\), demo: createDevApi\(\) \}/);
    expect(idx).not.toMatch(/createServer|mockApi/);
  });
});
