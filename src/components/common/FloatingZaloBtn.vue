<template>
  <button
    v-if="!inMiniApp && !isCheckoutStep"
    class="float-help"
    @click="openZaloHelp"
    aria-label="Chat Zalo hỗ trợ"
  >
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.03 2 11c0 2.75 1.38 5.21 3.55 6.86L4.5 22l4.46-1.78C9.92 20.47 10.94 20.6 12 20.6c5.52 0 10-4.03 10-9.6S17.52 2 12 2zm1 13H7.5v-1.8l3.78-4.6H7.8V7h5.2v1.8l-3.78 4.6H13V15zm4.5 0h-2V7h2v8z"/>
    </svg>
    <span>Chat Zalo</span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';
import { isZaloMiniApp } from '../../services/zaloMiniApp';

const store = useMovaStore();
const route = useRoute();
const inMiniApp = isZaloMiniApp();

// Ẩn nút Zalo trên Zalo Mini App (dùng mục Zalo OA ở Tài khoản/FAQ) và trên bước chọn món/thanh toán /plans
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
  background: var(--pay-zalo);
  color: var(--white);
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 13.5px;
  font-weight: 700;
  border: 0;
  box-shadow: 0 8px 20px rgba(0, 104, 255, .3);
  transition: .15s;
}

.float-help:hover {
  background: var(--blue);
}

.float-help svg {
  width: 18px;
  height: 18px;
}

@media (max-width: 980px) {
  .float-help {
    bottom: 16px;
    right: 14px;
    padding: 8px 13px;
    font-size: 13px;
  }
}
</style>
