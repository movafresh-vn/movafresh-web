import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getMiniAppAccessToken,
  getMiniAppPhoneToken,
  isZaloMiniApp,
  openExternalUrl,
  ZALO_MINI_APP_ID
} from '../../services/zaloMiniApp';
import { CUSTOMER_ROUTES } from '../api/routes';

const ROOT = resolve(process.cwd());
const readRoot = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('Zalo Mini App SDK helper & cấu hình', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('isZaloMiniApp() nhận diện chính xác WebView Zalo qua ZJSBridge, env flag hoặc hostname h5.zdn.vn', () => {
    expect(isZaloMiniApp({ win: {}, loc: { hostname: 'movafresh-web.netlify.app', href: 'https://movafresh-web.netlify.app/' }, env: {} })).toBe(false);
    expect(isZaloMiniApp({ win: {}, loc: { hostname: 'localhost', href: 'http://localhost:5173/' }, env: {} })).toBe(false);

    expect(isZaloMiniApp({ win: { ZJSBridge: {} }, loc: { hostname: 'localhost' }, env: {} })).toBe(true);
    expect(isZaloMiniApp({ win: {}, loc: { hostname: 'localhost' }, env: { VITE_ZALO_MINIAPP: 'true' } })).toBe(true);
    expect(isZaloMiniApp({ win: {}, loc: { hostname: 'h5.zdn.vn', href: 'https://h5.zdn.vn/zapps/121806527898668854/' }, env: {} })).toBe(true);
    expect(isZaloMiniApp({ win: {}, loc: { hostname: '', href: 'zbrowser://h5.zdn.vn/zapps/121806527898668854/' }, env: {} })).toBe(true);
  });

  it('getMiniAppAccessToken & getMiniAppPhoneToken gọi đúng zmp-sdk và xử lý từ chối quyền', async () => {
    const sdk = {
      getAccessToken: vi.fn(async () => 'zmp-at-001'),
      getPhoneNumber: vi.fn(async () => ({ token: 'zmp-pt-002' }))
    };
    expect(await getMiniAppAccessToken({ sdkLoader: async () => sdk })).toBe('zmp-at-001');
    expect(await getMiniAppPhoneToken({ sdkLoader: async () => sdk })).toBe('zmp-pt-002');

    const deniedSdk = {
      getPhoneNumber: vi.fn(async () => {
        const err = new Error('User denied');
        err.code = -201;
        throw err;
      })
    };
    await expect(getMiniAppPhoneToken({ sdkLoader: async () => deniedSdk })).rejects.toThrow(/chưa đồng ý chia sẻ số điện thoại/);
  });

  it('openExternalUrl trong Mini App dùng openWebview/openPhone, không gọi window.open', async () => {
    const openSpy = vi.fn();
    vi.stubGlobal('window', { open: openSpy });
    const openWebview = vi.fn(async () => {});
    const openPhone = vi.fn(async () => {});

    await openExternalUrl('https://zalo.me', {
      ctx: { win: {}, loc: { hostname: 'h5.zdn.vn' }, env: {} },
      sdkLoader: async () => ({ openWebview, openPhone })
    });
    expect(openWebview).toHaveBeenCalledWith({
      url: 'https://zalo.me',
      config: { style: 'normal', leftButton: 'back' }
    });
    expect(openSpy).not.toHaveBeenCalled();

    await openExternalUrl('tel:19008899', {
      ctx: { win: {}, loc: { hostname: 'h5.zdn.vn' }, env: {} },
      sdkLoader: async () => ({ openWebview, openPhone })
    });
    expect(openPhone).toHaveBeenCalledWith({ phoneNumber: '19008899' });
    expect(openSpy).not.toHaveBeenCalled();

    // Trên Web thường vẫn mở tab mới bình thường
    await openExternalUrl('https://zalo.me', {
      ctx: { win: {}, loc: { hostname: 'movafresh-web.netlify.app' }, env: {} }
    });
    expect(openSpy).toHaveBeenCalledWith('https://zalo.me', '_blank', 'noopener,noreferrer');
  });

  it('app-config.json và package.json đúng chuẩn Zalo Mini App & ZMP CLI scripts', () => {
    expect(ZALO_MINI_APP_ID).toBe('121806527898668854');
    const cfg = JSON.parse(readRoot('app-config.json'));
    expect(cfg.app.title).toBe('Mova Fresh');
    expect(cfg.app.headerColor).toBe('#0B9C63');
    expect(cfg.app.textColor).toBe('white');
    expect(cfg.app.statusBarColor).toBe('#0B9C63');
    expect(cfg.app.actionBarHidden).toBe(true);

    const pkg = JSON.parse(readRoot('package.json'));
    expect(pkg.dependencies['zmp-sdk']).toBeTruthy();
    expect(pkg.scripts['zmp:build']).toBeTruthy();
    expect(pkg.scripts['zmp:deploy']).toBeTruthy();
    expect(CUSTOMER_ROUTES.zaloMiniApp).toEqual(['POST', '/auth/zalo-miniapp', { auth: false }]);
  });

  it('AppHeader, LoginModal, StepCheckout và ProfileTab tuân thủ capsule clearance & kiểm duyệt SĐT Zalo', () => {
    const hdr = readRoot('src/components/common/AppHeader.vue');
    expect(hdr).toContain('isZaloMiniApp');
    expect(hdr).toContain('zmp-hdr');
    expect(hdr).toContain('margin-top: 44px');

    const login = readRoot('src/components/modals/LoginModal.vue');
    expect(login).toContain('v-if="!inMiniApp"');
    expect(login).toContain('loginWithZaloMiniApp');
    expect(login).not.toContain('getPhoneNumber');

    const checkout = readRoot('src/components/plans/StepCheckout.vue');
    expect(checkout).toContain('Dùng số điện thoại để định danh đơn hàng và bảo toàn số dư Fresh Credit của bạn');
    expect(checkout).toContain('linkPhoneViaZaloMiniApp');
    expect(checkout).toContain(":target=\"inMiniApp ? undefined : '_blank'\"");

    const profile = readRoot('src/components/dashboard/ProfileTab.vue');
    expect(profile).toContain('Dùng số điện thoại để định danh đơn hàng và bảo toàn số dư Fresh Credit của bạn');
    expect(profile).toContain('linkPhoneViaZaloMiniApp');
  });
});
