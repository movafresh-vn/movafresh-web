// Tải ảnh lên kho riêng tư theo luồng "vé một lần": xin vé (đường dẫn + URL ký sẵn) rồi PUT tệp lên URL đó.
// Ảnh trong hàng đợi offline là chuỗi data URL; chỉ khi có mạng mới đổi thành đường dẫn của kho.
import { HttpError } from './http';

export const PHOTO_PURPOSE = { receipt: 'receipt', depart: 'handover', shortage: 'shortage' };

export const isDataUrl = (s) => typeof s === 'string' && s.startsWith('data:');

/** 'data:image/jpeg;base64,...' thành { blob, contentType }. Ném lỗi nếu không phải ảnh được hỗ trợ. */
export function dataUrlToBlob(dataUrl) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!m) throw new HttpError('Ảnh không đúng định dạng', { code: 'PHOTO_INVALID', status: 0 });
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: m[1] }), contentType: m[1] };
}

/**
 * @param {{ ticket: (purpose: string, contentType: string) => Promise<{path: string, upload_url: string}>, fetchImpl?: typeof fetch }} deps
 * @returns {Promise<string>} đường dẫn ảnh trong kho (dùng làm `photo` của thao tác)
 */
export async function uploadPhoto(dataUrl, purpose, { ticket, fetchImpl }) {
  const { blob, contentType } = dataUrlToBlob(dataUrl);
  const t = await ticket(purpose, contentType);
  const f = fetchImpl || globalThis.fetch;
  let res;
  try {
    res = await f(t.upload_url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
  } catch (e) {
    throw new HttpError('Không tải được ảnh lên', { code: 'NETWORK_ERROR', status: 0, details: { cause: String(e && e.message) } });
  }
  if (!res.ok) throw new HttpError('Kho ảnh từ chối tệp', { code: 'UPLOAD_FAILED', status: res.status });
  return t.path;
}

/** Ảnh hiển thị được ngay (data URL hoặc http); đường dẫn trong kho cần URL tải riêng nên trả null. */
export const photoSrc = (p) => (typeof p === 'string' && (p.startsWith('data:') || /^https?:\/\//.test(p)) ? p : null);

const signedUrlCache = new Map();

/**
 * Lấy URL hiển thị ảnh: nếu là data URL hoặc https?:// thì dùng ngay;
 * nếu là đường dẫn trong kho thì gọi fetchSignedUrl (nếu có) và lưu bộ nhớ đệm.
 */
export async function resolvePhotoUrl(path, fetchSignedUrl) {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('data:') || /^https?:\/\//.test(path)) return path;
  if (signedUrlCache.has(path)) return signedUrlCache.get(path);
  if (!fetchSignedUrl) return null;
  try {
    const url = await fetchSignedUrl(path);
    if (url) signedUrlCache.set(path, url);
    return url;
  } catch {
    return null;
  }
}
