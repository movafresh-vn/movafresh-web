<template>
  <div class="plans">
    <div class="wrap">
      <PlanProgress :step="step" :reach="reach" @go="goStep" />

      <StepAbout v-if="step === 1" />
      <StepMenu v-else-if="step === 2" @next="goStep(3)" />
      <StepCheckout v-else-if="step === 3" @done="goStep(4)" />
      <StepDone v-else @again="startOver" />
    </div>
  </div>
</template>

<script setup>
import { computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PlanProgress from '../components/plans/PlanProgress.vue';
import StepAbout from '../components/plans/StepAbout.vue';
import StepMenu from '../components/plans/StepMenu.vue';
import StepCheckout from '../components/plans/StepCheckout.vue';
import StepDone from '../components/plans/StepDone.vue';
import { usePlanFlowStore } from '../stores/usePlanFlowStore';

const store = usePlanFlowStore();
const route = useRoute();
const router = useRouter();

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
.plans { padding: 22px 0 56px; min-height: 70vh; }
</style>
