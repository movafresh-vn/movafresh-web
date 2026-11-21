<template>
  <div class="ops">
    <header v-if="session" class="ops-bar ops-noprint">
      <div class="ops-brand">
        <strong>MOVA Vận hành</strong>
        <span class="ops-role">{{ session.label }}</span>
      </div>
      <div class="ops-clock" :title="'Giờ nghiệp vụ theo máy chủ'" data-testid="ops-clock">
        {{ clockText }}
      </div>
      <button class="ops-btn ops-btn-ghost" @click="logout">Đăng xuất</button>
    </header>

    <nav v-if="session" class="ops-nav ops-noprint" aria-label="Phân hệ">
      <RouterLink v-for="m in menu" :key="m.path" :to="m.path" class="ops-tab">{{ m.title }}</RouterLink>
    </nav>

    <QueueBanner v-if="session" />

    <main class="ops-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { session, ctx, logoutStaff } from './session';
import { modulesFor } from './modules';
import { api } from '../shared/api';
import { fmtDeadline } from '../shared/utils/time';
import { useLive } from './useLive';
import QueueBanner from './components/QueueBanner.vue';

const router = useRouter();
const menu = computed(() => (session.value ? modulesFor(session.value.role) : []));

const nowIso = ref(null);
const clockText = computed(() => (nowIso.value ? fmtDeadline(new Date(nowIso.value)) : ''));

// Giờ nghiệp vụ do MÁY CHỦ quyết định (job chốt sổ, trừ tiền... chạy ở máy chủ, không còn nhịp "tick" của trình duyệt).
// Mỗi lần summary trả về, đồng hồ web được đồng bộ (xem opsApi.summary), nên mọi màn dùng chung một "bây giờ".
async function refresh() {
  if (!ctx.value) return;
  try {
    nowIso.value = (await api.ops.summary(ctx.value)).now;
  } catch (e) {
    // 401/403: phiên không còn hiệu lực, về trang đăng nhập; lỗi mạng thì giữ nguyên
    if (e && (e.status === 401 || e.status === 403)) await logout();
  }
}
useLive(refresh, { every: 15000 });

async function logout() {
  await logoutStaff();
  router.push('/login');
}
</script>
