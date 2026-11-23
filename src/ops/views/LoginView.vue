<template>
  <section class="ops-card ops-login">
    <BrandLogo class="ops-login-logo" variant="onWhite" :width="120" />
    <h1>Đăng nhập vận hành</h1>
    <p class="ops-muted">Dùng email và mật khẩu do quản trị cấp. Mỗi tài khoản có đúng một vai trò.</p>

    <form @submit.prevent="submit">
      <label for="email">Email</label>
      <input id="email" v-model="email" class="ops-input" type="email" autocomplete="username" required />
      <label for="password">Mật khẩu</label>
      <input id="password" v-model="password" class="ops-input" type="password" autocomplete="current-password" required />
      <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
      <button class="ops-btn ops-btn-primary" type="submit" :disabled="busy">{{ busy ? 'Đang vào…' : 'Vào' }}</button>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { loginStaff } from '../session';
import BrandLogo from '../../components/common/BrandLogo.vue';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const s = await loginStaff(email.value, password.value);
    router.push(s.home);
  } catch (e) {
    error.value = e && e.code === 'NETWORK_ERROR' ? 'Không kết nối được máy chủ. Thử lại sau.' : (e && e.message) || 'Không đăng nhập được.';
  } finally {
    busy.value = false;
  }
}
</script>
