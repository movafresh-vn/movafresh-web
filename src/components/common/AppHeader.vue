<template>
  <header class="hdr" :class="{ 'zmp-hdr': inMiniApp }" :data-zmp="inMiniApp ? 'true' : undefined">
    <div class="wrap">
      <!-- Logo + Nhãn TP.HCM -->
      <router-link to="/" class="logo" aria-label="MOVA FRESH, về đầu trang">
        <BrandLogo variant="onWhite" :width="inMiniApp ? 76 : 96" />
        <div v-if="!inMiniApp" class="logo-text">
          <span class="city-tag">TP.HCM</span>
        </div>
      </router-link>

      <!-- Cụm Pill Điều Hướng Ở Giữa (Desktop / Figma MAIN UI) -->
      <nav v-if="!inMiniApp" class="nav-views" role="tablist" aria-label="Màn hình chính">
        <router-link
          to="/"
          class="nav-tab"
          :class="{ active: route.path === '/' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span class="lbl">Trang chủ</span>
        </router-link>
        <router-link
          to="/menus"
          class="nav-tab"
          :class="{ active: route.path === '/menus' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h12" />
          </svg>
          <span class="lbl">Thực đơn tuần</span>
        </router-link>
        <router-link
          to="/plans"
          class="nav-tab"
          :class="{ active: route.path === '/plans' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 2L15 8.5L22 9.3L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9.3L9 8.5L12 2Z" />
          </svg>
          <span class="lbl">Thiết kế thực đơn</span>
        </router-link>
        <router-link
          to="/account"
          class="nav-tab"
          :class="{ active: route.path === '/account' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="7" r="4" />
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          </svg>
          <span class="lbl">Tài khoản</span>
          <span v-if="store.alertCount" class="badge-dot" title="Cần bạn xem"></span>
        </router-link>
      </nav>

      <!-- Cụm phải: Chuông + Fresh Credit / Tài khoản + CTA -->
      <div class="hdr-r">
        <button
          class="icon-btn"
          @click="store.notifDrawerOpen = true"
          aria-label="Thông báo thời gian thực"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span v-if="store.unreadNotifsCount > 0" class="badge-num">
            {{ store.unreadNotifsCount }}
          </span>
        </button>

        <button class="icon-btn acct-icon" aria-label="Tài khoản của tôi" @click="openAccount">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="7" r="4" />
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          </svg>
        </button>

        <button
          v-if="!store.hasMovaSession"
          class="btn sm primary login-hdr-btn"
          @click="store.openModal('login')"
        >
          Đăng nhập
        </button>

        <button
          v-else
          class="user-btn"
          @click="store.openModal('login')"
          aria-label="Thông tin tài khoản và Fresh Credit"
        >
          <span class="avatar">{{ userAvatar }}</span>
          <span class="uname-line">{{ userLineText }}</span>
        </button>

        <router-link to="/plans" class="cartbtn">
          <span class="long">Thiết kế thực đơn</span>
          <span class="short">{{ inMiniApp ? 'Đặt gói' : 'Bắt đầu' }}</span>
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';
import { isZaloMiniApp } from '../../services/zaloMiniApp';
import BrandLogo from './BrandLogo.vue';

const store = useMovaStore();
const route = useRoute();
const router = useRouter();
const inMiniApp = isZaloMiniApp();

const openAccount = () => {
  if (store.hasMovaSession) router.push('/account');
  else store.openModal('login');
};

const displayName = computed(() => store.userName || store.authUser?.email || store.authUser?.phone || 'MOVA');
const userAvatar = computed(() => {
  const d = displayName.value.trim();
  const token = d.split(/\s+/).pop() || '';
  const clean = token.replace(/^\+/, '');
  return (clean.charAt(0) || d.charAt(0) || 'M').toUpperCase();
});

const userLineText = computed(() => {
  if (!store.isLoggedIn) return displayName.value;
  const given = store.userName.trim().split(/\s+/).pop();
  return `${given} • ${Math.round(store.balance.total_vnd / 1000)}k`;
});
</script>

<style scoped>
.hdr {
  position: sticky;
  top: 0;
  z-index: 30;
  background: rgba(249, 247, 236, 0.94);
  backdrop-filter: saturate(1.25) blur(10px);
  -webkit-backdrop-filter: saturate(1.25) blur(10px);
  border-bottom: 1px solid var(--line);
}

