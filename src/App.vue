<template>
  <div id="mova-app" :class="{ 'zmp-env': inMiniApp, 'has-zmp-nav': hasZmpNav }">
    <!-- Thanh ưu đãi thẻ quà tặng (trang chủ; trên Mini App đặt dưới header để không bị capsule Zalo che) -->
    <PromoBar v-if="route.path === '/' && !inMiniApp" />

    <!-- Header dính đỉnh -->
    <AppHeader />

    <PromoBar v-if="route.path === '/' && inMiniApp" />

    <!-- Nội dung theo View -->
    <main id="top">
      <router-view />
    </main>

    <!-- Footer thông tin -->
    <AppFooter />

    <!-- Thanh điều hướng đáy cho Zalo Mini App -->
    <ZmpBottomNav />

    <!-- Ngăn kéo thông báo bên phải -->
    <NotificationDrawer />

    <!-- Nút nổi chat Zalo hỗ trợ (chỉ hiện trên Web, tự ẩn ở bước thanh toán & Zalo Mini App) -->
    <FloatingZaloBtn />

    <!-- Thông báo Toast toàn cục -->
    <ToastMessage />

    <!-- Các modal của phần tài khoản -->
    <LoginModal v-if="store.activeModal === 'login'" />
    <TopupModal v-if="store.activeModal === 'topup' && store.isLoggedIn" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import PromoBar from './components/common/PromoBar.vue';
import AppHeader from './components/common/AppHeader.vue';
import AppFooter from './components/common/AppFooter.vue';
import ZmpBottomNav from './components/common/ZmpBottomNav.vue';
import NotificationDrawer from './components/common/NotificationDrawer.vue';
import FloatingZaloBtn from './components/common/FloatingZaloBtn.vue';
import ToastMessage from './components/common/ToastMessage.vue';

// Modals
import LoginModal from './components/modals/LoginModal.vue';
import TopupModal from './components/modals/TopupModal.vue';

import { useMovaStore } from './stores/useMovaStore';
import { isZaloMiniApp } from './services/zaloMiniApp';

const store = useMovaStore();
const route = useRoute();
const inMiniApp = isZaloMiniApp();

const hasZmpNav = computed(() => {
  if (!inMiniApp) return false;
  if (store.activeModal || store.notifDrawerOpen) return false;
  if (route?.path === '/plans' && (Number(route.query.step) || 1) >= 2) return false;
  return true;
});

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    if (store.activeModal) {
      store.closeModal();
    }
    if (store.notifDrawerOpen) {
      store.notifDrawerOpen = false;
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  void store.refresh();
  store.startPolling();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  store.stopPolling();
});
</script>
