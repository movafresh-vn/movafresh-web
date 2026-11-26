<template>
  <div class="plans">
    <div class="wrap">
      <PlanProgress :step="step" :reach="reach" @go="goStep" />

      <section v-if="step === 1 && returningCustomer" class="pl-card returning-banner" data-testid="returning-onboarding-skip">
        <div>
          <b>Bạn đã hoàn thành khảo sát ban đầu</b>
          <p class="pl-note">Không cần làm lại khảo sát. Đầu bếp MOVA có thể đề xuất ngay thực đơn tuần mới dựa trên hồ sơ khẩu vị, dị ứng và lịch sử đặt món của bạn.</p>
          <p v-if="quickError" class="pl-error" role="alert">{{ quickError }}</p>
        </div>
        <button type="button" class="pl-btn primary" :disabled="quickBusy" @click="useSavedProfile">
          {{ quickBusy ? 'Đầu bếp MOVA đang chuẩn bị...' : 'Dùng hồ sơ đã lưu & xem thực đơn' }}
        </button>
      </section>

      <StepAbout v-if="step === 1" />
      <StepMenu v-else-if="step === 2" @next="goStep(3)" />
      <StepCheckout v-else-if="step === 3" @done="goStep(4)" />
      <StepDone v-else @again="startOver" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PlanProgress from '../components/plans/PlanProgress.vue';
import StepAbout from '../components/plans/StepAbout.vue';
import StepMenu from '../components/plans/StepMenu.vue';
import StepCheckout from '../components/plans/StepCheckout.vue';
import StepDone from '../components/plans/StepDone.vue';
import { useMovaStore } from '../stores/useMovaStore';
import { usePlanFlowStore } from '../stores/usePlanFlowStore';

const mova = useMovaStore();
const store = usePlanFlowStore();
const route = useRoute();
const router = useRouter();
const quickBusy = ref(false);
const quickError = ref('');

const returningCustomer = computed(() => Boolean(mova.isLoggedIn && mova.account?.customer?.onboarding_completed && !store.planId && !store.result));

async function useSavedProfile() {
  if (quickBusy.value) return;
  const cust = mova.account?.customer;
  if (!cust) return;
  quickBusy.value = true;
  quickError.value = '';
  try {
    const sp = cust.safety_profile || {};
    store.answers.district = cust.district || store.answers.district || 'Quận 1';
    store.answers.adults = Math.max(1, Math.min(10, Number(sp.servings_default || 2)));
    store.answers.children = 0;
    if (Array.isArray(sp.cuisines) && sp.cuisines.length) store.answers.cuisines = [...sp.cuisines];
    if (Array.isArray(sp.household_needs) && sp.household_needs.length) store.answers.health = [...sp.household_needs];
    if (sp.weekly_grocery_budget_vnd) store.answers.weeklyBudgetVnd = sp.weekly_grocery_budget_vnd;
    const ok = await store.submitAbout();
    if (!ok) {
      quickError.value = store.error || 'Không thể tải đề xuất từ Đầu bếp MOVA lúc này. Vui lòng thử lại.';
      return;
    }
    goStep(2);
  } catch {
    quickError.value = 'Dịch vụ Đầu bếp MOVA hiện không khả dụng. Vui lòng thử lại sau.';
  } finally {
    quickBusy.value = false;
  }
}

// Link mời: /plans?ref=MOVA-0007
if (route.query.ref) store.setRef(route.query.ref);

// Tải lại trang: bản nháp thực đơn lấy lại từ bộ nhớ trình duyệt. Không còn bản nháp thì bắt đầu lại từ đầu.
if (store.planId) {
  void store.reloadPlan().then((ok) => {
    if (!ok && !store.result) store.reset();
  });
}

const step = computed(() => {
  const n = Number(route.query.step);
  return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 1;
});
const reach = computed(() => (store.result ? 4 : store.planId ? 3 : 1));

function goStep(n) {
  router.push({ path: '/plans', query: n === 1 ? { step: '1' } : { step: String(n) } });
}

function startOver() {
  store.reset();
  router.push({ path: '/plans', query: { step: '1', q: '0' } });
}

// Không cho vào bước sau khi chưa có dữ liệu của bước trước; đã đặt xong thì về trang hoàn tất
watch(
  () => [step.value, store.planId, Boolean(store.result)],
  () => {
    let target = step.value;
    if (store.result && target < 4) target = 4;
    else if (!store.result && target === 4) target = store.planId ? 3 : 1;
    else if (!store.planId && target > 1) target = 1;
    if (target !== step.value) router.replace({ path: '/plans', query: { step: String(target) } });
  },
  { immediate: true }
);

watch(step, async () => {
  await nextTick();
  window.scrollTo({ top: 0 });
});
</script>

<style scoped>
.plans {
  padding: 22px 0 140px;
  min-height: 70vh;
  background: var(--bg);
  color: var(--ink);
}

@media (max-width: 768px) {
  .plans {
    padding: 16px 0 180px;
  }
}
</style>