.hdr .wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 70px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  flex-shrink: 0;
}

.logo .brand-logo {
  width: 96px;
  height: auto;
}

.logo-text {
  display: flex;
  align-items: center;
}

.city-tag {
  font-size: 11px;
  font-weight: 800;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 3px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

/* Pill Navigation matching Figma MAIN UI */
.nav-views {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 4px;
  gap: 3px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.nav-tab {
  border: 0;
  background: transparent;
  border-radius: 999px;
  min-height: 38px;
  padding: 6px 14px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
  text-decoration: none;
  transition: background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.nav-tab:hover {
  color: var(--ink);
}

.nav-tab.active {
  background: var(--card);
  color: var(--red-orange-d);
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(40, 37, 31, 0.1);
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--red-orange-d);
  flex-shrink: 0;
}

/* Right actions */
.hdr-r {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.icon-btn {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--card);
  display: grid;
  place-items: center;
  color: var(--ink);
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--sand);
}

.badge-num {
  position: absolute;
  top: -3px;
  right: -3px;
  background: var(--red-orange-d);
  color: var(--text-on-accent);
  font-size: 10.5px;
  font-weight: 800;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  border: 2px solid var(--bg);
}

.login-hdr-btn {
  min-height: 42px;
  padding: 7px 14px;
  font-size: 13px;
  border-radius: 999px;
  white-space: nowrap;
}

.user-btn {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink);
  border-radius: 999px;
  padding: 5px 12px 5px 6px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.user-btn:hover {
  background: var(--sand);
}

.user-btn .avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--green-soft);
  color: var(--green-d);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 12px;
  flex-shrink: 0;
}

.uname-line {
  white-space: nowrap;
  font-size: 13px;
}

.cartbtn {
  text-decoration: none;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  background: var(--red-orange-d);
  color: var(--text-on-accent);
  border-radius: 999px;
  padding: 8px 18px;
  font-weight: 700;
  font-size: 13.5px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(196, 58, 20, 0.22);
}

.cartbtn:hover {
  background: var(--red-orange-dd);
}

.cartbtn .short {
  display: none;
}

.acct-icon {
  display: none;
}

@media (max-width: 1020px) {
  .nav-tab {
    padding: 6px 10px;
    font-size: 13px;
  }
  .cartbtn .long {
    display: none;
  }
  .cartbtn .short {
    display: inline;
  }
}

/* Mobile Web (<= 768px) */
@media (max-width: 768px) {
  .hdr .wrap {
    min-height: 60px;
    padding-inline: 14px;
  }
  .nav-views,
  .login-hdr-btn,
  .user-btn,
  .city-tag {
    display: none;
  }
  .acct-icon {
    display: grid;
  }
  .cartbtn {
    padding: 8px 14px;
    font-size: 14px;
  }
  .logo .brand-logo {
    width: 78px;
  }
}

/* Zalo Mini App: 1 hàng gọn duy nhất + vùng an toàn cho capsule (... | X) & notch */
.hdr.zmp-hdr {
  padding-top: var(--zaui-safe-area-inset-top, var(--zaui-safe-area-top, env(safe-area-inset-top, 10px)));
}

.hdr.zmp-hdr .wrap {
  min-height: 54px;
  height: 54px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-left: 14px;
  padding-right: 112px;
  gap: 8px;
}

.hdr.zmp-hdr .logo .brand-logo {
  width: 72px;
}

.hdr.zmp-hdr .hdr-r {
  gap: 6px;
}

.hdr.zmp-hdr .icon-btn {
  width: 38px;
  height: 38px;
}

.hdr.zmp-hdr .acct-icon {
  display: grid;
}

.hdr.zmp-hdr .login-hdr-btn,
.hdr.zmp-hdr .user-btn {
  display: none;
}

.hdr.zmp-hdr .cartbtn {
  min-height: 38px;
  padding: 6px 12px;
  font-size: 13px;
}

.hdr.zmp-hdr .cartbtn .long {
  display: none;
}

.hdr.zmp-hdr .cartbtn .short {
  display: inline;
}
</style>
