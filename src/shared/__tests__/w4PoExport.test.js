import { describe, expect, it } from 'vitest';
import { poCsvName, withBom } from '../../ops/download';
import { createHttp } from '../api/http';
import { createOpsApi } from '../api/opsApi';
import { read } from './helpers/asyncScan';
import { fakeHttp } from './helpers/fakeHttp';

const CSV = 'po_id,kind,supplier_id,sku_id,name,unit,gross_kg,order_qty,unit_price_vnd,line_total_vnd\nPO-1,main,S-FACTORY,NL-BO-01,Thịt bò,kg,12.632,13,250000,3250000\n';

describe('W4-04: tải lệnh mua (kg thô chính xác) dạng CSV', () => {
  it('W4-04: gọi đúng đường và nhận NGUYÊN VĂN văn bản (không bóc phong bì JSON)', async () => {
    const http = fakeHttp({ 'GET /ops/batches/2026-11-25/purchase-orders.csv': CSV });
    const text = await createOpsApi({ http }).batches.purchaseOrdersCsv(null, '2026-11-25');
    expect(text).toBe(CSV);
    expect(http.calls[0]).toMatchObject({ verb: 'GET', path: '/ops/batches/2026-11-25/purchase-orders.csv', as: 'text' });
  });

  it('W4-04: qua http thật, as:text trả chuỗi thô kể cả khi nội dung không phải JSON', async () => {
    const h = createHttp({ baseUrl: 'http://x', getToken: async () => 't', fetchImpl: async () => ({ ok: true, status: 200, text: async () => CSV }) });
    expect(await createOpsApi({ http: h }).batches.purchaseOrdersCsv(null, '2026-11-25')).toBe(CSV);
  });

  it('W4-04: lỗi BATCH_NOT_FOUND của máy chủ đến nơi gọi với đúng mã', async () => {
    const h = createHttp({
      baseUrl: 'http://x', getToken: async () => 't',
      fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({ status: 'error', error: { code: 'BATCH_NOT_FOUND', message: 'Chưa có lô' } }) })
    });
    await expect(createOpsApi({ http: h }).batches.purchaseOrdersCsv(null, '2026-11-25')).rejects.toMatchObject({ code: 'BATCH_NOT_FOUND', status: 404 });
  });

  it('W4-04: tên tệp theo ngày giao; thêm BOM một lần để Excel đọc đúng tiếng Việt', () => {
    expect(poCsvName('2026-11-25')).toBe('po-2026-11-25.csv');
    expect(withBom('a')).toBe('﻿a');
    expect(withBom('﻿a')).toBe('﻿a');
    expect(withBom(CSV).startsWith('﻿po_id')).toBe(true);
  });

  it('W4-04: PlanView có nút tải, chỉ hiện khi lô đã chốt, và dùng downloadText + withBom', () => {
    const v = read('ops/views/PlanView.vue');
    expect(v).toMatch(/data-testid="po-csv"/);
    expect(v).toMatch(/v-if="batch && cs\.phase !== 'open'"/);
    expect(v).toMatch(/downloadText\(poCsvName\(day\), withBom\(await api\.ops\.batches\.purchaseOrdersCsv/);
  });
});
