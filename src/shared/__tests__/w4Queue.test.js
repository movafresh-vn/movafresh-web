import { describe, expect, it, vi } from 'vitest';
import { enqueue, flush, isNetworkError, makeEntry, pendingOf } from '../domain/offlineQueue';
import { HttpError } from '../api/http';
import { dataUrlToBlob, isDataUrl, photoSrc, uploadPhoto } from '../api/uploads';
import { preparePhotos } from '../../ops/queuePhotos';
import { read } from './helpers/asyncScan';

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const mk = (id, type, extra = {}) => makeEntry({ id, call: 'factory.apply', args: { type, opId: id, ...extra }, at: '2026-11-25T00:00:00.000Z' });
const queueOf = (...entries) => entries.reduce((q, e) => enqueue(q, e), []);

describe('W4-10: hàng đợi offline tải ảnh trước rồi mới phát lại thao tác', () => {
  it('W4-10: data URL thành Blob đúng loại; chuỗi lạ bị từ chối', () => {
    const { blob, contentType } = dataUrlToBlob(PHOTO);
    expect(contentType).toBe('image/jpeg');
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBe(10);
    expect(() => dataUrlToBlob('http://x/y.jpg')).toThrow('Ảnh không đúng định dạng');
    expect(isDataUrl(PHOTO)).toBe(true);
    expect(isDataUrl('receipt/202611/a.jpg')).toBe(false);
    expect(photoSrc(PHOTO)).toBe(PHOTO);
    expect(photoSrc('receipt/202611/a.jpg')).toBeNull();
    expect(photoSrc(null)).toBeNull();
  });

  it('W4-10: uploadPhoto xin vé đúng mục đích + loại tệp, PUT blob lên URL ký sẵn, trả đường dẫn trong kho', async () => {
    const ticket = vi.fn(async () => ({ path: 'receipt/202611/u.jpg', upload_url: 'https://store/sign?t=1' }));
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));
    expect(await uploadPhoto(PHOTO, 'receipt', { ticket, fetchImpl })).toBe('receipt/202611/u.jpg');
    expect(ticket).toHaveBeenCalledWith('receipt', 'image/jpeg');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://store/sign?t=1');
    expect(init.method).toBe('PUT');
    expect(init.headers['Content-Type']).toBe('image/jpeg');
    expect(init.body.size).toBe(10);
  });

  it('W4-10: kho từ chối tệp là UPLOAD_FAILED; mất mạng khi PUT là NETWORK_ERROR (hàng đợi giữ lại)', async () => {
    const ticket = async () => ({ path: 'p', upload_url: 'u' });
    await expect(uploadPhoto(PHOTO, 'receipt', { ticket, fetchImpl: async () => ({ ok: false, status: 403 }) })).rejects.toMatchObject({ code: 'UPLOAD_FAILED', status: 403 });
    const e = await uploadPhoto(PHOTO, 'receipt', { ticket, fetchImpl: async () => { throw new TypeError('x'); } }).catch((x) => x);
    expect(e).toBeInstanceOf(HttpError);
    expect(isNetworkError(e)).toBe(true);
    expect(isNetworkError(Object.assign(new Error('x'), { code: 'NETWORK' }))).toBe(true);
    expect(isNetworkError(Object.assign(new Error('x'), { code: 'LOT_CODE_TAKEN' }))).toBe(false);
  });

  it('W4-10: chỉ receipt / depart / shortage có ảnh cần tải, đúng mục đích; ảnh đã là đường dẫn thì không tải lại', async () => {
    const up = vi.fn(async (d, purpose) => `${purpose}/x.jpg`);
    expect((await preparePhotos(mk('a1', 'receipt', { photo: PHOTO }), up)).photo).toBe('receipt/x.jpg');
    expect((await preparePhotos(mk('a2', 'depart', { photo: PHOTO }), up)).photo).toBe('handover/x.jpg');
    expect((await preparePhotos(mk('a3', 'shortage', { photo: PHOTO }), up)).photo).toBe('shortage/x.jpg');
    expect(await preparePhotos(mk('a4', 'shortage', { photo: null }), up)).toBeNull();
    expect(await preparePhotos(mk('a5', 'receipt', { photo: 'receipt/old.jpg' }), up)).toBeNull();
    expect(await preparePhotos(mk('a6', 'tick', { photo: PHOTO }), up)).toBeNull();
    expect(await preparePhotos(makeEntry({ id: 'a7', call: 'substituteDish', args: {} }), up)).toBeNull();
    expect(up).toHaveBeenCalledTimes(3);
  });

  it('W4-10: flush tải ảnh TRƯỚC khi gửi, gửi thao tác với đường dẫn (không còn data URL) và lưu đường dẫn vào hàng đợi', async () => {
    const order = [];
    const sent = [];
    const seen = [];
    const out = await flush({
      items: queueOf(mk('op-1', 'receipt', { photo: PHOTO })),
      prepare: (e) => preparePhotos(e, async () => { order.push('upload'); return 'receipt/u.jpg'; }),
      send: async (e) => { order.push('send'); sent.push(e.args); },
      onChange: (items, ev) => seen.push(ev.result)
    });
    expect(order).toEqual(['upload', 'send']);
    expect(sent[0].photo).toBe('receipt/u.jpg');
    expect(sent[0].opId).toBe('op-1');
    expect(seen).toEqual(['prepared', 'sent']);
    expect(out).toMatchObject({ sent: 1, failed: 0, stopped: null, items: [] });
  });

  it('W4-10: gửi thao tác lỗi mạng sau khi đã tải ảnh: giữ mục với ĐƯỜNG DẪN mới, lần sau không tải ảnh lần hai', async () => {
    const up = vi.fn(async () => 'handover/u.jpg');
    const prepare = (e) => preparePhotos(e, up);
    const first = await flush({
      items: queueOf(mk('op-2', 'depart', { photo: PHOTO })),
      prepare,
      send: async () => { throw Object.assign(new Error('mạng'), { code: 'NETWORK_ERROR' }); }
    });
    expect(first.stopped).toBe('network');
    expect(first.items[0].args.photo).toBe('handover/u.jpg');
    expect(first.items[0].tries).toBe(1);
    const second = await flush({ items: first.items, prepare, send: async () => {} });
    expect(second.sent).toBe(1);
    expect(up).toHaveBeenCalledTimes(1);
  });

  it('W4-10: mất mạng khi tải ảnh dừng cả lượt và giữ nguyên thứ tự; lỗi nghiệp vụ chỉ đánh dấu mục đó, mục sau vẫn gửi', async () => {
    const send = vi.fn(async () => {});
    const net = await flush({
      items: queueOf(mk('n1', 'receipt', { photo: PHOTO }), mk('n2', 'tick')),
      prepare: async () => { throw Object.assign(new Error('mạng'), { code: 'NETWORK_ERROR' }); },
      send
    });
    expect(net.stopped).toBe('network');
    expect(send).not.toHaveBeenCalled();
    expect(pendingOf(net.items).map((i) => i.id)).toEqual(['n1', 'n2']);

    const biz = await flush({
      items: queueOf(mk('b1', 'receipt', { photo: PHOTO }), mk('b2', 'tick')),
      prepare: async (e) => { if (e.id === 'b1') throw Object.assign(new Error('Ảnh bị từ chối'), { code: 'UPLOAD_FAILED' }); return null; },
      send
    });
    expect(biz).toMatchObject({ sent: 1, failed: 1, stopped: null });
    expect(biz.items.find((i) => i.id === 'b1')).toMatchObject({ status: 'failed', error: 'Ảnh bị từ chối' });
  });

  it('W4-10: không có hàm prepare thì flush chạy như cũ (tương thích ngược)', async () => {
    const out = await flush({ items: queueOf(mk('c1', 'tick')), send: async () => {} });
    expect(out.sent).toBe(1);
  });

  it('W4-10: queue.js nối prepare vào flush, đồng hồ lấy từ giờ máy chủ và không còn gọi summary để lấy giờ', () => {
    const q = read('ops/queue.js');
    expect(q).toMatch(/send,\s*\n\s*prepare,/);
    expect(q).toMatch(/preparePhotos\(entry, \(dataUrl, purpose\) => api\.ops\.uploads\.photo\(/);
    expect(q).toMatch(/serverNow\(\)\.toISOString\(\)/);
    expect(q).not.toMatch(/api\.ops\.summary/);
  });
});
