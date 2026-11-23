<template>
  <section class="proc">
    <nav class="ops-subnav ops-noprint" aria-label="Kho phụ TP.HCM">
      <RouterLink v-for="t in tabs" :key="t.to" :to="t.to" class="ops-subtab" exact-active-class="active" :data-tab="t.key">{{ t.title }}</RouterLink>
      <RouterLink v-if="canBuy" to="/mua-hang" class="ops-subtab" data-tab="mua-hang">← Mua hàng</RouterLink>
    </nav>
    <section v-if="!tabs.length" class="ops-card">
      <h1>Kho phụ TP.HCM</h1>
      <p class="ops-muted">Vai trò của bạn chưa có màn nào ở kho phụ.</p>
    </section>
    <RouterView v-else />
  </section>
</template>

<script setup>
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { session } from '../../session';

const route = useRoute();
const router = useRouter();

// Nhận hàng, tồn kho, truy xuất & thu hồi (P2B); nhận xe, ghép hải sản, chia khung / tuyến, xuất kho (P2C).
const ALL = [
  { key: 'receive', to: '/kho', title: 'Nhận hàng', roles: ['hub', 'purchasing', 'admin'] },
  { key: 'arrival', to: '/kho/nhan-xe', title: 'Nhận xe', roles: ['hub', 'admin'] },
  { key: 'seafood', to: '/kho/ghep-hai-san', title: 'Ghép hải sản', roles: ['hub', 'admin'] },
  { key: 'sort', to: '/kho/chia-tuyen', title: 'Chia khung/tuyến', roles: ['hub', 'admin', 'dispatch'] },
  { key: 'dispatch', to: '/kho/xuat-kho', title: 'Xuất kho', roles: ['hub', 'admin'] },
  { key: 'stock', to: '/kho/ton-kho', title: 'Tồn kho', roles: ['hub', 'purchasing', 'admin'] },
  { key: 'trace', to: '/kho/truy-xuat', title: 'Truy xuất', roles: ['hub', 'purchasing', 'admin'] },
  { key: 'recall', to: '/kho/thu-hoi', title: 'Thu hồi lô', roles: ['hub', 'purchasing', 'admin'] }
];

const tabs = computed(() => (session.value ? ALL.filter((t) => t.roles.includes(session.value.role)) : []));
const canBuy = computed(() => Boolean(session.value && ['purchasing', 'admin'].includes(session.value.role)));

// Vai trò không có tab "Nhận hàng" (điều phối) thì vào /kho được chuyển tới tab đầu tiên của mình
watchEffect(() => {
  if (route.path === '/kho' && tabs.value.length && !tabs.value.some((t) => t.to === '/kho')) router.replace(tabs.value[0].to);
});
</script>
