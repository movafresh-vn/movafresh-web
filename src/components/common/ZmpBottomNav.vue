<template>
  <nav v-if="isVisible" class="zmp-bnav" aria-label="Điều hướng chính Zalo Mini App">
    <router-link
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="zmp-bnav-item"
      :class="{ active: isTabActive(tab.to) }"
    >
      <span class="ico-wrap">
        <svg
          v-if="tab.icon === 'home'"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <svg
          v-else-if="tab.icon === 'menus'"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M3 6h18M3 12h18M3 18h12" />
        </svg>
        <svg
          v-else-if="tab.icon === 'plans'"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M12 2L15 8.5L22 9.3L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9.3L9 8.5L12 2Z" />
        </svg>
        <svg
          v-else
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        </svg>
        <span v-if="tab.badge && store.alertCount" class="zmp-dot" aria-label="Có thông báo mới"></span>
      </span>
      <span class="zmp-lbl">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';
import { isZaloMiniApp } from '../../services/zaloMiniApp';

const props = defineProps({
  hidden: {
    type: Boolean,
    default: false
  }
});

const store = useMovaStore();
const route = useRoute();
const inMiniApp = isZaloMiniApp();

const tabs = [
  { to: '/', label: 'Trang chủ', icon: 'home' },
  { to: '/menus', label: 'Thực đơn', icon: 'menus' },
  { to: '/plans', label: 'Thiết kế gói', icon: 'plans' },
  { to: '/account', label: 'Tài khoản', icon: 'account', badge: true }
];

const isCheckoutOrStickyStep = computed(() => {
  if (!route || route.path !== '/plans') return false;
  const step = Number(route.query.step) || 1;
  return step >= 2;
});

const isVisible = computed(() => {
  if (!inMiniApp || props.hidden) return false;
  if (store.activeModal || store.notifDrawerOpen) return false;
  if (isCheckoutOrStickyStep.value) return false;
  return true;
});

function isTabActive(target) {
  if (!route) return false;
  if (target === '/') return route.path === '/';
  return route.path.startsWith(target);
}
</script>

<style scoped>
.zmp-bnav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 42;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  padding: 6px 10px calc(8px + var(--zaui-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: saturate(1.25) blur(12px);
  -webkit-backdrop-filter: saturate(1.25) blur(12px);
  border-top: 1px solid var(--line);
  box-shadow: 0 -8px 24px rgba(40, 37, 31, 0.08);
}

.zmp-bnav-item {
  min-height: 48px;
  padding: 5px 4px;
  border-radius: 14px;
  text-decoration: none;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 700;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.zmp-bnav-item.active {
  color: var(--red-orange-d);
  background: var(--orange-soft);
}

.ico-wrap {
  position: relative;
  display: grid;
  place-items: center;
}

.zmp-dot {
  position: absolute;
  top: -2px;
  right: -5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--red-orange-d);
  border: 1.5px solid var(--white);
}

.zmp-lbl {
  line-height: 1.15;
  text-align: center;
}
</style>
