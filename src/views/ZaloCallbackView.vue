<template>
  <div class="zalo-cb-view">
    <div class="wrap">
      <section class="pl-card box">
        <h1 class="pl-h2">Đăng nhập Zalo</h1>
        <p v-if="!error" class="pl-lead">{{ statusText }}</p>
        <template v-else>
          <p class="pl-error" role="alert">{{ error }}</p>
          <div class="actions">
            <router-link to="/account" class="pl-btn primary">Về tài khoản</router-link>
            <router-link to="/" class="pl-btn">Về trang chủ</router-link>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../shared/api';
import { verifyMagicLinkToken } from '../services/supabase';
import { consumeZaloPkce } from '../services/zaloAuth';
import { useMovaStore } from '../stores/useMovaStore';

const route = useRoute();
const router = useRouter();
const store = useMovaStore();

const statusText = ref('Đang hoàn tất đăng nhập với Zalo…');
const error = ref('');

onMounted(async () => {
  const errParam = route.query.error || route.query.error_description;
  if (errParam) {
    error.value = 'Bạn đã hủy hoặc không hoàn tất cấp quyền đăng nhập Zalo.';
    return;
  }

  const code = typeof route.query.code === 'string' ? route.query.code : '';
  const state = typeof route.query.state === 'string' ? route.query.state : '';
  if (!code) {
    error.value = 'Thiếu mã xác thực từ Zalo. Vui lòng thử đăng nhập lại.';
    return;
  }

  const pkce = consumeZaloPkce(state);
  if (!pkce || !pkce.code_verifier) {
    error.value = 'Phiên xác thực Zalo không hợp lệ hoặc đã hết hạn. Vui lòng thử đăng nhập lại.';
    return;
  }

  try {
    const res = await api.customer.zaloCallback({
      code,
      code_verifier: pkce.code_verifier,
      ...(pkce.redirect_uri ? { redirect_uri: pkce.redirect_uri } : {})
    });
    if (res.status === 'error') {
      error.value = res.error.message || 'Không thể đăng nhập bằng Zalo lúc này.';
      return;
    }
    const tokenHash = res.data?.token_hash;
    if (!tokenHash) {
      error.value = 'Máy chủ không trả về phiên đăng nhập hợp lệ.';
      return;
    }
    const user = await verifyMagicLinkToken(tokenHash);
    store.setAuthUser(user);
    await store.refresh();
    store.toast(store.userName ? `Đã vào tài khoản ${store.userName}` : 'Đăng nhập Zalo thành công.');
    const target = typeof pkce.return_to === 'string' && pkce.return_to.startsWith('/') && !pkce.return_to.startsWith('/auth/zalo/callback')
      ? pkce.return_to
      : '/account';
    await router.replace(target);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chưa hoàn tất được đăng nhập Zalo.';
  }
});
</script>

<style scoped>
.zalo-cb-view { padding: 48px 0 80px; min-height: 60vh; }
.box { max-width: 480px; margin: 0 auto; display: grid; gap: 12px; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
