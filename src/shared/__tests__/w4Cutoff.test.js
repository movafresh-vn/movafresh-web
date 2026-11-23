import { describe, expect, it } from 'vitest';
import { cutoffState, lockErrorMessage, lockRequest, lockSummary } from '../../ops/planning/cutoff';
import { createOpsApi } from '../api/opsApi';
import { read } from './helpers/asyncScan';
import { fakeHttp } from './helpers/fakeHttp';

const CUTOFF = '2026-11-23T01:00:00.000Z'; // 08:00 giờ Việt Nam
const before = new Date('2026-11-22T10:00:00.000Z');
const after = new Date('2026-11-23T02:00:00.000Z');

describe('W4-03: nút chốt sổ một chạm', () => {
  it('W4-03: chưa có lô hoặc lô DRAFT thì còn chốt được; chốt trước giờ chốt cần lý do', () => {
    const early = cutoffState({ batch: null, cutoffAt: CUTOFF, now: before });
    expect(early).toMatchObject({ phase: 'open', canLock: true, early: true, needsReason: true, canStartPrep: false });
    const due = cutoffState({ batch: { status: 'DRAFT', pending_exceptions: 0 }, cutoffAt: CUTOFF, now: after });
    expect(due).toMatchObject({ phase: 'open', canLock: true, early: false, needsReason: false });
  });

  it('W4-03: lô đã khóa thì hết nút chốt, còn nút bắt đầu sơ chế; PREPPING và sau đó không còn hành động', () => {
    expect(cutoffState({ batch: { status: 'LOCKED' }, cutoffAt: CUTOFF, now: after })).toMatchObject({ phase: 'locked', canLock: false, canStartPrep: true });
    expect(cutoffState({ batch: { status: 'PREPPING' }, cutoffAt: CUTOFF, now: after })).toMatchObject({ phase: 'prepping', canLock: false, canStartPrep: false });
    expect(cutoffState({ batch: { status: 'DISPATCHED' }, cutoffAt: CUTOFF, now: after }).phase).toBe('closed');
  });

  it('W4-03: đếm số khoản thanh toán muộn đang chờ của lô; giờ chốt không rõ thì không coi là chốt sớm', () => {
    expect(cutoffState({ batch: { status: 'LOCKED', pending_exceptions: '3' }, cutoffAt: CUTOFF, now: after }).pendingExceptions).toBe(3);
    expect(cutoffState({ batch: null, cutoffAt: null, now: before }).early).toBe(false);
  });

  it('W4-03: lockRequest: đúng giờ không gửi force; chốt sớm bắt buộc lý do và gửi force + lý do đã cắt khoảng trắng', () => {
    expect(lockRequest({ date: '2026-11-25', early: false })).toEqual({ date: '2026-11-25', force: false, reason: '' });
    expect(() => lockRequest({ date: '2026-11-25', early: true, reason: '   ' })).toThrow('lý do');
    try {
      lockRequest({ date: '2026-11-25', early: true });
    } catch (e) {
      expect(e.code).toBe('REASON_REQUIRED');
    }
    expect(lockRequest({ date: '2026-11-25', early: true, reason: '  nhà máy nghỉ sớm  ' })).toEqual({ date: '2026-11-25', force: true, reason: 'nhà máy nghỉ sớm' });
  });

  it('W4-03: gọi máy chủ: đúng giờ thì thân rỗng, chốt sớm thì force + reason; bắt đầu sơ chế gọi đúng đường', async () => {
    const http = fakeHttp({
      'POST /ops/batches/2026-11-25/lock': { batch_id: 'BATCH-20261125', locked_weeks: 4, unpaid_weeks: 1 },
      'POST /ops/batches/2026-11-25/start-prep': { prepping_orders: 4 }
    });
    const api = createOpsApi({ http });
    await api.batches.lock(null, lockRequest({ date: '2026-11-25', early: false }));
    await api.batches.lock(null, lockRequest({ date: '2026-11-25', early: true, reason: 'sớm' }));
    await api.batches.startPrep(null, '2026-11-25');
    expect(http.calls[0]).toMatchObject({ verb: 'POST', path: '/ops/batches/2026-11-25/lock', body: {} });
    expect(http.calls[1].body).toEqual({ force: true, reason: 'sớm' });
    expect(http.calls[2]).toMatchObject({ verb: 'POST', path: '/ops/batches/2026-11-25/start-prep' });
  });

  it('W4-03: thông báo kết quả và lỗi dễ hiểu (đã chốt trước đó, chưa tới giờ, thiếu quyền)', () => {
    expect(lockSummary({ already_locked: true })).toMatch(/đã được chốt trước/);
    expect(lockSummary({ already_locked: false, locked_weeks: 7, unpaid_weeks: 2 })).toBe('Đã chốt 7 đơn, 2 đơn chưa trả tiền được giữ lại.');
    expect(lockSummary({ locked_weeks: 3, unpaid_weeks: 0 })).toBe('Đã chốt 3 đơn.');
    expect(lockErrorMessage({ code: 'CUTOFF_NOT_REACHED' })).toMatch(/Chưa tới giờ chốt/);
    expect(lockErrorMessage({ code: 'FORBIDDEN' })).toMatch(/không được chốt/);
    expect(lockErrorMessage({ code: 'X', message: 'lạ' })).toBe('lạ');
  });

  it('W4-03: PlanView chỉ hiện nút theo quyền, hiển thị giờ chốt và đọc trạng thái lô từ máy chủ', () => {
    const v = read('ops/views/PlanView.vue');
    expect(v).toMatch(/can\('batchLock'\) && cs\.canLock/);
    expect(v).toMatch(/can\('startPrep'\)/);
    expect(v).toMatch(/data-testid="cutoff-at"/);
    expect(v).toMatch(/data-testid="lock-reason"/);
    expect(v).toMatch(/api\.ops\.batches\.list/);
    expect(v).not.toMatch(/api\.ops\.tick/);
  });
});
