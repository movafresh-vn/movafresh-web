<template>
  <button
    v-if="!isCheckoutStep"
    class="float-help"
    @click="openZaloHelp"
    aria-label="Chat Zalo hỗ trợ"
  >
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.86 7.03L5 22l4.28-1.42C10.15 20.81 11.06 21 12 21c5.52 0 10-4.03 10-9s-4.48-9-10-9zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
    </svg>
    <span>Chat Zalo hỗ trợ</span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const route = useRoute();

// Ẩn nút Zalo trên các bước checkout của /plans (bước 2 tùy chọn món, bước 3 thanh toán) để tránh chồng lấn nút CTA và thanh sticky bar
const isCheckoutStep = computed(() => {
  if (!route || route.path !== '/plans') return false;
  const step = Number(route.query.step) || 1;
  return step >= 2;
});

const openZaloHelp = () => {
  store.toast('Đang kết nối Zalo OA Chăm sóc Khách hàng MOVA (Hotline: 1900 8899)...');
};
</script>

<style scoped>
.float-help {
  position: fixed;
  right: 20px;
  bottom: 24px;
  z-index: 32;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0068FF;
  color: #fff;
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 13.5px;
  font-weight: 700;
  border: 0;
  box-shadow: 0 8px 20px rgba(0, 104, 255, .3);
  transition: .15s;
}

.float-help:hover {
  background: #0055D4;
}

.float-help svg {
  width: 18px;
  height: 18px;
}

@media (max-width: 980px) {
  .float-help {
    bottom: 96px;
    right: 14px;
    padding: 9px 14px;
  }
}
</style>
