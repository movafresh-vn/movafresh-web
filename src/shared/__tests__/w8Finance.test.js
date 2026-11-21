import { describe, expect, it } from 'vitest';
import { createOpsApi } from '../api/opsApi';
import { OPS_ROUTES } from '../api/opsRoutes';
import { api } from '../api';
import { fakeHttp } from './helpers/fakeHttp';

const mk = (responses) => {
  const http = fakeHttp(responses);
  return { http, a: createOpsApi({ http }) };
};

describe('W8-api: tài chính, giám sát, tổng quan trên backend thật', () => {
  it('W8-04: mọi hàm tài chính giữ tên cũ và là hàm thật; facade chung trả Promise (bản thật phủ bản giả lập)', async () => {
    const real = createOpsApi({ http: fakeHttp({}) });
    for (const k of ['creditSummary', 'creditLedger', 'adjustments', 'requestAdjustment', 'decideAdjustment', 'reconciliation', 'bankWebhook', 'manualMatch', 'ignoreBankTxn', 'revenue', 'invoices', 'issueInvoices', 'margins', 'boxCost', 'payables', 'payRunFile', 'executePayRun', 'cashflow', 'journal', 'journalCsv', 'statementsCsv', 'settings', 'saveSettings', 'integrity'])
      expect(typeof real.finance[k], k).toBe('function');
    expect(typeof real.monitoring.scorecard).toBe('function');
    expect(typeof real.overview.founder).toBe('function');
    expect(real.finance.mockBankTransfer).toBeUndefined();
    const p = api.ops.finance.cashflow(null);
    expect(p).toBeInstanceOf(Promise);
    await p.catch(() => {}); // không có máy chủ trong test: chỉ cần là Promise
  });

  it('W8-04: bảng đường gọi tài chính có đủ và đúng HTTP', () => {
    expect(OPS_ROUTES.finManualMatch).toEqual(['POST', '/ops/finance/bank-transactions/:id/match']);
    expect(OPS_ROUTES.finDecideAdjustment).toEqual(['POST', '/ops/finance/credit/adjustments/:id/decision']);
    expect(OPS_ROUTES.finBoxCost).toEqual(['GET', '/ops/finance/box-cost/:order']);
    expect(OPS_ROUTES.finSaveSettings).toEqual(['PUT', '/ops/finance/settings']);
    expect(OPS_ROUTES.monScorecard).toEqual(['GET', '/ops/monitoring/scorecard']);
    expect(OPS_ROUTES.ovFounder).toEqual(['GET', '/ops/overview/founder']);
  });

  it('W8-04: sổ từng bút lọc theo khách (uuid) và nhóm; điều chỉnh: kế toán đề nghị, admin duyệt (thân và đường dẫn đúng)', async () => {
    const { http, a } = mk({
      'GET /ops/finance/credit/ledger': { rows: [] },
      'POST /ops/finance/credit/adjustments': { id: 'ADJ-1', status: 'pending' },
      'POST /ops/finance/credit/adjustments/ADJ-1/decision': { id: 'ADJ-1', status: 'approved', duplicate: false }
    });
    await a.finance.creditLedger(null, { customerId: 'u-1', group: 'refund', limit: 120 });
    expect(http.calls[0].query).toEqual({ customerId: 'u-1', group: 'refund', limit: 120 });
    await a.finance.requestAdjustment(null, { customerId: 'u-1', bucket: 'promo', deltaVnd: -20000, reason: 'sửa nhầm' });
    expect(http.calls[1].body).toEqual({ customerId: 'u-1', bucket: 'promo', deltaVnd: -20000, reason: 'sửa nhầm' });
    await a.finance.decideAdjustment(null, { id: 'ADJ-1', approve: true });
    await a.finance.decideAdjustment(null, { id: 'ADJ-1', approve: false, note: 'sai khách' }).catch(() => {});
    expect(http.calls[2].body).toEqual({ approve: true });
    expect(http.calls[3].body).toEqual({ approve: false, note: 'sai khách' });
  });

  it('W8-04: khớp tay chỉ gửi mã khoản chờ + ghi chú (KHÔNG có acceptDiff); loại giao dịch gửi lý do; nhập dòng sao kê giữ mã giao dịch làm khóa idempotency', async () => {
    const { http, a } = mk({
      'POST /ops/finance/bank-transactions/42/match': { id: '42', status: 'matched' },
      'POST /ops/finance/bank-transactions/42/ignore': { id: '42', status: 'ignored' },
      'POST /ops/finance/bank-transactions': { txn: { id: '9' }, result: {}, duplicate: false }
    });
    await a.finance.manualMatch(null, { bankId: '42', ledgerId: 'pack:7', note: 'đã gọi khách', acceptDiff: true });
    expect(http.calls[0].body).toEqual({ ledgerId: 'pack:7', note: 'đã gọi khách' });
    await a.finance.ignoreBankTxn(null, { bankId: '42', note: 'không phải của MOVA' });
    expect(http.calls[1].body).toEqual({ note: 'không phải của MOVA' });
    await a.finance.bankWebhook(null, { txnId: 'FT-12345678', amountVnd: 1_500_000, content: 'MOVA AB12' });
    expect(http.calls[2].body).toEqual({ txnId: 'FT-12345678', amountVnd: 1_500_000, content: 'MOVA AB12' });
    expect(http.calls[2].key).toBe('FT-12345678');
    await a.finance.bankWebhook(null, { amountVnd: 50_000, content: '' });
    expect(http.calls[3].body).toEqual({ amountVnd: 50_000, content: '' }); // không mã giao dịch: để máy chủ sinh, không gửi khóa cố định
    expect(http.calls[3].key).toBeUndefined();
  });

  it('W8-04: xuất hóa đơn trả { issued }; chi cả đợt gửi mã PO + cách chi; cài đặt chỉ gửi trường có giá trị', async () => {
    const { http, a } = mk({
      'POST /ops/finance/invoices/issue': { issued: 4 },
      'POST /ops/finance/pay-run': { results: [], paid: 0, totalVnd: 0 },
      'PUT /ops/finance/settings': { openingCashVnd: 1000 }
    });
    expect(await a.finance.issueInvoices(null)).toEqual({ issued: 4 });
    await a.finance.executePayRun(null, { poIds: ['PO-1'], method: 'cash' });
    await a.finance.executePayRun(null, { poIds: ['PO-2'], method: 'bank_transfer', ref: 'DOT-1' });
    expect(http.calls[1].body).toEqual({ poIds: ['PO-1'], method: 'cash' });
    expect(http.calls[2].body).toEqual({ poIds: ['PO-2'], method: 'bank_transfer', ref: 'DOT-1' });
    await a.finance.saveSettings(null, { openingCashVnd: 5_000_000, issueOn: 'delivery' });
    await a.finance.saveSettings(null, { accountMap: { revenue: '5111' } });
    expect(http.calls[3].body).toEqual({ openingCashVnd: 5_000_000, issueOn: 'delivery' });
    expect(http.calls[4].body).toEqual({ accountMap: { revenue: '5111' } });
  });

  it('W8-04: doanh thu, margin, bút toán, giám sát, tổng quan: bộ lọc đi trên query; giá vốn thùng theo mã đơn', async () => {
    const { http, a } = mk({
      'GET /ops/finance/revenue': {},
      'GET /ops/finance/margins': {},
      'GET /ops/finance/box-cost/MV-261203-0001': { orderId: 'MV-261203-0001' },
      'GET /ops/finance/journal': { entries: [] },
      'GET /ops/monitoring/scorecard': { rows: [] },
      'GET /ops/overview/founder': { alerts: [] }
    });
    await a.finance.revenue(null, { from: '2026-12-01', to: null });
    await a.finance.margins(null, { from: null, to: '2026-12-31' });
    await a.finance.boxCost(null, 'MV-261203-0001');
    await a.finance.journal(null, { from: '2026-12-01', to: '2026-12-07', groups: ['prepaid', 'delivery'] });
    await a.monitoring.scorecard(null, { from: '2026-12-01' });
    await a.overview.founder(null);
    expect(http.calls[0].query).toEqual({ from: '2026-12-01', to: null });
    expect(http.calls[1].query).toEqual({ from: null, to: '2026-12-31' });
    expect(http.calls[3].query).toEqual({ from: '2026-12-01', to: '2026-12-07', groups: 'prepaid,delivery' });
    expect(http.calls[4].query).toEqual({ from: '2026-12-01', to: null });
  });

  it('W8-04: lỗi của máy chủ đi ra nguyên HttpError (mã, details) để màn hình dịch', async () => {
    const err = Object.assign(new Error('lệch'), { code: 'AMOUNT_DIFF', status: 409, details: { diffVnd: -1000 } });
    const { a } = mk({ 'POST /ops/finance/bank-transactions/1/match': err });
    await expect(a.finance.manualMatch(null, { bankId: '1', ledgerId: 'pack:1' })).rejects.toMatchObject({ code: 'AMOUNT_DIFF', details: { diffVnd: -1000 } });
  });
});
