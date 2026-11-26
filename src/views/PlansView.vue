<template>
  <div class="plans">
    <div class="wrap">
      <PlanProgress :step="step" :reach="reach" @go="goStep" />

      <div v-if="(resolvingEntry || quickBusy) && step === 1 && !wantsSurveyEdit" class="pl-card resolving-card" role="status" data-testid="plans-loading-profile">
        <b>Đầu bếp MOVA đang kiểm tra hồ sơ và chuẩn bị thực đơn cho bạn...</b>
      </div>

      <template v-else>
        <section v-if="step === 1 && hasSavedProfile" class="pl-card returning-banner" data-testid="returning-onboarding-skip">
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
      </template>
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
import { hasCompletedCustomerProfile } from '../shared/domain/profilePreferences';
import { resolvePlansEntry, wantsPlansSurveyEdit } from '../shared/domain/plansEntry';
import { useMovaStore } from '../stores/useMovaStore';
import { usePlanFlowStore } from '../stores/usePlanFlowStore';

const mova = useMovaStore();
const store = usePlanFlowStore();
const route = useRoute();
const router = useRouter();
const resolvingEntry = ref(true);
const quickBusy = ref(false);
const quickError = ref('');

const hasSavedProfile = computed(() => Boolean(mova.isLoggedIn && hasCompletedCustomerProfile(mova.account)));
const wantsSurveyEdit = computed(() => wantsPlansSurveyEdit(route.query));

async function useSavedProfile() {
  if (quickBusy.value) return false;
  const cust = mova.account?.customer;
  if (!cust) return false;
  quickBusy.value = true;
  quickError.value = '';
  try {
    store.applyProfileFromAccount(cust);
    const status = await store.submitProfile();
    if (status === 'out_of_zone') {
      quickError.value = 'Khu vực trong hồ sơ hiện chưa nằm trong vùng giao. Vui lòng cập nhật lại địa bàn.';
      return false;
    }
    if (status !== 'ok') {
      quickError.value = store.error || 'Không thể tải đề xuất từ Đầu bếp MOVA lúc này. Vui lòng thử lại.';
      return false;
    }
    await router.replace({ path: '/plans', query: { step: '2' } });
    return true;
  } catch {
    quickError.value = 'Dịch vụ Đầu bếp MOVA hiện không khả dụng. Vui lòng thử lại sau.';
    return false;
  } finally {
    quickBusy.value = false;
  }
}

// Link mời: /plans?ref=MOVA-0007
if (route.query.ref) store.setRef(route.query.ref);

const step = computed(() => {
  const n = Number(route.query.step);
  return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 1;
});
const reach = computed(() => (store.result ? 4 : store.planId ? 3 : 1));

function goStep(n) {
  if (n === 1) {
    router.push({ path: '/plans', query: { step: '1', edit: '1', q: '1' } });
    return;
  }
  router.push({ path: '/plans', query: { step: String(n) } });
}

function startOver() {
  store.reset();
  if (hasSavedProfile.value) {
    void router.push({ path: '/plans' });
  } else {
    void router.push({ path: '/plans', query: { step: '1', q: '0' } });
  }
}

let entryRun = 0;
async function ensureEntry() {
  const runId = ++entryRun;
  resolvingEntry.value = true;
  try {
    const decision = await resolvePlansEntry({ routeQuery: route.query, mova, store, useSavedProfile });
    if (runId !== entryRun) return;
    if (decision.action === 'resume_plan' && decision.step !== step.value) {
      await router.replace({ path: '/plans', query: { step: String(decision.step) } });
    }
  } finally {
    if (runId === entryRun) resolvingEntry.value = false;
  }
}

watch(
  () => route.fullPath,
  () => {
    void ensureEntry();
  },
  { immediate: true }
);

// Trường hợp khách vừa đăng nhập xong ngay tại màn /plans: tự nạp hồ sơ sang thực đơn
watch(
  () => [hasSavedProfile.value, resolvingEntry.value],
  ([hasProf, resolving]) => {
    if (!resolving && hasProf && !store.planId && !store.result && !wantsSurveyEdit.value && step.value === 1 && !quickBusy.value) {
      void useSavedProfile();
    }
  }
);

// Không cho vào bước sau khi chưa có dữ liệu của bước trước; đã đặt xong thì về trang hoàn tất
watch(
  () => [resolvingEntry.value, quickBusy.value, step.value, store.planId, Boolean(store.result)],
  ([resolving, busy]) => {
    if (resolving || busy) return;
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
