import { describe, expect, it } from 'vitest';
import { read, scanUnawaited } from './helpers/asyncScan';

const FILES = [
  'stores/usePlanFlowStore.js',
  'stores/useMovaStore.js',
  'components/plans/StepAbout.vue',
  'components/plans/StepMenu.vue',
  'components/plans/StepCheckout.vue',
  'components/plans/StepDone.vue',
  'components/plans/MealCard.vue',
  'views/PlansView.vue'
];

describe('W2-01: phễu /plans chờ mọi lời gọi API', () => {
  it('W2-01: không có lời gọi api.customer nào bị bỏ quên await và không đọc kết quả đồng bộ', () => {
    const bad = FILES.flatMap((f) => scanUnawaited(f));
    expect(bad).toEqual([]);
  });

  it('W2-01: bộ quét thật sự bắt được lỗi (kiểm tra chính bộ quét)', async () => {
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join, relative, resolve } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'scan-'));
    const p = join(dir, 'x.js');
    writeFileSync(p, ['const a = api.customer.getAccount();', 'const b = await api.customer.myWeeks();', 'return api.customer.rewards();', 'const c = api.customer.previewSkip(r).data;', 'await Promise.all([', '  api.customer.rewards(),', ']);'].join('\n'));
    const rel = relative(resolve(process.cwd(), 'src'), p);
    const bad = scanUnawaited(rel);
    expect(bad).toHaveLength(3);
    expect(bad[0]).toMatch(/:1:/);
    expect(bad.slice(1).every((x) => /:4:/.test(x))).toBe(true);
    expect(bad.some((x) => /đọc đồng bộ/.test(x))).toBe(true);
  });

  it('W2-01: các hàm của store phễu là async (trả Promise)', () => {
    const src = read('stores/usePlanFlowStore.js');
    for (const name of ['saveContact', 'submitProfile', 'joinWaitlist', 'reloadPlan', 'configure', 'applyChefMenu', 'useSuggestedMenu', 'loadOptions', 'loadPreview', 'loadCapacity', 'submitOrder']) {
      expect(src.includes(`async ${name}(`), name).toBe(true);
    }
  });

  it('W2-01: phễu không còn đăng nhập giả bằng email tự dựng', () => {
    expect(read('components/plans/StepAbout.vue')).not.toMatch(/quickSocialLogin|@movafresh\.vn/);
  });
});
