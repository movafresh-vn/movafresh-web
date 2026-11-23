import { describe, expect, it } from 'vitest';
import { confirmOutcome, previewSummary, shortageGramsOf } from '../../ops/shortPickFlow';
import { createOpsApi } from '../api/opsApi';
import { read } from './helpers/asyncScan';
import { fakeHttp } from './helpers/fakeHttp';

const HASH = 'a'.repeat(64);
const PREVIEW = {
  batch_id: 'BATCH-20261125', delivery_date: '2026-11-25', sku_id: 'NL-BO-01', shortage_g: 5000, uncovered_g: 0, total_vnd: 90000, preview_hash: HASH,
  orders: [
    { week_id: 'w1', order_code: 'MV-261125-0001', gross_g: 400, covered_g: 400, refund_vnd: 50000, real_vnd: 30000, promo_vnd: 20000 },
    { week_id: 'w2', order_code: 'MV-261125-0002', gross_g: 300, covered_g: 300, refund_vnd: 40000, real_vnd: 40000, promo_vnd: 0 }
  ]
};

describe('W4-09: hoàn tiền thiếu hàng loạt (xem trước rồi xác nhận)', () => {
  it('W4-09: gram thiếu từ báo cáo: túi nhân cỡ túi, kg nhân 1000; xốt và hải sản kho phụ không hoàn theo SKU', () => {
    const bo = { type: 'sku', bagGrams: 500 };
    expect(shortageGramsOf({ qty: 10, unit: 'bag' }, bo)).toBe(5000);
    expect(shortageGramsOf({ qty: 2.5, unit: 'kg' }, bo)).toBe(2500);
    expect(shortageGramsOf({ qty: 3, unit: 'bag' }, { type: 'sauce', bagGrams: 30 })).toBeNull();
    expect(shortageGramsOf({ qty: 0, unit: 'kg' }, bo)).toBeNull();
    expect(shortageGramsOf({ qty: 3, unit: 'bag' }, null)).toBeNull();
  });

  it('W4-09: tóm tắt bản xem trước: số đơn, tổng, tách tiền thật / khuyến mãi, phần thiếu ngoài các đơn, mã băm', () => {
    expect(previewSummary(PREVIEW)).toEqual({ skuId: 'NL-BO-01', orders: 2, totalVnd: 90000, uncoveredG: 0, hash: HASH, realVnd: 70000, promoVnd: 20000 });
  });

  it('W4-09: xem trước không ghi gì; xác nhận gửi đúng mã băm của bản xem trước cùng lý do', async () => {
    const http = fakeHttp({
      'POST /ops/factory/short-pick/preview': PREVIEW,
      'POST /ops/factory/short-pick/confirm': { ...PREVIEW, refund_id: 5, replayed: false }
    });
    const api = createOpsApi({ http });
    const p = await api.shortPick.preview(null, { date: '2026-11-25', skuId: 'NL-BO-01', shortageG: 5000 });
    expect(http.calls[0].body).toEqual({ date: '2026-11-25', sku_id: 'NL-BO-01', shortage_g: 5000 });
    const out = await api.shortPick.confirm(null, { date: '2026-11-25', skuId: 'NL-BO-01', shortageG: 5000, previewHash: p.preview_hash, reason: 'xưởng thiếu bò' });
    expect(http.calls[1].body).toEqual({ date: '2026-11-25', sku_id: 'NL-BO-01', shortage_g: 5000, preview_hash: HASH, reason: 'xưởng thiếu bò' });
    expect(http.calls[1].key).toBe(HASH); // gửi lại cùng bản xem trước = cùng khóa idempotency
    expect(out.refund_id).toBe(5);
  });

  it('W4-09: bản xem trước cũ (409 SHORT_PICK_PREVIEW_STALE) được báo là phải xem lại; không có đơn / thiếu quyền / lỗi khác', () => {
    expect(confirmOutcome(null)).toEqual({ kind: 'ok', message: '' });
    expect(confirmOutcome({ code: 'SHORT_PICK_PREVIEW_STALE' })).toMatchObject({ kind: 'stale', message: expect.stringMatching(/xem trước lại/) });
    expect(confirmOutcome({ code: 'SHORT_PICK_NO_ORDERS' }).kind).toBe('none');
    expect(confirmOutcome({ code: 'FORBIDDEN' }).kind).toBe('forbidden');
    expect(confirmOutcome({ code: 'X', message: 'lạ' })).toEqual({ kind: 'error', message: 'lạ' });
  });

  it('W4-09: danh sách các lần hoàn của một ngày giao', async () => {
    const http = fakeHttp({ 'GET /ops/factory/short-picks': [{ refund_id: 5, total_vnd: 90000 }] });
    expect(await createOpsApi({ http }).shortPick.list(null, '2026-11-25')).toEqual([{ refund_id: 5, total_vnd: 90000 }]);
    expect(http.calls[0].query).toEqual({ date: '2026-11-25' });
  });

  it('W4-09: màn báo thiếu: nút xem trước, xác nhận chỉ cho mua hàng/admin, bắt buộc lý do, tự xem trước lại khi bản cũ', () => {
    const v = read('ops/views/workshop/ShortageView.vue');
    expect(v).toMatch(/can\('shortPickPreview'\)/);
    expect(v).toMatch(/can\('shortPickConfirm'\)/);
    expect(v).toMatch(/data-testid="sp-preview"/);
    expect(v).toMatch(/data-testid="sp-confirm"/);
    expect(v).toMatch(/Nhập lý do hoàn tiền/);
    expect(v).toMatch(/o\.kind === 'stale'[\s\S]*await spPreview\(r\)/);
    expect(v).toMatch(/previewHash: st\.preview\.preview_hash/);
    expect(v).not.toMatch(/user_id|customer/i); // chỉ mã đơn, không có thông tin khách
  });
});
