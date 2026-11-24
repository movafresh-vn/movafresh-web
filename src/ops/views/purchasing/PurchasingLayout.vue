<template>
  <section class="proc">
    <nav class="ops-subnav ops-noprint" aria-label="Mua hàng">
      <RouterLink v-for="t in tabs" :key="t.to" :to="t.to" class="ops-subtab" exact-active-class="active" :data-tab="t.key">{{ t.title }}</RouterLink>
      <RouterLink v-if="canKho" to="/kho" class="ops-subtab" data-tab="kho">Kho phụ TP.HCM →</RouterLink>
    </nav>
    <RouterView />
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { session } from '../../session';

const ALL = [
  { key: 'po', to: '/mua-hang', title: 'Đơn mua (PO)', roles: ['purchasing', 'accounting', 'admin'] },
  { key: 'suppliers', to: '/mua-hang/nha-cung-cap', title: 'Nhà cung cấp', roles: ['purchasing', 'admin'] },
  { key: 'sku', to: '/mua-hang/sku', title: 'Danh mục SKU', roles: ['purchasing', 'admin'] },
  { key: 'prices', to: '/mua-hang/bang-gia', title: 'Bảng giá', roles: ['purchasing', 'admin'] },
  { key: 'forecast', to: '/mua-hang/du-bao', title: 'Dự báo 4 tuần', roles: ['purchasing', 'admin'] },
  { key: 'payables', to: '/mua-hang/cong-no', title: 'Công nợ', roles: ['purchasing', 'accounting', 'admin'] },
  { key: 'direct', to: '/mua-hang/mua-truc-tiep', title: 'Mua trực tiếp', roles: ['purchasing', 'admin'] },
  { key: 'settings', to: '/mua-hang/cai-dat', title: 'Cài đặt', roles: ['purchasing', 'accounting', 'admin'] }
];

const tabs = computed(() => (session.value ? ALL.filter((t) => t.roles.includes(session.value.role)) : []));
const canKho = computed(() => Boolean(session.value && ['purchasing', 'admin'].includes(session.value.role)));
</script>
