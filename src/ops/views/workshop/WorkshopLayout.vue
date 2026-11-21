<template>
  <section class="workshop">
    <nav class="ops-subnav ops-noprint" aria-label="Màn hình xưởng">
      <RouterLink v-for="t in tabs" :key="t.to" :to="t.to" class="ops-subtab" exact-active-class="active" :data-tab="t.key">{{ t.title }}</RouterLink>
    </nav>

    <p v-if="loadError" class="ops-error" role="alert">{{ loadError }}</p>

    <DayTripBar v-if="needsDay" />
    <section v-if="needsDay && snapshot && !snapshot.days.length" class="ops-card ops-noprint" data-testid="no-plan">
      <h2>Chưa có đơn chốt sổ</h2>
      <p class="ops-muted">Xưởng chỉ làm các đơn đã trả tiền và đã qua giờ chốt sổ. Khi tới giờ chốt sổ, nhu cầu sẽ hiện ở đây.</p>
      <RouterLink to="/xuong/7-ngay" class="ops-btn">Xem nhu cầu 7 ngày tới</RouterLink>
    </section>

    <RouterView v-else />
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import DayTripBar from '../../components/DayTripBar.vue';
import { loadError, reload, snapshot } from '../../factoryStore';
import { useLive } from '../../useLive';

const route = useRoute();

const tabs = [
  { key: 'today', to: '/xuong', title: 'Hôm nay' },
  { key: 'week', to: '/xuong/7-ngay', title: '7 ngày tới' },
  { key: 'receive', to: '/xuong/nhan-nguyen-lieu', title: 'Nhận nguyên liệu' },
  { key: 'pack', to: '/xuong/dong-goi', title: 'Đóng gói' },
  { key: 'yield', to: '/xuong/san-luong', title: 'Sản lượng thực tế' },
  { key: 'load', to: '/xuong/xuat-xe', title: 'Xuất xe' },
  { key: 'short', to: '/xuong/bao-thieu', title: 'Báo thiếu / hỏng' }
];

// 7 ngày tới và Nhận nguyên liệu không phụ thuộc ngày giao đã chọn
const needsDay = computed(() => !['workshop-week', 'workshop-receive'].includes(route.name));

// Tải lại theo nhịp 6 giây, không chồng yêu cầu, dừng khi tab ẩn. Mất mạng mà đã có dữ liệu thì giữ nguyên (lớp phủ lo phần chưa gửi).
useLive(() => reload(), { every: 6000 });
</script>
