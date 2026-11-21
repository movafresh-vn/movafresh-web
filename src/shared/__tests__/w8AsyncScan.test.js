import { describe, expect, it } from 'vitest';
import { read, scanUnawaitedOps } from './helpers/asyncScan';

// W8.1: tài chính, giám sát nhà cung cấp và tổng quan founder chạy trên backend thật,
// nên mọi lời gọi api.ops.finance / monitoring / overview phải được chờ.
const FILES = [
  'ops/views/finance/CashflowView.vue',
  'ops/views/finance/CreditLedgerView.vue',
  'ops/views/finance/FinSettingsView.vue',
  'ops/views/finance/FinanceLayout.vue',
  'ops/views/finance/JournalView.vue',
  'ops/views/finance/MarginView.vue',
  'ops/views/finance/PayablesFinView.vue',
  'ops/views/finance/ReconcileView.vue',
  'ops/views/finance/RevenueView.vue',
  'ops/views/ScorecardView.vue',
  'ops/views/HomeView.vue',
  'ops/views/DemoView.vue'
];

describe('W8-01: màn tài chính, giám sát và tổng quan chờ mọi lời gọi API', () => {
  it('W8-01: không lời gọi api.ops.finance / monitoring / overview nào bị bỏ quên await và không đọc kết quả đồng bộ', () => {
    expect(FILES.flatMap((f) => scanUnawaitedOps(f))).toEqual([]);
  });

  it('W8-01: bộ quét bắt lỗi của nhóm tài chính và cho qua cách viết đúng', () => {
    const bad = [
      'data.value = api.ops.finance.cashflow(ctx.value);',
      'const t = api.ops.finance.cashflow(ctx.value).today;',
      'api.ops.finance.decideAdjustment(ctx.value, { id, approve });',
      'o.value = api.ops.overview.founder(ctx.value);',
      'data.value = api.ops.monitoring.scorecard(ctx.value, {});',
      'const f = api.ops.finance.journalCsv(ctx.value, q);'
    ];
    for (const line of bad) expect(scanUnawaitedOps('x.vue', line), line).not.toEqual([]);
    const good = [
      'data.value = await api.ops.finance.cashflow(ctx.value);',
      'const today = (await api.ops.finance.cashflow(ctx.value)).today;',
      '[a.value, b.value] = await Promise.all([api.ops.finance.revenue(ctx.value, {}), api.ops.finance.invoices(ctx.value)]);',
      'run(() => api.ops.finance.manualMatch(ctx.value, b), () => "ok");',
      '// api.ops.finance.cashflow(ctx.value) trong chú thích'
    ];
    for (const line of good) expect(scanUnawaitedOps('x.vue', line), line).toEqual([]);
  });

  it('W8-01: các hàm tải / ghi của màn tài chính là async', () => {
    for (const f of FILES) {
      const t = read(f);
      expect(t, f).not.toMatch(/^function (load|request|decide|issue|execute|exportFile|save|saveGeneral|saveMap|match|ignore|importLine|downloadJournal|downloadStatements|applyPreset|open)\(/m);
    }
  });

  it('W8-01: lỗi hiện bằng tiếng Việt qua financeError, không đổ thẳng e.message của máy chủ', () => {
    for (const f of FILES.filter((x) => /finance\/|ScorecardView|HomeView/.test(x) && !/FinanceLayout/.test(x))) {
      const t = read(f);
      if (/catch \(e\)/.test(t)) expect(t, f).toContain('financeError(e)');
      expect(t, f).not.toMatch(/= e\.message/);
    }
  });

  it('W8-01: màn tài chính không còn nút hay chữ "mock" cho người dùng; tiền về chỉ qua webhook hoặc dòng sao kê kế toán nhập', () => {
    for (const f of FILES.filter((x) => /finance\/|ScorecardView|HomeView/.test(x))) {
      const t = read(f);
      expect(t, f).not.toMatch(/mock|giả lập|Bản demo/i);
    }
    const rec = read('ops/views/finance/ReconcileView.vue');
    expect(rec).not.toContain('mockBankTransfer');
    expect(rec).not.toContain('acceptDiff');
    expect(rec).toContain('data-testid="import-form"');
  });

  it('W8-01: không nơi nào trong app vận hành còn gọi mockBankTransfer', () => {
    for (const f of [...FILES, 'ops/views/DemoView.vue']) expect(read(f), f).not.toContain('mockBankTransfer');
  });
});
