import { describe, expect, it } from 'vitest';
import { checkYieldInput, describeYield, toGrams } from '../../ops/yieldRules';
import { createOpsApi } from '../api/opsApi';
import { read } from './helpers/asyncScan';
import { fakeHttp } from './helpers/fakeHttp';

// Dòng nhật ký như máy chủ trả (yield_logs): hệ số chuẩn 95%, thực tế 85% => lệch -10,53% (> 5%) nên bị gắn cờ
const ROW = { id: 3, batch_id: 'BATCH-20261125', sku_id: 'NL-BO-01', lot_qr_code: null, raw_received_g: 10000, net_prepped_g: 8500, standard_yield_bp: 9500, actual_yield_bp: 8500, variance_bp: -1053, flagged: true, at: '2026-11-23T03:00:00.000Z' };

describe('W4-06: nhập sản lượng thực tế và cờ lệch hệ số', () => {
  it('W4-06: đổi kg sang gram nguyên, kiểm đầu vào: thiếu SKU, thô/thành phẩm không dương, thành phẩm nặng hơn thô', () => {
    expect(toGrams('12.345')).toBe(12345);
    expect(toGrams(0.1 + 0.2)).toBe(300);
    expect(checkYieldInput({ skuId: '', rawKg: 10, netKg: 9 })).toMatch(/Chọn nguyên liệu/);
    expect(checkYieldInput({ skuId: 'NL-BO-01', rawKg: '', netKg: 9 })).toMatch(/thô/);
    expect(checkYieldInput({ skuId: 'NL-BO-01', rawKg: 10, netKg: 0 })).toMatch(/thành phẩm/);
    expect(checkYieldInput({ skuId: 'NL-BO-01', rawKg: 10, netKg: 10.5 })).toMatch(/không thể nặng hơn/);
    expect(checkYieldInput({ skuId: 'NL-BO-01', rawKg: 10, netKg: 9.5 })).toBe('');
    expect(checkYieldInput({ skuId: 'NL-BO-01', rawKg: 10, netKg: 10 })).toBe('');
  });

  it('W4-06: dòng nhật ký thành phần trăm dễ đọc và giữ cờ của máy chủ (web không tự tính cờ)', () => {
    expect(describeYield(ROW)).toMatchObject({ rawKg: 10, netKg: 8.5, actualPct: 85, standardPct: 95, variancePct: -10.53, flagged: true });
    const ok = describeYield({ ...ROW, net_prepped_g: 9500, actual_yield_bp: 9500, variance_bp: 0, flagged: false });
    expect(ok).toMatchObject({ actualPct: 95, variancePct: 0, flagged: false });
    expect(describeYield({ ...ROW, lot_qr_code: 'MOVA-TRACE-BO-202611-0001' }).lotQrCode).toBe('MOVA-TRACE-BO-202611-0001');
  });

  it('W4-06: gửi đúng thân (gram, mã lô và ghi chú chỉ khi có) và đọc nhật ký theo ngày', async () => {
    const http = fakeHttp({ 'POST /ops/factory/yield-logs': ROW, 'GET /ops/factory/yield-logs': [ROW] });
    const api = createOpsApi({ http });
    expect((await api.factory.yieldLog(null, { date: '2026-11-25', skuId: 'NL-BO-01', rawReceivedG: 10000, netPreppedG: 8500 })).flagged).toBe(true);
    await api.factory.yieldLog(null, { date: '2026-11-25', skuId: 'NL-BO-01', rawReceivedG: 10000, netPreppedG: 9500, lotQrCode: 'MOVA-TRACE-BO-202611-0001', note: 'ổn' });
    expect(http.calls[0].body).toEqual({ date: '2026-11-25', sku_id: 'NL-BO-01', raw_received_g: 10000, net_prepped_g: 8500 });
    expect(http.calls[1].body).toMatchObject({ lot_qr_code: 'MOVA-TRACE-BO-202611-0001', note: 'ổn' });
    expect(await api.factory.yieldLogs(null, '2026-11-25')).toEqual([ROW]);
    expect(http.calls[2].query).toEqual({ date: '2026-11-25', flagged: undefined });
    await api.factory.yieldLogs(null, '2026-11-25', true);
    expect(http.calls[3].query.flagged).toBe('true');
  });

  it('W4-06: màn Sản lượng có cờ đỏ, ngưỡng 5%, chỉ nguyên liệu SKU (không hải sản kho phụ) và tab trong menu xưởng', () => {
    const v = read('ops/views/workshop/YieldView.vue');
    expect(v).toMatch(/const LIMIT = 5/);
    expect(v).toMatch(/data-testid="y-flag"/);
    expect(v).toMatch(/i\.type === 'sku' && !i\.hub/);
    expect(v).toMatch(/api\.ops\.factory\.yieldLog\(/);
    expect(read('ops/views/workshop/WorkshopLayout.vue')).toMatch(/to: '\/xuong\/san-luong'/);
  });
});
