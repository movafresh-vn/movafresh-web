import { describe, expect, it } from 'vitest';
import { OUTCOME_TEXT, decisionError, isPending, outcomeText, sourceLabel, statusLabel } from '../../ops/latePayments';
import { MODULES } from '../../ops/modules';
import { createOpsApi } from '../api/opsApi';
import { read } from './helpers/asyncScan';
import { fakeHttp } from './helpers/fakeHttp';

const EX = { id: 7, week_id: 'w1', batch_id: 'BATCH-20261125', user_id: 'u1', source: 'bank_transfer', amount_vnd: 171000, status: 'pending_review', created_at: '2026-11-23T02:02:00.000Z' };

describe('W4-05: hàng chờ duyệt thanh toán muộn', () => {
  it('W4-05: danh sách lọc theo trạng thái; "tất cả" không gửi tham số status', async () => {
    const http = fakeHttp({ 'GET /ops/payment-exceptions': [EX] });
    const api = createOpsApi({ http });
    expect(await api.paymentExceptions.list(null, 'pending_review')).toEqual([EX]);
    await api.paymentExceptions.list(null, null);
    expect(http.calls[0].query).toEqual({ status: 'pending_review' });
    expect(http.calls[1].query.status).toBeNull();
  });

  it('W4-05: nhận vào lô và từ chối gọi đúng đường, thân chỉ có lý do; kết quả thành câu cho người duyệt', async () => {
    const http = fakeHttp({
      'POST /ops/payment-exceptions/7/accept': { status: 'accepted', week_id: 'w1', po_ids: ['PO-9'], bom_delta: [] },
      'POST /ops/payment-exceptions/8/reject': { status: 'rolled_over', exception_id: 8 },
      'POST /ops/payment-exceptions/9/reject': { status: 'credited', exception_id: 9 }
    });
    const api = createOpsApi({ http });
    expect(outcomeText(await api.paymentExceptions.accept(null, 7, 'đủ chỗ'))).toBe(OUTCOME_TEXT.accepted);
    expect(outcomeText(await api.paymentExceptions.reject(null, 8, 'hết chỗ'))).toMatch(/dời đơn sang ngày giao kế tiếp/);
    expect(outcomeText(await api.paymentExceptions.reject(null, 9, 'không còn ngày'))).toMatch(/hoàn tiền vào Fresh Credit/);
    expect(http.calls.map((c) => c.body)).toEqual([{ reason: 'đủ chỗ' }, { reason: 'hết chỗ' }, { reason: 'không còn ngày' }]);
    expect(outcomeText(null)).toBe('');
  });

  it('W4-05: nhãn trạng thái, nguồn tiền; chỉ khoản chờ duyệt mới có nút', () => {
    expect(statusLabel('pending_review')).toBe('Chờ duyệt');
    expect(statusLabel('credited')).toMatch(/Fresh Credit/);
    expect(statusLabel('lạ')).toBe('lạ');
    expect(sourceLabel('bank_transfer')).toBe('Chuyển khoản');
    expect(sourceLabel('card')).toBe('Thẻ');
    expect(isPending(EX)).toBe(true);
    expect(isPending({ ...EX, status: 'accepted' })).toBe(false);
  });

  it('W4-05: lỗi của máy chủ được giải thích: đã xử lý rồi, lô không còn nhận đơn, chu kỳ đầy', () => {
    expect(decisionError({ code: 'PAYMENT_EXCEPTION_NOT_PENDING' })).toMatch(/đã được xử lý/);
    expect(decisionError({ code: 'BATCH_LOCKED' })).toMatch(/từ chối để dời ngày/);
    expect(decisionError({ code: 'CYCLE_FULL' })).toMatch(/hết sức chứa/);
    expect(decisionError({ code: 'X', message: 'lạ' })).toBe('lạ');
  });

  it('W4-05: màn có lý do bắt buộc, nút nhận / từ chối, mô tả kết quả; chỉ admin vào được và có trong menu', () => {
    const v = read('ops/views/LatePaymentsView.vue');
    expect(v).toMatch(/data-testid="late-accept"/);
    expect(v).toMatch(/data-testid="late-reject"/);
    expect(v).toMatch(/Nhập lý do quyết định/);
    expect(v).toMatch(/OUTCOME_TEXT\[ex\.status\]/);
    expect(v).not.toMatch(/user_id|customer/i); // không lộ mã khách trên màn
    const m = MODULES.find((x) => x.name === 'late-payments');
    expect(m.path).toBe('/thanh-toan-tre');
    expect(m.roles).toEqual(['admin']);
  });
});
