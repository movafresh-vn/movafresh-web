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
          <button v-if="!inMiniApp" class="pl-btn" type="button" data-testid="google-signin" :disabled="busy" @click="google">Tiếp tục với Google</button>
          <button class="pl-btn zalo-btn" type="button" data-testid="zalo-signin" :disabled="busy" @click="zalo">Tiếp tục với Zalo</button>
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

async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
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
}

async function google() {
  if (inMiniApp || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await store.loginWithGoogle();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chưa đăng nhập được bằng Google.';
    busy.value = false;
  }
}

async function zalo() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    if (inMiniApp) {
      const res = await store.loginWithZaloMiniApp();
      if (!res.ok) {
        error.value = res.message || 'Chưa đăng nhập được bằng Zalo Mini App.';
        busy.value = false;
        return;
      }
      store.closeModal();
      busy.value = false;
      return;
    }
    await signInWithZalo();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chưa đăng nhập được bằng Zalo.';
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
.zalo-btn { background: #0068FF; border-color: #0068FF; color: #fff; }
.zalo-btn:hover:not(:disabled) { background: #0055d4; border-color: #0055d4; }
.or { text-align: center; margin: 0; }
</style>
