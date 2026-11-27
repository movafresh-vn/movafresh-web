// Nhận diện môi trường Zalo Mini App & wrapper an toàn cho zmp-sdk (lazy import để chạy được cả trong Node/Vitest).

export const ZALO_MINI_APP_ID = '121806527898668854';

/**
 * Nhận diện ứng dụng đang chạy trong WebView Zalo Mini App:
 * - Cầu nối JS của Zalo (`window.ZJSBridge`)
 * - Cờ build môi trường (`import.meta.env.VITE_ZALO_MINIAPP === 'true'`)
 * - Hostname chuẩn của Zalo Mini App (`h5.zdn.vn`, kể cả `zbrowser://h5.zdn.vn`)
 */
export function isZaloMiniApp(ctx = {}) {
  const env = ctx.env !== undefined ? ctx.env : import.meta.env;
  if (env && String(env.VITE_ZALO_MINIAPP || '').toLowerCase() === 'true') return true;

  const win = ctx.win !== undefined ? ctx.win : (typeof window !== 'undefined' ? window : undefined);
  if (win && win.ZJSBridge) return true;

  const loc = ctx.loc !== undefined ? ctx.loc : (typeof location !== 'undefined' ? location : win?.location);
  const host = String(loc?.hostname || '').toLowerCase();
  if (host === 'h5.zdn.vn' || host.endsWith('.h5.zdn.vn')) return true;

  const href = String(loc?.href || '').toLowerCase();
  if (href.startsWith('zbrowser://h5.zdn.vn')) return true;

  return false;
}

async function loadZmpSdk(sdkLoader) {
  if (sdkLoader) return sdkLoader();
  if (typeof window === 'undefined') {
    throw new Error('zmp-sdk chỉ hoạt động trên trình duyệt hoặc Zalo Mini App.');
  }
  return import('zmp-sdk');
}

function isUserDeniedError(err) {
  const code = Number(err?.code);
  if ([-201, -1401, -2002, -2003].includes(code)) return true;
  return /deny|denied|cancel/i.test(String(err?.message || ''));
}

/**
 * Lấy access_token người dùng từ zmp-sdk (không tự gọi getPhoneNumber).
 */
export async function getMiniAppAccessToken({ sdkLoader } = {}) {
  const sdk = await loadZmpSdk(sdkLoader);
  if (!sdk?.getAccessToken) {
    throw new Error('Không tìm thấy hàm getAccessToken trong zmp-sdk.');
  }
  let token;
  try {
    token = await sdk.getAccessToken();
  } catch (err) {
    if (isUserDeniedError(err)) {
      throw new Error('Bạn đã hủy cấp quyền đăng nhập Zalo. Vui lòng thử lại.');
    }
    throw new Error(err?.message || 'Không lấy được mã xác thực từ Zalo Mini App.');
  }
  const clean = typeof token === 'string' ? token.trim() : '';
  if (!clean) {
    throw new Error('Zalo Mini App chưa trả về access_token hợp lệ.');
  }
  return clean;
}

/**
 * Chỉ gọi khi người dùng bấm nút xác nhận liên kết SĐT / đặt gói (tuân thủ quy định kiểm duyệt Zalo).
 */
export async function getMiniAppPhoneToken({ sdkLoader } = {}) {
  const sdk = await loadZmpSdk(sdkLoader);
  if (!sdk?.getPhoneNumber) {
    throw new Error('Không tìm thấy hàm getPhoneNumber trong zmp-sdk.');
  }
  let res;
  try {
    res = await sdk.getPhoneNumber();
  } catch (err) {
    if (isUserDeniedError(err)) {
      throw new Error('Bạn chưa đồng ý chia sẻ số điện thoại trên Zalo. Bạn có thể bấm thử lại hoặc xác thực bằng mã OTP.');
    }
    throw new Error(err?.message || 'Không lấy được quyền số điện thoại từ Zalo Mini App.');
  }
  const token = typeof res?.token === 'string' ? res.token.trim() : '';
  if (!token) {
    throw new Error('Không nhận được token số điện thoại từ Zalo. Vui lòng thử lại hoặc dùng mã OTP.');
  }
  return token;
}

/**
 * Mở liên kết ngoài an toàn: trong Zalo Mini App dùng zmp-sdk (`openWebview` / `openPhone`),
 * tuyệt đối không dùng `window.open` bị WebView Zalo chặn.
 */
export async function openExternalUrl(url, opts = {}) {
  const target = String(url || '').trim();
  if (!target) return false;

  if (isZaloMiniApp(opts.ctx)) {
    const sdk = await loadZmpSdk(opts.sdkLoader).catch(() => null);
    if (target.startsWith('tel:')) {
      const phoneNumber = target.slice(4).trim();
      if (sdk?.openPhone && phoneNumber) {
        await sdk.openPhone({ phoneNumber });
        return true;
      }
      if (typeof location !== 'undefined') location.assign(target);
      return true;
    }
    if (/^https?:\/\//i.test(target)) {
      if (sdk?.openWebview) {
        try {
          await sdk.openWebview({
            url: target,
            config: {
              style: opts.style || 'normal',
              leftButton: opts.leftButton || 'back'
            }
          });
          return true;
        } catch {
          if (sdk?.openOutApp) {
            await sdk.openOutApp({ url: target });
            return true;
          }
        }
      }
      if (sdk?.openOutApp) {
        await sdk.openOutApp({ url: target });
        return true;
      }
      if (typeof location !== 'undefined') location.assign(target);
      return true;
    }
    if (typeof location !== 'undefined') location.assign(target);
    return true;
  }

  if (opts.sameTab) {
    if (typeof location !== 'undefined') location.assign(target);
    return true;
  }
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(target, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
}

/** Đọc thông tin hệ thống từ zmp-sdk nếu đang chạy trong Mini App. */
export async function getMiniAppSystemInfo({ sdkLoader } = {}) {
  if (!isZaloMiniApp()) return null;
  try {
    const sdk = await loadZmpSdk(sdkLoader);
    return sdk?.getSystemInfo ? sdk.getSystemInfo() : null;
  } catch {
    return null;
  }
}
