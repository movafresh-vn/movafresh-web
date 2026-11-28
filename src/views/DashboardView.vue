<template>
  <div class="dash-view">
    <div class="wrap">
      <!-- Chưa có khách: mời đăng nhập hoặc thiết kế gói -->
      <BaseCard v-if="store.loaded && !store.hasMovaSession" tag="section" class="gate">
        <h1 class="pl-h1">Gói của tôi</h1>
        <p class="pl-lead">Đăng nhập bằng số điện thoại đã dùng khi đăng ký để xem các tuần giao, đổi món và Fresh Credit.</p>
        <div class="gate-btns">
          <BaseButton @click="store.openModal('login')">Đăng nhập</BaseButton>
          <BaseButton tag="router-link" to="/plans" variant="secondary">Thiết kế thực đơn và đăng ký gói</BaseButton>
        </div>
      </BaseCard>

      <!-- Đã đăng nhập nhưng chưa có gói ăn/hồ sơ (tài khoản mới) -->
      <BaseCard v-else-if="store.loaded && !store.account" tag="section" class="gate">
        <h1 class="pl-h1">Gói của tôi</h1>
        <p class="pl-lead">
          Tài khoản <b>{{ store.authUser?.phone || store.authUser?.email || 'của bạn' }}</b> chưa có gói ăn hoặc thực đơn nào.
        </p>
        <div class="gate-btns">
          <BaseButton tag="router-link" to="/plans">Thiết kế thực đơn và đăng ký gói</BaseButton>
        </div>
      </BaseCard>

      <template v-else-if="store.isLoggedIn">
        <DashHeader @tab="setTab" />

        <!-- Nhắc liên kết SĐT gọn gàng cho tài khoản Google/Zalo chưa có SĐT xác thực -->
        <section v-if="store.needsPhoneLink" class="pl-panel warn alert phone-link-banner" role="status" data-testid="phone-link-banner">
          <b>Liên kết số điện thoại để thanh toán &amp; nhận giao hàng</b>
          <p>Tài khoản của bạn chưa có số điện thoại xác thực OTP. Liên kết ngay để đặt gói và đồng bộ Fresh Credit nếu bạn từng đặt hàng trước đó.</p>
          <button v-if="tab !== 'profile'" class="pl-btn primary sm" type="button" @click="setTab('profile')">Liên kết SĐT ngay</button>
        </section>

        <!-- Cảnh báo cần xử lý, hiện ở mọi tab -->
        <section v-if="alert" class="pl-panel warn alert" role="alert">
          <b>Fresh Credit chưa đủ cho tuần {{ alert.week_index + 1 }}</b>
          <p class="num">
            Tuần này cần {{ fmt(alert.amount_vnd) }}, bạn đang có {{ fmt(alert.balance_vnd) }}, còn thiếu {{ fmt(alert.shortfall_vnd) }}.
            MOVA trừ tiền lúc <b>{{ alert.charge_label }}</b>; nếu chưa đủ, tuần này sẽ bị tạm hoãn khi tới giờ chốt sổ.
          </p>
          <button class="pl-btn orange sm" type="button" @click="store.openModal('topup')">Mua thêm Gói Fresh Credit</button>
        </section>

        <div class="dash-tabs" role="tablist" aria-label="Tài khoản">
          <button v-for="t in TABS" :key="t.id" type="button" class="dash-tab-btn" :class="{ active: tab === t.id }" role="tab" :aria-selected="tab === t.id" @click="setTab(t.id)">
            {{ t.label }}
          </button>
        </div>

        <div class="tab-content">
          <WeeksTab v-if="tab === 'weeks'" @tab="setTab" />
          <CreditTab v-else-if="tab === 'credit'" />
          <RewardsTab v-else-if="tab === 'rewards'" @tab="setTab" />
          <ProfileTab v-else-if="tab === 'profile'" />
          <SupportPanel v-if="supportOpened" v-show="tab === 'support'" />
        </div>

      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMovaStore } from '../stores/useMovaStore';
import { fmt } from '../shared/utils/formatters';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseCard from '../components/ui/BaseCard.vue';
import DashHeader from '../components/dashboard/DashHeader.vue';
import WeeksTab from '../components/dashboard/WeeksTab.vue';
import CreditTab from '../components/dashboard/CreditTab.vue';
import RewardsTab from '../components/dashboard/RewardsTab.vue';
import ProfileTab from '../components/dashboard/ProfileTab.vue';
import SupportPanel from '../components/dashboard/SupportPanel.vue';

const TABS = [
  { id: 'weeks', label: 'Các tuần của tôi' },
  { id: 'credit', label: 'Fresh Credit' },
  { id: 'rewards', label: 'Thưởng và mời bạn' },
  { id: 'support', label: 'Hỗ trợ' },
  { id: 'profile', label: 'Hồ sơ' }
];

const store = useMovaStore();
const route = useRoute();
const router = useRouter();

const tab = ref(TABS.some((t) => t.id === route.query.tab) ? route.query.tab : 'weeks');
const supportOpened = ref(tab.value === 'support');
const alert = computed(() => (store.account ? store.account.alert : null));
watch(tab, (value) => { if (value === 'support') supportOpened.value = true; });

function setTab(id) {
  tab.value = id;
  router.replace({ path: '/account', query: { ...route.query, tab: id === 'weeks' ? undefined : id } });
}

watch(
  () => route.query.tab,
  (t) => {
    if (TABS.some((x) => x.id === t)) tab.value = t;
    else if (!t) tab.value = 'weeks';
  }
);

onMounted(() => {
  store.refresh();
});
</script>

<style scoped>
.dash-view { padding: 22px 0 86px; min-height: 70vh; }
.gate { max-width: 560px; margin: 24px auto; }
.gate-btns { display: grid; gap: 10px; }
.alert { margin-bottom: 16px; }
.alert p { font-size: 16px; }
.alert .pl-btn { justify-self: start; }
.phone-link-banner {
  border-left: 4px solid var(--red-orange-d);
  background: var(--orange-soft);
}

.dash-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1.5px solid var(--line);
  margin-bottom: 20px;
  overflow-x: auto;
  scrollbar-width: none;
}
.dash-tabs::-webkit-scrollbar { display: none; }
.dash-tab-btn {
  border: 0;
  background: none;
  padding: 12px 14px;
  min-height: 48px;
  font-size: 16px;
  font-weight: 600;
  color: var(--muted);
  border-radius: 12px 12px 0 0;
  white-space: nowrap;
  position: relative;
}
.dash-tab-btn:hover { color: var(--ink); }
.dash-tab-btn.active { color: var(--green-d); font-weight: var(--fw-bold); }
.dash-tab-btn.active::after {
  content: "";
  position: absolute;
  left: 8px; right: 8px; bottom: -1.5px;
  height: 3px;
  background: var(--green);
  border-radius: 3px;
}
</style>
