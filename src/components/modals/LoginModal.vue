<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="login-title" @click.self="store.closeModal">
    <div class="mbox box">
      <button class="mclose" type="button" @click="store.closeModal" aria-label="Đóng">×</button>
      <BrandLogo class="login-logo" variant="onWhite" :width="96" />
      <h2 id="login-title" class="pl-h2">Tài khoản MOVA FRESH</h2>

      <template v-if="store.isLoggedIn || store.authUser">
        <p class="pl-lead">
          Bạn đang vào tài khoản <b>{{ store.userName || store.authUser?.phone || store.authUser?.email }}</b>.
        </p>
        <div class="stack">
          <router-link to="/account" class="pl-btn primary" @click="store.closeModal">Xem gói của tôi</router-link>
          <button class="pl-btn" type="button" :disabled="busy" @click="logout">Đăng xuất</button>
        </div>
      </template>

      <template v-else>
        <p class="pl-lead">
          Nhập số điện thoại (hoặc email) bạn dùng đăng ký gói. MOVA gửi mã OTP để xác nhận đúng là bạn, không cần mật khẩu.
        </p>
        <form v-if="supabase" class="stack" @submit.prevent="submit">
          <label class="pl-label" for="login-contact">Số điện thoại hoặc email</label>
          <div class="contact-row">
            <DialSelect v-if="!isEmail" v-model="dial" :disabled="otpSent || busy" />
            <input
              id="login-contact"
              v-model="contact"
              class="pl-input"
              type="text"
              inputmode="tel"
              autocomplete="username"
              placeholder="0908 123 456"
              :disabled="otpSent || busy"
              required
            />
          </div>
          <template v-if="otpSent">
            <label class="pl-label" for="login-otp">Mã OTP</label>
            <input
              id="login-otp"
              v-model="otp"
              class="pl-input num"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="10"
              placeholder="Nhập mã OTP"
              required
            />
          </template>
          <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
          <button class="pl-btn primary" type="submit" :disabled="busy">
            {{ busy ? 'Đang xử lý…' : otpSent ? 'Xác thực OTP' : 'Gửi mã OTP' }}
          </button>
          <button v-if="otpSent" class="pl-btn" type="button" :disabled="busy" @click="reset">Đổi số điện thoại</button>
        </form>
        <!-- Đăng nhập nhanh: trên Zalo Mini App ẩn Google & OAuth Web redirect, chỉ dùng Zalo SDK -->
        <div v-if="supabase" class="google-block">
          <p class="pl-note or">hoặc</p>
          <button v-if="!inMiniApp" class="pl-btn social-btn google-btn" type="button" data-testid="google-signin" :disabled="busy" @click="google">
            <svg class="social-ico" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
              <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
            </svg>
            <span>Tiếp tục với Google</span>
          </button>
          <button class="pl-btn social-btn zalo-btn" type="button" data-testid="zalo-signin" :disabled="busy" @click="zalo">
            <svg class="social-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path fill="currentColor" d="M12 2.2C6.48 2.2 2 6.13 2 10.98c0 2.7 1.38 5.1 3.55 6.71L4.55 21.8l4.46-1.74c.96.26 1.97.4 2.99.4 5.52 0 10-3.93 10-8.78 0-5.24-4.48-9.48-10-9.48Z" />
              <path fill="#0068FF" d="M7.65 14.25v-1.3l3.36-4.12H7.88V7.45h4.82v1.3l-3.36 4.12h3.44v1.38H7.65Zm6.1 0V7.45h1.55v6.8h-1.55Zm2.55 0V9.55h1.45v4.7H16.3Z" />
            </svg>
            <span>Tiếp tục với Zalo</span>
          </button>
          <p v-if="oauthError" class="pl-panel warn oauth-alert" role="alert" data-testid="oauth-error">{{ oauthError }}</p>
          <p v-if="inMiniApp" class="pl-note">
            Đăng nhập bằng tài khoản Zalo. Số điện thoại chỉ được xác nhận khi bạn bấm liên kết hoặc đặt gói để bảo toàn số dư Fresh Credit.
          </p>
          <p v-else class="pl-note">Dùng Google hoặc Zalo thì bạn vẫn cần xác thực số điện thoại bằng mã OTP khi thanh toán gói.</p>
        </div>
        <p v-else class="pl-note" role="alert">Chưa cấu hình đăng nhập (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).</p>
        <router-link to="/plans" class="pl-btn ghost" @click="store.closeModal">Chưa có gói? Thiết kế thực đơn</router-link>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import DialSelect from './DialSelect.vue';
import BrandLogo from '../common/BrandLogo.vue';
import { supabase } from '../../services/supabase';
import { signInWithZalo } from '../../services/zaloAuth';
import { isZaloMiniApp } from '../../services/zaloMiniApp';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const inMiniApp = isZaloMiniApp();
const contact = ref('');
const dial = ref('84');
const isEmail = computed(() => contact.value.includes('@'));
const otp = ref('');
const otpSent = ref(false);
const busy = ref(false);
const error = ref('');
const oauthError = ref('');

async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  oauthError.value = '';
  try {
    if (!otpSent.value) {
      error.value = await store.requestOtp(contact.value, { dial: dial.value });
      otpSent.value = !error.value;
    } else {
      error.value = await store.verifyOtp(contact.value, otp.value, { dial: dial.value });
    }
  } finally {
    busy.value = false;
  }
}

function reset() {
  otpSent.value = false;
  otp.value = '';
  error.value = '';
  oauthError.value = '';
}

async function google() {
  if (inMiniApp || busy.value) return;
  busy.value = true;
  error.value = '';
  oauthError.value = '';
  try {
    await store.loginWithGoogle();
  } catch (e) {
    oauthError.value = e instanceof Error ? e.message : 'Chưa đăng nhập được bằng Google.';
    busy.value = false;
  }
}

async function zalo() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  oauthError.value = '';
  try {
    if (inMiniApp) {
      const res = await store.loginWithZaloMiniApp();
      if (!res.ok) {
        oauthError.value = res.message || 'Chưa đăng nhập được bằng Zalo Mini App.';
        busy.value = false;
        return;
      }
      store.closeModal();
      busy.value = false;
      return;
    }
    await signInWithZalo();
  } catch (e) {
    oauthError.value = e instanceof Error ? e.message : 'Chưa đăng nhập được bằng Zalo.';
    busy.value = false;
  }
}

async function logout() {
  busy.value = true;
  try {
    await store.logout();
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.box { max-width: 480px; padding: 26px 22px; }
.login-logo { margin-bottom: 12px; height: auto; }
.stack { display: grid; gap: 12px; margin-top: 8px; }
.contact-row { display: flex; gap: 8px; align-items: center; }
.contact-row .pl-input:last-child { flex: 1; min-width: 0; }
.google-block { display: grid; gap: 8px; margin-top: 10px; }
.social-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; }
.social-ico { width: 20px; height: 20px; flex-shrink: 0; display: block; }
.google-btn { background: var(--white); border-color: var(--line-strong); color: var(--ink); }
.google-btn:hover:not(:disabled) { background: var(--cream-warm); }
.zalo-btn { background: #0068FF; border-color: #0068FF; color: #fff; }
.zalo-btn:hover:not(:disabled) { background: #0055d4; border-color: #0055d4; }
.oauth-alert { font-size: 13.5px; padding: 10px 12px; margin: 2px 0 0; }
.or { text-align: center; margin: 0; }
</style>
