import { describe, expect, it } from 'vitest';
import { read, scanUnawaited } from './helpers/asyncScan';

const FILES = [
  'components/dashboard/CreditTab.vue',
  'components/dashboard/MealChangeSheet.vue',
  'components/dashboard/ProfileTab.vue',
  'components/dashboard/RatingCard.vue',
  'components/dashboard/RenewCard.vue',
  'components/dashboard/RewardsTab.vue',
  'components/dashboard/SkipSheet.vue',
  'components/dashboard/StopPlanSheet.vue',
  'components/dashboard/WeeksTab.vue',
  'components/modals/TopupModal.vue',
  'components/modals/LoginModal.vue',
  'views/QrTraceView.vue',
  'views/DashboardView.vue',
  'App.vue'
];

describe('W3-01: màn tài khoản chờ mọi lời gọi API', () => {
  it('W3-01: không có lời gọi api.customer nào bị bỏ quên await và không đọc kết quả đồng bộ', () => {
    expect(FILES.flatMap((f) => scanUnawaited(f))).toEqual([]);
  });

  it('W3-01: không truyền mã khách vào API nữa (danh tính lấy từ phiên đăng nhập)', () => {
    for (const f of FILES) expect(read(f), f).not.toMatch(/customer_id:\s*store\.customerId|\(store\.customerId\)/);
  });

  it('W3-01: không còn đăng nhập demo, tài khoản mẫu hay bảng demo trong trang tài khoản', () => {
    expect(read('components/modals/LoginModal.vue')).not.toMatch(/sampleAccounts|loginAs|loginWithContact|quickSocialLogin/);
    expect(read('views/DashboardView.vue')).not.toMatch(/DemoTools/);
    expect(read('stores/useMovaStore.js')).not.toMatch(/loginAs|loginWithContact|resolveCustomer|customer\.tick/);
  });

  it('W3-01: không có chữ "ví", COD hay "AI" trong lời nhắn mới cho khách (quy định AGENTS.md)', () => {
    for (const f of ['components/modals/TopupModal.vue', 'components/modals/LoginModal.vue', 'components/dashboard/WeekCard.vue', 'components/plans/StepCheckout.vue']) {
      const text = read(f).replace(/<style[\s\S]*<\/style>/, '').replace(/<script[\s\S]*?<\/script>/g, '');
      expect(text, f).not.toMatch(/\bví\b(?! đối tác)/i);
      expect(text, f).not.toMatch(/\bCOD\b|thanh toán khi nhận/i);
      expect(text, f).not.toMatch(/\bAI\b/);
    }
  });
});
