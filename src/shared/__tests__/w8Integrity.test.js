import { describe, expect, it } from 'vitest';
import { createOpsApi } from '../api/opsApi';
import { financeError, integrityTile } from '../../ops/financeUi';
import { read } from './helpers/asyncScan';
import { fakeHttp } from './helpers/fakeHttp';

describe('W8-03: ô sổ Fresh Credit ở màn tổng quan', () => {
  it('W8-03: mọi khách khớp sổ thì ô xanh, ghi số tài khoản đã kiểm', () => {
    const t = integrityTile({ ok: true, users_checked: 128, mismatches: [] });
    expect(t).toMatchObject({ tone: 'ok', big: 'Khớp', mismatches: 0 });
    expect(t.detail).toContain('128');
  });

  it('W8-03: có khách lệch sổ thì ô đỏ kèm SỐ khách lệch (không báo xanh dù ok còn true)', () => {
    const t = integrityTile({ ok: false, users_checked: 50, mismatches: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }] });
    expect(t).toMatchObject({ tone: 'bad', big: '3 lệch', mismatches: 3 });
    expect(t.detail).toContain('3 / 50');
    // ok=true mà vẫn có mục lệch: tin vào danh sách lệch
    expect(integrityTile({ ok: true, users_checked: 5, mismatches: [{ user_id: 'x' }] }).tone).toBe('bad');
    // ok=false mà danh sách rỗng: cũng không được báo xanh
    expect(integrityTile({ ok: false, users_checked: 5, mismatches: [] }).tone).toBe('bad');
  });

  it('W8-03: chưa tải được thì ô trung tính "chưa kiểm được", không phải xanh', () => {
    expect(integrityTile(null)).toMatchObject({ tone: 'unknown', big: '—' });
    expect(integrityTile(undefined).tone).toBe('unknown');
  });

  it('W8-03: api.ops.finance.integrity gọi GET /ops/finance/credit/integrity', async () => {
    const http = fakeHttp({ 'GET /ops/finance/credit/integrity': { ok: true, users_checked: 3, mismatches: [] } });
    const r = await createOpsApi({ http }).finance.integrity();
    expect(r.ok).toBe(true);
    expect(http.calls[0]).toMatchObject({ verb: 'GET', path: '/ops/finance/credit/integrity' });
  });

  it('W8-03: HomeView đọc kết quả kiểm sổ qua api và hiện ô ov-integrity, lỗi quyền / mạng không làm hỏng cả trang', () => {
    const t = read('ops/views/HomeView.vue');
    expect(t).toContain('await api.ops.finance.integrity(ctx.value)');
    expect(t).toContain('data-testid="ov-integrity"');
    expect(t).toContain('integrityTile(integrity.value)');
    expect(t).toMatch(/catch \{\n\s*integrity\.value = null;/);
  });

  it('W8-03: financeError nêu rõ số tiền lệch khi khớp tay sai tiền, và dịch mã lỗi tài chính', () => {
    expect(financeError({ code: 'AMOUNT_DIFF', details: { diffVnd: -50000 } })).toContain('−50.000');
    expect(financeError({ code: 'AMOUNT_DIFF', details: { diffVnd: 20000 } })).toContain('+20.000');
    expect(financeError({ code: 'AMOUNT_DIFF' })).toContain('đúng bằng giá gói');
    expect(financeError({ code: 'SELF_APPROVE' })).toContain('không được tự duyệt');
    expect(financeError({ code: 'CASH_OVER_LIMIT' })).toContain('5.000.000');
    expect(financeError({ code: 'NOTE_REQUIRED' })).toBe('Cần ghi lý do.');
    expect(financeError({ code: 'MÃ_LẠ', message: 'lời nhắn của máy chủ' })).toBe('lời nhắn của máy chủ');
    expect(financeError(null)).toBe('Không thực hiện được.');
  });
});
