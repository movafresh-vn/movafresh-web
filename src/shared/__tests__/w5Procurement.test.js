import { describe, expect, it, vi } from 'vitest';
import { compact, createOpsApi, dropEmpty } from '../api/opsApi';
import { fakeHttp } from './helpers/fakeHttp';

const DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const TICKET = (purpose) => ({ path: `${purpose}/202611/abc.jpg`, upload_url: 'https://storage.test/upload' });
const okFetch = () => vi.fn(async () => ({ ok: true, status: 200 }));

describe('W5-03: api.ops mua hàng, cổng nhà cung cấp, nhận hàng trên backend thật', () => {
  it('W5-03: tên hàm giữ như bản giả lập, hàm trả Promise, ctx không còn dùng', async () => {
    const real = createOpsApi({ http: fakeHttp({ 'GET /ops/procurement/pos': [], 'GET /ops/procurement/suppliers': { suppliers: [{ id: 'S1' }] } }) });
    for (const k of ['suppliers', 'saveSupplier', 'addCert', 'removeCert', 'skuCatalog', 'prices', 'addPrice', 'forecast', 'sendForecast', 'listPos', 'getPo', 'invoiceFile', 'editLine', 'approvePo', 'sendPo', 'submitInvoice', 'matchPo', 'payPo', 'payables', 'directPurchases', 'previewStatement', 'recordDirectPurchase', 'settings', 'saveSettings'])
      expect(typeof real.procurement[k], `procurement.${k}`).toBe('function');
    for (const k of ['overview', 'confirmPo', 'submitInvoice', 'replyClaim', 'updateContact', 'addCert']) expect(typeof real.supplierPortal[k], `supplierPortal.${k}`).toBe('function');
    for (const k of ['receivable', 'receive', 'receipts']) expect(typeof real.hub[k], `hub.${k}`).toBe('function');
    expect(real.procurement.listPos()).toBeInstanceOf(Promise);
    expect(await real.listSuppliers()).toEqual([{ id: 'S1' }]);
  });

  it('W5-03: sửa dòng PO, duyệt, gửi: đúng verb + đường + thân', async () => {
    const http = fakeHttp({
      'PATCH /ops/procurement/pos/PO-1/lines/NL-BO-01': { id: 'PO-1' },
      'POST /ops/procurement/pos/PO-1/approve': { id: 'PO-1' },
      'POST /ops/procurement/pos/PO-1/send': { id: 'PO-1' }
    });
    const api = createOpsApi({ http });
    await api.procurement.editLine(null, { poId: 'PO-1', sku: 'NL-BO-01', qty: 12.5 });
    await api.procurement.approvePo(null, 'PO-1');
    await api.procurement.sendPo(null, { poId: 'PO-1', via: 'print' });
    expect(http.calls.map((c) => `${c.verb} ${c.path}`)).toEqual(['PATCH /ops/procurement/pos/PO-1/lines/NL-BO-01', 'POST /ops/procurement/pos/PO-1/approve', 'POST /ops/procurement/pos/PO-1/send']);
    expect(http.calls[0].body).toEqual({ qty: 12.5 });
    expect(http.calls[2].body).toEqual({ via: 'print' });
  });

  it('W5-03: nhập giá mới trả bản ghi giá kèm newlyFlagged; CONFIRM_REQUIRED đi nguyên cho màn hình xử lý; xác nhận gửi confirm:true', async () => {
    const http = fakeHttp({ 'POST /ops/procurement/price-entries': (o) => (o.body.confirm ? { entry: { id: 7, priceVnd: 300000 }, newly_flagged: [{ dish_id: 'D1', name: 'Bò', food_cost_bp: 3800 }] } : Promise.reject(Object.assign(new Error('x'), { code: 'CONFIRM_REQUIRED', status: 422, details: { newly_flagged: [{ dish_id: 'D1', name: 'Bò', food_cost_bp: 3800 }] } }))) });
    const api = createOpsApi({ http });
    const first = await api.procurement.addPrice(null, { sku: 'NL-BO-01', priceVnd: 300000, effectiveFrom: '2026-12-01' }).catch((e) => e);
    expect(first).toMatchObject({ code: 'CONFIRM_REQUIRED', details: { newly_flagged: [{ dish_id: 'D1' }] } });
    expect(http.calls[0].body).toEqual({ sku: 'NL-BO-01', priceVnd: 300000, effectiveFrom: '2026-12-01' });
    const ok = await api.procurement.addPrice(null, { sku: 'NL-BO-01', priceVnd: 300000, effectiveFrom: '2026-12-01', note: 'tăng giá', confirm: true });
    expect(http.calls[1].body).toEqual({ sku: 'NL-BO-01', priceVnd: 300000, effectiveFrom: '2026-12-01', note: 'tăng giá', confirm: true });
    expect(ok).toMatchObject({ id: 7, priceVnd: 300000, newlyFlagged: [{ dish_id: 'D1' }] });
  });

  it('W5-03: đối chiếu lệch ném HttpError mang details.match; chấp nhận lệch gửi acceptDiff + ghi chú', async () => {
    const match = { ok: false, issues: [{ severity: 'error', amountVnd: 5000 }], totals: {} };
    const http = fakeHttp({ 'POST /ops/procurement/pos/PO-2/match': (o) => (o.body.acceptDiff ? { po: { id: 'PO-2' }, match } : Promise.reject(Object.assign(new Error('lệch'), { code: 'MATCH_DIFF', status: 409, details: { match } }))) });
    const api = createOpsApi({ http });
    const e = await api.procurement.matchPo(null, { poId: 'PO-2' }).catch((x) => x);
    expect(e).toMatchObject({ code: 'MATCH_DIFF', status: 409, details: { match } });
    expect(http.calls[0].body).toEqual({ acceptDiff: false, acceptInvoicePrice: false });
    await api.procurement.matchPo(null, { poId: 'PO-2', acceptDiff: true, note: 'đồng ý lệch giá' });
    expect(http.calls[1].body).toEqual({ acceptDiff: true, acceptInvoicePrice: false, note: 'đồng ý lệch giá' });
  });

  it('W5-03: thanh toán PO gửi cách trả + mã giao dịch; mặc định chuyển khoản', async () => {
    const http = fakeHttp({ 'POST /ops/procurement/pos/PO-3/pay': { po: {}, payment: {}, duplicate: false } });
    const api = createOpsApi({ http });
    await api.procurement.payPo(null, { poId: 'PO-3' });
    await api.procurement.payPo(null, { poId: 'PO-3', method: 'cash', ref: 'PC-9' });
    expect(http.calls[0].body).toEqual({ method: 'bank_transfer' });
    expect(http.calls[1].body).toEqual({ method: 'cash', ref: 'PC-9' });
  });

  it('W5-03: hóa đơn có tệp: tải lên kho trước (mục đích invoice) rồi gửi đường dẫn, KHÔNG gửi data URL', async () => {
    const fetchImpl = okFetch();
    const http = fakeHttp({ 'POST /ops/uploads': (o) => TICKET(o.body.purpose), 'POST /ops/procurement/pos/PO-4/invoice': { id: 'INV-1' } });
    const api = createOpsApi({ http, fetchImpl });
    await api.procurement.submitInvoice(null, { poId: 'PO-4', number: 'HD-1', issuedAt: '2026-11-25', file: { name: 'hd.jpg', type: 'image/jpeg', dataUrl: DATA_URL } });
    expect(http.calls[0]).toMatchObject({ verb: 'POST', path: '/ops/uploads', body: { purpose: 'invoice', content_type: 'image/jpeg' } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://storage.test/upload');
    expect(http.calls[1].body).toEqual({ number: 'HD-1', issuedAt: '2026-11-25', file: { name: 'hd.jpg', type: 'image/jpeg', path: 'invoice/202611/abc.jpg' } });
    expect(JSON.stringify(http.calls[1].body)).not.toContain('data:');
  });

  it('W5-03: hóa đơn không tệp không xin vé tải lên; tệp đã có path thì giữ nguyên, không tải lại', async () => {
    const http = fakeHttp({ 'POST /ops/procurement/pos/PO-5/invoice': { id: 'INV-2' } });
    const api = createOpsApi({ http, fetchImpl: okFetch() });
    await api.procurement.submitInvoice(null, { poId: 'PO-5', number: 'HD-2', issuedAt: '2026-11-25' });
    await api.procurement.submitInvoice(null, { poId: 'PO-5', number: 'HD-3', issuedAt: '2026-11-25', file: { name: 'a.pdf', type: 'application/pdf', path: 'invoice/202611/x.pdf' } });
    expect(http.calls.map((c) => c.path)).toEqual(['/ops/procurement/pos/PO-5/invoice', '/ops/procurement/pos/PO-5/invoice']);
    expect(http.calls[0].body).toEqual({ number: 'HD-2', issuedAt: '2026-11-25' });
    expect(http.calls[1].body.file).toEqual({ name: 'a.pdf', type: 'application/pdf', path: 'invoice/202611/x.pdf' });
  });

  it('W5-03: hồ sơ nhà cung cấp mới: id null, mã số thuế / CCCD / địa chỉ rỗng bị bỏ (máy chủ chỉ nhận vắng mặt, không nhận null)', async () => {
    const http = fakeHttp({ 'PUT /ops/procurement/suppliers': { id: 'SUP-00001', name: 'HTX A' } });
    const api = createOpsApi({ http });
    const saved = await api.procurement.saveSupplier(null, {
      id: null, kind: 'htx', name: 'HTX A', taxId: '', cccd: '', address: '12 Nguyễn Huệ', bank: { bankName: 'VCB', accountNo: '1', accountName: 'A' }, termDays: 15, contact: { name: 'An', phone: '0901' }
    });
    expect(saved).toMatchObject({ id: 'SUP-00001' });
    expect(http.calls[0].body).toEqual({ kind: 'htx', name: 'HTX A', address: '12 Nguyễn Huệ', bank: { bankName: 'VCB', accountNo: '1', accountName: 'A' }, termDays: 15, contact: { name: 'An', phone: '0901' } });
  });

  it('W5-03: giấy chứng nhận bỏ cơ quan cấp rỗng; xóa giấy gọi đúng đường', async () => {
    const http = fakeHttp({ 'POST /ops/procurement/suppliers/S1/certs': { id: '5' }, 'DELETE /ops/procurement/suppliers/S1/certs/5': { ok: true } });
    const api = createOpsApi({ http });
    await api.procurement.addCert(null, { supplierId: 'S1', cert: { type: 'attp', number: 'A1', issuer: '', expiresAt: '2027-01-01' } });
    await api.procurement.removeCert(null, { supplierId: 'S1', certId: '5' });
    expect(http.calls[0].body).toEqual({ cert: { type: 'attp', number: 'A1', expiresAt: '2027-01-01' } });
    expect(http.calls[1]).toMatchObject({ verb: 'DELETE', path: '/ops/procurement/suppliers/S1/certs/5' });
  });

  it('W5-03: bảng kê thu mua bỏ trường rỗng của người bán và từng dòng; mua trực tiếp thêm intoStock + location', async () => {
    const http = fakeHttp({ 'POST /ops/procurement/direct-purchases/preview': { total: 1 }, 'POST /ops/procurement/direct-purchases': { id: 'DP-1', stockIds: [] } });
    const api = createOpsApi({ http });
    const input = { seller: { name: 'Bà Tư', cccd: '0123', address: 'Chợ', phone: '' }, items: [{ sku: 'NL-KHOAI-01', qty: 5, unitPriceVnd: 10000, name: '', unit: null }], method: 'cash', intoStock: true, location: 'hub' };
    await api.procurement.previewStatement(null, input);
    await api.procurement.recordDirectPurchase(null, input);
    expect(http.calls[0].body).toEqual({ seller: { name: 'Bà Tư', cccd: '0123', address: 'Chợ' }, items: [{ sku: 'NL-KHOAI-01', qty: 5, unitPriceVnd: 10000 }], method: 'cash' });
    expect(http.calls[1].body).toEqual({ ...http.calls[0].body, intoStock: true, location: 'hub' });
  });

  it('W5-03: dự báo, công nợ, mua trực tiếp, cài đặt: đường GET/PUT đúng', async () => {
    const http = fakeHttp({
      'GET /ops/procurement/forecast': {}, 'POST /ops/procurement/forecast/send': { ok: true, sent: [] }, 'GET /ops/procurement/payables': {}, 'GET /ops/procurement/direct-purchases': {},
      'GET /ops/procurement/settings': {}, 'PUT /ops/procurement/settings': {}, 'GET /ops/procurement/skus': [], 'GET /ops/procurement/prices': {}, 'GET /ops/procurement/invoices/INV-1/file': { path: 'invoice/x.jpg' }
    });
    const api = createOpsApi({ http });
    await Promise.all([api.procurement.forecast(), api.procurement.sendForecast(), api.procurement.payables(), api.procurement.directPurchases(), api.procurement.settings(), api.procurement.saveSettings(null, { statementTemplate: 'internal' }), api.procurement.skuCatalog(), api.procurement.prices(), api.procurement.invoiceFile(null, 'INV-1')]);
    expect(http.calls).toHaveLength(9);
  });

  it('W5-03: cổng nhà cung cấp: admin gửi as_supplier_id trên query, nhà cung cấp thật không gửi gì; thân xác nhận thiếu gồm dòng + ghi chú', async () => {
    const http = fakeHttp({
      'GET /supplier/overview': { supplier: { id: 'S1' } },
      'POST /supplier/pos/PO-9/confirm': { po: {} },
      'POST /supplier/claims/CL-1/reply': { id: 'CL-1' },
      'PATCH /supplier/contact': { ok: true },
      'POST /supplier/certs': { id: '2' }
    });
    const api = createOpsApi({ http });
    await api.supplierPortal.overview(null, { asSupplierId: 'S1' });
    await api.supplierPortal.overview(null, {});
    expect(http.calls[0].query).toEqual({ as_supplier_id: 'S1' });
    expect(http.calls[1].query).toBeUndefined();
    await api.supplierPortal.confirmPo(null, { poId: 'PO-9', result: 'short', lines: [{ sku: 'NL-BO-01', confirmedQty: 8 }], note: 'hết bò', asSupplierId: 'S1' });
    expect(http.calls[2]).toMatchObject({ query: { as_supplier_id: 'S1' }, body: { result: 'short', lines: [{ sku: 'NL-BO-01', confirmedQty: 8 }], note: 'hết bò' } });
    await api.supplierPortal.confirmPo(null, { poId: 'PO-9', result: 'full' });
    expect(http.calls[3].body).toEqual({ result: 'full' });
    await api.supplierPortal.replyClaim(null, { claimId: 'CL-1', reply: 'đã nhận' });
    await api.supplierPortal.updateContact(null, { name: 'An', phone: '0901' });
    await api.supplierPortal.addCert(null, { cert: { type: 'attp', number: 'A', issuer: '', expiresAt: '2027-01-01' } });
    expect(http.calls[4].body).toEqual({ reply: 'đã nhận' });
    expect(http.calls[5]).toMatchObject({ verb: 'PATCH', path: '/supplier/contact', body: { name: 'An', phone: '0901' } });
    expect(http.calls[6].body).toEqual({ cert: { type: 'attp', number: 'A', expiresAt: '2027-01-01' } });
  });

  it('W5-03: nhà cung cấp gửi hóa đơn có tệp: tải lên trước rồi gửi đường dẫn tới /supplier/pos/:id/invoice', async () => {
    const fetchImpl = okFetch();
    const http = fakeHttp({ 'POST /ops/uploads': (o) => TICKET(o.body.purpose), 'POST /supplier/pos/PO-9/invoice': { id: 'INV-9' } });
    const api = createOpsApi({ http, fetchImpl });
    await api.supplierPortal.submitInvoice(null, { poId: 'PO-9', number: 'HD-9', issuedAt: '2026-11-26', lines: [{ sku: 'NL-BO-01', qty: 8, unitPriceVnd: 250000 }], file: { name: 'hd.jpg', type: 'image/jpeg', dataUrl: DATA_URL } });
    expect(http.calls[1].path).toBe('/supplier/pos/PO-9/invoice');
    expect(http.calls[1].body.file).toEqual({ name: 'hd.jpg', type: 'image/jpeg', path: 'invoice/202611/abc.jpg' });
    expect(http.calls[1].body.lines).toEqual([{ sku: 'NL-BO-01', qty: 8, unitPriceVnd: 250000 }]);
  });

  it('W5-03: nhận hàng ở kho phụ: ảnh tải lên trước (mục đích receipt), dòng bỏ ô trống, danh sách phiếu có giới hạn', async () => {
    const fetchImpl = okFetch();
    const http = fakeHttp({ 'POST /ops/uploads': (o) => TICKET(o.body.purpose), 'POST /ops/hub/receipts': { receipt: { id: 'RC-1' }, claims: [], complete: true, status: 'received' }, 'GET /ops/hub/receipts': [], 'GET /ops/hub/receivable': [] });
    const api = createOpsApi({ http, fetchImpl });
    const res = await api.hub.receive(null, {
      poId: 'PO-1', photo: DATA_URL, note: '',
      lines: [{ sku: 'NL-BO-01', acceptedQty: 5, rejectedQty: 1, tempC: 3, reason: 'temp', lotCode: '', expiresAt: undefined }]
    });
    expect(res.receipt.id).toBe('RC-1');
    expect(http.calls[0].body).toEqual({ purpose: 'receipt', content_type: 'image/jpeg' });
    expect(http.calls[1].body).toEqual({ poId: 'PO-1', photo: 'receipt/202611/abc.jpg', lines: [{ sku: 'NL-BO-01', acceptedQty: 5, rejectedQty: 1, tempC: 3, reason: 'temp' }] });
    await api.hub.receipts(null, { limit: 8 });
    await api.hub.receivable();
    expect(http.calls[2].query).toEqual({ limit: 8 });
  });

  it('W5-03: nhận đủ hàng không ảnh thì không xin vé tải ảnh', async () => {
    const http = fakeHttp({ 'POST /ops/hub/receipts': { receipt: {}, claims: [], complete: true, status: 'received' } });
    await createOpsApi({ http }).hub.receive(null, { poId: 'PO-2', lines: [{ sku: 'NL-BO-01', acceptedQty: 5 }] });
    expect(http.calls.map((c) => c.path)).toEqual(['/ops/hub/receipts']);
    expect(http.calls[0].body).toEqual({ poId: 'PO-2', lines: [{ sku: 'NL-BO-01', acceptedQty: 5 }] });
  });

  it('W5-03: compact bỏ null / undefined nhưng giữ chuỗi rỗng và 0; dropEmpty bỏ cả chuỗi rỗng', () => {
    expect(compact({ a: null, b: undefined, c: '', d: 0, e: false })).toEqual({ c: '', d: 0, e: false });
    expect(dropEmpty({ a: null, b: undefined, c: '', d: 0, e: false })).toEqual({ d: 0, e: false });
    expect(compact([1])).toEqual([1]);
  });
});
