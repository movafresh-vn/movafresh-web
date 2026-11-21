import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttp } from '../api/http';
import { createOpsApi, filenameOf, numHeader } from '../api/opsApi';
import { downloadText, withBom } from '../../ops/download';

const BOM = '﻿';
const csvResponse = (text, headers) => ({ ok: true, status: 200, text: async () => text, headers: new Headers(headers), json: async () => { throw new Error('không phải JSON'); } });

/** Máy chủ giả trả CSV thô cho từng đường, ghi lại mọi lời gọi. */
function csvServer(map) {
  const calls = [];
  const fetchImpl = vi.fn(async (url, init) => {
    calls.push({ url, init });
    const path = new URL(url).pathname.replace('/api/v2', '');
    if (!(path in map)) throw new Error(`chưa giả lập ${path}`);
    return map[path];
  });
  return { calls, fetchImpl };
}
const apiOver = (fetchImpl) => createOpsApi({ http: createHttp({ baseUrl: 'http://x', getToken: async () => 'tok', fetchImpl }) });

afterEach(() => vi.unstubAllGlobals());

describe('W8-02: xuất CSV tải về thành tệp', () => {
  it('W8-02: http as:"download" trả { text, headers } và không bóc phong bì JSON', async () => {
    const { fetchImpl } = csvServer({ '/ops/finance/journal.csv': csvResponse(`${BOM}a,b\n1,2\n`, { 'X-Count': '3' }) });
    const http = createHttp({ baseUrl: 'http://x', getToken: async () => 'tok', fetchImpl });
    const r = await http.get('/ops/finance/journal.csv', { as: 'download' });
    expect(r.text).toBe(`${BOM}a,b\n1,2\n`);
    expect(r.headers.get('X-Count')).toBe('3');
  });

  it('W8-02: tải lỗi (403) vẫn ném HttpError có mã, không trả CSV', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ status: 'error', error: { code: 'FORBIDDEN', message: 'no' } }) }));
    const http = createHttp({ baseUrl: 'http://x', getToken: async () => 'tok', fetchImpl });
    await expect(http.get('/ops/finance/journal.csv', { as: 'download' })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('W8-02: bút toán: tên tệp từ Content-Disposition, số chứng từ, cờ cân Nợ = Có và tài khoản chưa ánh xạ từ tiêu đề; bộ lọc đi trên query', async () => {
    const { calls, fetchImpl } = csvServer({
      '/ops/finance/journal.csv': csvResponse(`${BOM}Ngày,Nợ,Có\n`, { 'Content-Disposition': 'attachment; filename="but-toan-2026-12-01-2026-12-07.csv"', 'X-Count': '12', 'X-Balanced': 'true', 'X-Unmapped': '' })
    });
    const f = await apiOver(fetchImpl).finance.journalCsv(null, { from: '2026-12-01', to: '2026-12-07', groups: ['prepaid', 'delivery'] });
    expect(f).toEqual({ filename: 'but-toan-2026-12-01-2026-12-07.csv', csv: `${BOM}Ngày,Nợ,Có\n`, count: 12, totals: { balanced: true }, unmapped: [] });
    expect(calls[0].url).toBe('http://x/api/v2/ops/finance/journal.csv?from=2026-12-01&to=2026-12-07&groups=prepaid%2Cdelivery');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].init.headers.Authorization).toBe('Bearer tok');
  });

  it('W8-02: bút toán lệch và tài khoản chưa ánh xạ được báo ra để màn hình cảnh báo', async () => {
    const { fetchImpl } = csvServer({ '/ops/finance/journal.csv': csvResponse('x', { 'X-Count': '2', 'X-Balanced': 'false', 'X-Unmapped': '3387,131' }) });
    const f = await apiOver(fetchImpl).finance.journalCsv(null, {});
    expect(f.totals.balanced).toBe(false);
    expect(f.unmapped).toEqual(['3387', '131']);
    expect(f.filename).toBe('but-toan.csv'); // máy chủ không gửi tên tệp: dùng tên dự phòng
  });

  it('W8-02: file chi: ghép mã PO bằng dấu phẩy, đọc số khoản và tổng tiền từ tiêu đề; bảng kê thu mua đọc số bảng kê', async () => {
    const { calls, fetchImpl } = csvServer({
      '/ops/finance/pay-run/file': csvResponse(`${BOM}stk,so_tien\n`, { 'Content-Disposition': 'attachment; filename="file-chi-2026-12-03.csv"', 'X-Count': '2', 'X-Total-Vnd': '5400000' }),
      '/ops/finance/statements.csv': csvResponse(`${BOM}BK\n`, { 'Content-Disposition': 'attachment; filename="bang-ke-thu-mua.csv"', 'X-Count': '7' })
    });
    const a = apiOver(fetchImpl);
    const pr = await a.finance.payRunFile(null, { poIds: ['PO-1', 'PO-2'] });
    expect(pr).toEqual({ filename: 'file-chi-2026-12-03.csv', csv: `${BOM}stk,so_tien\n`, count: 2, totalVnd: 5_400_000 });
    expect(calls[0].url).toContain('poIds=PO-1%2CPO-2');
    const st = await a.finance.statementsCsv();
    expect(st).toEqual({ filename: 'bang-ke-thu-mua.csv', csv: `${BOM}BK\n`, count: 7 });
    await a.finance.payRunFile(null, {});
    expect(calls[2].url).toBe('http://x/api/v2/ops/finance/pay-run/file'); // không chọn PO nào: không gửi poIds
  });

  it('W8-02: filenameOf / numHeader chịu được tiêu đề thiếu hoặc lạ', () => {
    expect(filenameOf(new Headers({ 'Content-Disposition': 'attachment; filename=abc.csv' }), 'x.csv')).toBe('abc.csv');
    expect(filenameOf(new Headers({ 'Content-Disposition': 'attachment; filename="file%20chi.csv"' }), 'x.csv')).toBe('file chi.csv');
    expect(filenameOf(new Headers(), 'x.csv')).toBe('x.csv');
    expect(filenameOf(null, 'x.csv')).toBe('x.csv');
    expect(numHeader(new Headers({ 'X-Count': '9' }), 'X-Count')).toBe(9);
    expect(numHeader(new Headers({ 'X-Count': 'abc' }), 'X-Count')).toBe(0);
    expect(numHeader(new Headers(), 'X-Count')).toBe(0);
  });

  it('W8-02: downloadText tạo một tệp có tên đúng từ nội dung CSV của máy chủ (BOM giữ nguyên, không thêm lần hai)', async () => {
    const clicked = [];
    let blob = null;
    vi.stubGlobal('document', {
      createElement: () => ({ set href(v) {}, set download(v) { this._name = v; }, click() { clicked.push(this._name); }, remove() {} }),
      body: { appendChild() {} }
    });
    vi.stubGlobal('URL', { createObjectURL: (b) => ((blob = b), 'blob:x'), revokeObjectURL() {} });
    downloadText('but-toan.csv', `${BOM}a,b\n`);
    expect(clicked).toEqual(['but-toan.csv']);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // đúng một BOM đầu tệp
    expect(bytes.length).toBe(3 + 4);
    expect(withBom(`${BOM}x`)).toBe(`${BOM}x`);
    expect(withBom('x')).toBe(`${BOM}x`);
  });

  it('W8-02: màn bút toán và công nợ tải tệp bằng đúng tên và nội dung máy chủ gửi, qua downloadText', async () => {
    const { read } = await import('./helpers/asyncScan');
    const j = read('ops/views/finance/JournalView.vue');
    expect(j).toContain('downloadText(f.filename, f.csv)');
    expect(j).toContain('await api.ops.finance.journalCsv');
    expect(j).toContain('await api.ops.finance.statementsCsv');
    const p = read('ops/views/finance/PayablesFinView.vue');
    expect(p).toContain('downloadText(f.filename, f.csv)');
    expect(p).toContain('await api.ops.finance.payRunFile');
    expect(p).not.toMatch(/mock/i);
  });
});
