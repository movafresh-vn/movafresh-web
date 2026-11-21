<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="login-title" @click.self="store.closeModal">
    <div class="mbox box">
      <button class="mclose" type="button" @click="store.closeModal" aria-label="Đóng">×</button>
      <h2 id="login-title" class="pl-h2">Tài khoản MOVA Fresh</h2>

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
        <p v-else class="pl-note" role="alert">Chưa cấu hình đăng nhập (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).</p>
        <router-link to="/plans" class="pl-btn ghost" @click="store.closeModal">Chưa có gói? Thiết kế thực đơn</router-link>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { supabase } from '../../services/supabase';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const contact = ref('');
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
      error.value = await store.requestOtp(contact.value);
      otpSent.value = !error.value;
    } else {
      error.value = await store.verifyOtp(contact.value, otp.value);
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
.stack { display: grid; gap: 12px; margin-top: 8px; }
</style>
