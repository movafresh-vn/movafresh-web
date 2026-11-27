// Helper Zalo OAuth v4 PKCE (S256). Chỉ dùng VITE_ZALO_APP_ID và VITE_ZALO_REDIRECT_URI công khai;
// ZALO_APP_SECRET_KEY và appsecret_proof luôn nằm ở backend (POST /api/v2/auth/zalo/callback).

const ZALO_PERMISSION_URL = 'https://oauth.zaloapp.com/v4/permission';
const STORAGE_KEY = 'mova_zalo_oauth_pkce_v1';

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Sinh code_verifier chuẩn RFC 7636 (64 byte ngẫu nhiên -> 86 ký tự base64url). */
export function generateCodeVerifier(lengthBytes = 64) {
  const buf = new Uint8Array(lengthBytes);
  globalThis.crypto.getRandomValues(buf);
  return toBase64Url(buf);
}

/** Tính code_challenge = BASE64URL(SHA-256(code_verifier)) theo chuẩn PKCE S256. */
export async function computeCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return toBase64Url(new Uint8Array(digest));
}

export function generateState() {
  const buf = new Uint8Array(24);
  globalThis.crypto.getRandomValues(buf);
  return toBase64Url(buf);
}

export function isZaloLoginConfigured() {
  return Boolean(import.meta.env?.VITE_ZALO_APP_ID);
}

export function resolveZaloRedirectUri(override) {
  if (override) return override;
  if (import.meta.env?.VITE_ZALO_REDIRECT_URI) return import.meta.env.VITE_ZALO_REDIRECT_URI;
  return typeof location !== 'undefined' ? `${location.origin}/auth/zalo/callback` : '';
}

/** Lưu state + code_verifier vào sessionStorage và chuyển trình duyệt sang trang cấp quyền Zalo OAuth v4. */
export async function signInWithZalo(opts = {}) {
  const appId = opts.appId || import.meta.env?.VITE_ZALO_APP_ID;
  if (!appId) {
    throw new Error('Chưa cấu hình đăng nhập Zalo (VITE_ZALO_APP_ID).');
  }
  const redirectUri = resolveZaloRedirectUri(opts.redirectUri);
  if (!redirectUri) {
    throw new Error('Chưa xác định được địa chỉ quay lại sau khi đăng nhập Zalo.');
  }
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await computeCodeChallenge(codeVerifier);
  const returnTo = opts.returnTo || (typeof location !== 'undefined' ? `${location.pathname}${location.search}` : '/account');

  const payload = { state, code_verifier: codeVerifier, redirect_uri: redirectUri, return_to: returnTo, created_at: Date.now() };
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  const url = new URL(ZALO_PERMISSION_URL);
  url.searchParams.set('app_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('state', state);

  const navigate = opts.navigate || ((href) => window.location.assign(href));
  navigate(url.toString());
  return { url: url.toString(), state, codeChallenge };
}

/** Đọc, kiểm khớp state và xóa ngay trạng thái PKCE trong sessionStorage (dùng một lần). */
export function consumeZaloPkce(returnedState) {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.code_verifier || !parsed.state) return null;
    if (returnedState && parsed.state !== returnedState) return null;
    return parsed;
  } catch {
    return null;
  }
}
