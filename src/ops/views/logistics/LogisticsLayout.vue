<template>
  <section class="proc lg">
    <nav class="ops-subnav ops-noprint" aria-label="Logistics">
      <RouterLink v-for="t in tabs" :key="t.to" :to="t.to" class="ops-subtab" exact-active-class="active" :data-tab="t.key">
        {{ t.title }}<span v-if="badge[t.key]" class="lg-badge" :data-badge="t.key">{{ badge[t.key] }}</span>
      </RouterLink>
    </nav>
    <RouterView />
  </section>
</template>

<script setup>
import { reactive } from 'vue';
import { api } from '../../../shared/api';
import { ctx } from '../../session';
import { useLive } from '../../useLive';

const tabs = [
  { key: 'capacity', to: '/logistics', title: 'Khu & sức chứa' },
  { key: 'trips', to: '/logistics/chuyen-xe', title: 'Chuyến xe' },
  { key: 'routes', to: '/logistics/lap-tuyen', title: 'Lập tuyến' },
  { key: 'exceptions', to: '/logistics/giao-hang', title: 'Giao hàng & ngoại lệ' },
  { key: 'cold', to: '/logistics/chuoi-lanh', title: 'Chuỗi lạnh' },
  { key: 'cost', to: '/logistics/chi-phi-kpi', title: 'Chi phí & KPI' }
];

// Số việc đang chờ điều phối: ngoại lệ chưa xử lý và cảnh báo nhiệt độ chưa có quyết định
const badge = reactive({ exceptions: 0, cold: 0 });

useLive(async () => {
  try {
    const ex = await api.ops.logistics.exceptions(ctx.value);
    badge.exceptions = ex.open.length + ex.held.filter((h) => h.holdExpired).length;
    badge.cold = (await api.ops.logistics.coldChain(ctx.value)).openAlertsAll;
  } catch {
    // không có quyền hoặc dữ liệu chưa sẵn: bỏ số
  }
});
</script>
