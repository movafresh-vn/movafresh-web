<template>
  <div>
    <aside class="drawer" :class="{ open: store.notifDrawerOpen }" aria-label="Thông báo" :aria-hidden="!store.notifDrawerOpen">
      <div class="drawer-hdr">
        <h3>Thông báo từ MOVA</h3>
        <button class="sheet-x" type="button" @click="store.notifDrawerOpen = false" aria-label="Đóng thông báo">×</button>
      </div>
      <div class="drawer-body">
        <div v-if="!store.hasMovaSession" class="empty">
          <p>Đăng nhập để xem thông báo về tuần giao, số tiền sắp trừ và trạng thái đơn.</p>
          <button class="pl-btn primary sm" type="button" @click="login">Đăng nhập</button>
        </div>
        <p v-else-if="!items.length" class="empty">Chưa có thông báo nào.</p>
        <article v-for="n in items" :key="n.id" class="notif-item" :class="[n.tone, { unread: !n.read }]">
          <span class="kind">{{ n.label }}</span>
          <b>{{ n.title }}</b>
          <p>{{ n.body }}</p>
          <img v-if="n.photo" class="photo" :src="n.photo" alt="Ảnh giao hàng" loading="lazy" />
          <button v-if="n.action" class="pl-btn sm act" type="button" @click="run(n.action)">{{ n.action.label }}</button>
          <small>{{ n.time }}</small>
        </article>
      </div>
      <div v-if="store.isLoggedIn" class="drawer-ftr">
        <button class="pl-btn sm" type="button" @click="store.markAllNotifsRead">Đánh dấu tất cả đã đọc</button>
      </div>
    </aside>
    <div class="scrim" :class="{ open: store.notifDrawerOpen }" @click="store.notifDrawerOpen = false"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmtDeadline } from '../../shared/utils/time';

const store = useMovaStore();
const router = useRouter();

// Loại thông báo → nhãn và màu. Trạng thái giao đến từ app vận hành (api.ops.setOrderStatus).
function describe(n) {
  const st = n.meta && n.meta.status;
  switch (n.type) {
    case 'charge_upcoming': return { label: 'Sắp trừ tiền', tone: 'money', action: { label: 'Xem tuần này', go: '/account' } };
    case 'low_credit': return { label: 'Cần nạp thêm', tone: 'warn', action: { label: 'Nạp thêm Fresh Credit', topup: true } };
    case 'payment_failed': return { label: 'Chưa trừ được tiền', tone: 'warn', action: { label: 'Nạp thêm Fresh Credit', topup: true } };
    case 'delivery_reminder': return { label: 'Sắp giao', tone: 'info' };
    case 'delivery_status':
      if (st === 'shipped') return { label: 'Đang giao', tone: 'info' };
      if (st === 'delivered') return { label: 'Đã giao', tone: 'good', action: { label: 'Đánh giá món vừa giao', go: '/account#danh-gia' } };
      if (st === 'redelivery') return { label: 'Giao lại', tone: 'warn' };
      if (st === 'failed') return { label: 'Chưa giao được', tone: 'warn' };
      if (st === 'held') return { label: 'Đang giữ lạnh', tone: 'warn' };
      if (st === 'compensated') return { label: 'Bù Fresh Credit', tone: 'good', action: { label: 'Xem Fresh Credit', go: '/account' } };
      return { label: 'Giao hàng', tone: 'info' };
    case 'substitution': return { label: 'Đổi món do thiếu hàng', tone: 'warn', action: { label: 'Xem các tuần', go: '/account' } };
    case 'week_postponed':
    case 'week_skipped': return { label: 'Tạm hoãn', tone: 'info', action: { label: 'Xem lịch', go: '/account' } };
    case 'plan_cancelled': return { label: 'Dừng gói', tone: 'info' };
    case 'plan_renewed': return { label: 'Gia hạn', tone: 'good' };
    case 'reward': return { label: 'Thưởng', tone: 'good' };
    case 'recall': return { label: n.meta && n.meta.kind === 'compensation' ? 'Bù Fresh Credit' : 'Thu hồi nguyên liệu', tone: 'warn', action: { label: 'Xem Fresh Credit', go: '/account' } };
    default: return { label: 'Thông báo', tone: 'info' };
  }
}

const items = computed(() =>
  store.notifications.map((n) => ({
    ...n,
    ...describe(n),
    photo: n.meta && n.meta.photoUrl ? n.meta.photoUrl : null,
    time: fmtDeadline(new Date(n.created_at))
  }))
);

function login() {
  store.notifDrawerOpen = false;
  store.openModal('login');
}

function run(action) {
  store.notifDrawerOpen = false;
  if (action.topup) store.openModal('topup');
  else if (action.go) router.push(action.go);
}
</script>

<style scoped>
.drawer {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(420px, 94vw);
  background: var(--card);
  z-index: 65;
  box-shadow: -10px 0 30px rgba(20, 15, 10, .15);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform .28s ease;
  visibility: hidden;
}

.drawer.open {
  transform: none;
  visibility: visible;
}

.drawer-hdr {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.zmp-env .drawer-hdr {
  padding-top: calc(var(--zmp-safe-top, 12px) + 48px);
}

.drawer-hdr h3 { font-size: 18px; font-weight: 800; }
.sheet-x { display: inline-flex !important; width: 44px; height: 44px; font-size: 22px; }

.drawer-body {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
  display: grid;
  gap: 10px;
  align-content: start;
}

.empty { color: var(--muted); font-size: 16px; display: grid; gap: 12px; padding: 8px 4px; }

.notif-item {
  border: 1px solid var(--line);
  border-left: 5px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--bg);
  font-size: 15px;
  display: grid;
  gap: 4px;
}

.notif-item.unread { background: var(--white); box-shadow: 0 1px 6px rgba(84, 63, 24, .08); }
.notif-item.money { border-left-color: var(--blue); }
.notif-item.warn { border-left-color: var(--orange); }
.notif-item.good { border-left-color: var(--green); }
.notif-item.info { border-left-color: var(--muted); }

.kind { font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
.notif-item b { font-size: 16px; line-height: 1.3; }
.notif-item p { color: var(--ink); }
.notif-item small { color: var(--muted); font-size: 14px; }
.photo { width: 100%; max-height: 180px; object-fit: cover; border-radius: 10px; margin-top: 4px; background: var(--line-2); }
.act { justify-self: start; margin-top: 4px; }

.drawer-ftr { padding: 12px 16px; border-top: 1px solid var(--line); text-align: center; }
.zmp-env .drawer-ftr { padding-bottom: max(12px, var(--zmp-safe-bottom, 0px)); }

.scrim { display: none; }
.scrim.open { display: block; position: fixed; inset: 0; background: rgba(84, 63, 24, .4); z-index: 64; }
</style>
