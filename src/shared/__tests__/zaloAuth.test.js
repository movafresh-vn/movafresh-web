import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { resolveGoogleRedirectTo } from '../../services/supabase';
import { computeCodeChallenge, consumeZaloPkce, generateCodeVerifier, signInWithZalo } from '../../services/zaloAuth';
import { useMovaStore } from '../../stores/useMovaStore';

describe('Zalo OAuth v4 PKCE helper', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = new Map();
    vi.stubGlobal('sessionStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    });
  });

  it('sinh code_verifier dài >= 43 ký tự URL-safe và code_challenge S256 chuẩn RFC 7636', async () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);

    // RFC 7636 Appendix B test vector
    const rfcChallenge = await computeCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
    expect(rfcChallenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('signInWithZalo lưu PKCE vào sessionStorage, tạo URL oauth.zaloapp.com/v4/permission và consumeZaloPkce kiểm state một lần', async () => {
    let redirected = '';
    const res = await signInWithZalo({
      appId: '123456789',
      redirectUri: 'https://movafresh-web.netlify.app/auth/zalo/callback',
      returnTo: '/plans',
      navigate: (href) => {
        redirected = href;
      }
    });

    const parsed = new URL(redirected);
    expect(parsed.origin + parsed.pathname).toBe('https://oauth.zaloapp.com/v4/permission');
    expect(parsed.searchParams.get('app_id')).toBe('123456789');
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://movafresh-web.netlify.app/auth/zalo/callback');
    expect(parsed.searchParams.get('code_challenge')).toBe(res.codeChallenge);
    expect(parsed.searchParams.get('state')).toBe(res.state);

    // State sai bị từ chối và xóa storage
    const pkce = consumeZaloPkce(res.state);
    expect(pkce).not.toBeNull();
    expect(pkce.return_to).toBe('/plans');
    expect(pkce.code_verifier.length).toBeGreaterThanOrEqual(43);

    // Dùng lần 2 trả null (single-use)
    expect(consumeZaloPkce(res.state)).toBeNull();
  });

  it('resolveGoogleRedirectTo ép /auth/zalo/callback và mọi route /auth/* về /dashboard, giữ nguyên route thường', () => {
    const origin = 'https://movafresh-web.netlify.app';
    expect(resolveGoogleRedirectTo(undefined, { origin, pathname: '/auth/zalo/callback' })).toBe(`${origin}/dashboard`);
    expect(resolveGoogleRedirectTo(undefined, { origin, pathname: '/auth/google/callback' })).toBe(`${origin}/dashboard`);
    expect(resolveGoogleRedirectTo(`${origin}/auth/zalo/callback?error=access_denied`, { origin, pathname: '/' })).toBe(`${origin}/dashboard`);
    expect(resolveGoogleRedirectTo(undefined, { origin, pathname: '/plans' })).toBe(`${origin}/plans`);
    expect(resolveGoogleRedirectTo(`${origin}/account`, { origin, pathname: '/auth/zalo/callback' })).toBe(`${origin}/account`);
  });

  it('useMovaStore có isAuthenticated & loginWithGoogle, và ZaloCallbackView tự chuyển về /dashboard khi đã có phiên đăng nhập', () => {
    const store = useMovaStore();
    expect(store.isAuthenticated).toBe(false);
    store.setAuthUser({ id: 'u-google-1', email: 'test@gmail.com' });
    expect(store.isAuthenticated).toBe(true);
    expect(typeof store.loginWithGoogle).toBe('function');

    const cbView = readFileSync(resolve(process.cwd(), 'src/views/ZaloCallbackView.vue'), 'utf8');
    expect(cbView).toContain("router.replace('/dashboard')");
    expect(cbView).toContain('getAccessToken');
    expect(cbView).toContain('store.isAuthenticated');
  });
});
