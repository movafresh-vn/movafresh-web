<template>
  <header class="hdr">
    <div class="wrap">
      <!-- Logo + Nhãn TP.HCM tích hợp gọn -->
      <router-link to="/" class="logo" aria-label="MOVA FRESH, về đầu trang">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <rect width="40" height="40" rx="11" fill="#146C43"/>
          <path d="M10 27V14l6 8 4-6 4 6 6-8v13" fill="none" stroke="#FAF9F5" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="30" cy="11" r="3.2" fill="#D9531E"/>
        </svg>
        <div class="logo-text">
          <b>MOVA <span>FRESH</span></b>
          <span class="city-tag">TP.HCM</span>
        </div>
      </router-link>

      <!-- Ở giữa: Segmented Tabs (Desktop) -->
      <nav class="nav-views" role="tablist" aria-label="Màn hình chính">
        <router-link
          to="/"
          class="nav-tab"
          :class="{ active: route.path === '/' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span class="lbl">Trang chủ</span>
        </router-link>
        <router-link
          to="/menus"
          class="nav-tab"
          :class="{ active: route.path === '/menus' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span class="lbl">Thực đơn tuần</span>
        </router-link>
        <router-link
          to="/plans"
          class="nav-tab"
          :class="{ active: route.path === '/plans' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 5h16M4 12h16M4 19h10"/>
          </svg>
          <span class="lbl">Thiết kế thực đơn</span>
        </router-link>
        <router-link
          to="/account"
          class="nav-tab"
          :class="{ active: route.path === '/account' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="7" r="4"/>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          </svg>
          <span class="lbl">Tài khoản</span>
          <span v-if="store.alertCount" class="badge-dot" title="Cần bạn xem"></span>
        </router-link>
      </nav>

      <!-- Bên phải: 3 cụm gọn gàng -->
      <div class="hdr-r">
        <!-- 1. Nút Chuông Thông Báo -->
        <button
          class="icon-btn"
          @click="store.notifDrawerOpen = true"
          aria-label="Thông báo thời gian thực"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span v-if="store.unreadNotifsCount > 0" class="badge-num">
            {{ store.unreadNotifsCount }}
          </span>
        </button>

        <!-- 2. Nút Tài khoản -->
        <button class="icon-btn acct-icon" aria-label="Tài khoản của tôi" @click="openAccount">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="7" r="4"/>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
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
          aria-label="Thông tin tài khoản"
        >
          <span class="avatar">{{ userAvatar }}</span>
          <span class="uname-line">{{ userLineText }}</span>
        </button>

        <!-- 3. Nút chính: vào phễu thiết kế thực đơn -->
        <router-link to="/plans" class="cartbtn">
          <span class="long">Thiết kế thực đơn</span>
          <span class="short">Bắt đầu</span>
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const route = useRoute();
const router = useRouter();

// Trên mobile: chưa đăng nhập thì mở đăng nhập, rồi vào tài khoản
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

// Hiển thị gọn 1 dòng: "Lan • 850k" hoặc SĐT khi tài khoản mới chưa có hồ sơ
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
  z-index: 25;
  background: rgba(250, 249, 245, .95);
  backdrop-filter: saturate(1.2) blur(8px);
  -webkit-backdrop-filter: saturate(1.2) blur(8px);
  border-bottom: 1px solid var(--line);
}

.hdr .wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 68px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  flex-shrink: 0;
}

.logo svg {
  width: 36px;
  height: 36px;
}

.logo-text {
  display: flex;
  align-items: center;
  gap: 6px;
}

.logo b {
  font-weight: 800;
  font-size: 18px;
  letter-spacing: .01em;
  color: var(--green);
}

.logo b span {
  color: var(--orange);
}

.city-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--green);
  background: var(--green-soft);
  padding: 2px 6px;
  border-radius: 6px;
  white-space: nowrap;
}

/* Nav segmented tabs */
.nav-views {
  display: flex;
  background: var(--line-2);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  flex-shrink: 0;
}

.nav-tab {
  border: 0;
  background: none;
  border-radius: 9px;
  padding: 7px 14px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
  text-decoration: none;
  transition: .15s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.nav-tab.active {
  background: var(--card);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(30, 25, 15, .1);
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--orange);
  flex-shrink: 0;
}

/* Header right */
.hdr-r {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.icon-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--card);
  display: grid;
  place-items: center;
  color: var(--ink);
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--line-2);
}

.badge-num {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--red);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 2px solid var(--bg);
}

.login-hdr-btn {
  min-height: 44px;
  padding: 7px 14px;
  font-size: 13px;
  white-space: nowrap;
}

.user-btn {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 12px;
  padding: 6px 11px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.user-btn:hover {
  background: var(--line-2);
}

.user-btn .avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--green-soft);
  color: var(--green);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 11.5px;
  flex-shrink: 0;
}

.uname-line {
  white-space: nowrap;
  font-size: 13px;
}

.cartbtn {
  text-decoration: none;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: var(--green);
  color: #fff;
  border-radius: 12px;
  padding: 8px 14px;
  font-weight: 600;
  font-size: 13.5px;
  white-space: nowrap;
}

.cartbtn:hover {
  background: var(--green-d);
}

.cartbtn svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

.cartbtn .short { display: none; }
.acct-icon { display: none; text-decoration: none; }

/* Mobile responsive (<= 768px): clean App style */
@media (max-width: 768px) {
  .hdr .wrap {
    height: 60px;
    padding: 0 14px;
  }
  .nav-views {
    display: none;
  }
  .login-hdr-btn,
  .user-btn,
  .nav-views {
    display: none;
  }
  .acct-icon {
    display: grid;
  }
  .cartbtn .long { display: none; }
  .cartbtn .short { display: inline; }
  .cartbtn {
    padding: 8px 14px;
    font-size: 15px;
  }
  .logo b { font-size: 16px; }
  .logo svg { width: 32px; height: 32px; }
  .city-tag {
    display: none;
  }
}
</style>
