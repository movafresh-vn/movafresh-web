<template>
  <section class="ai-section" aria-labelledby="ai-title">
    <div class="ai-panel">
      <div class="ai-heading">
        <div>
          <p class="eyebrow">BẾP TRƯỞNG MOVA</p>
          <h2 id="ai-title">Gợi ý thực đơn chuẩn vị Đắk Lắk</h2>
          <p class="muted">Dựa trên khẩu vị và nhu cầu gia đình bạn để gợi ý thực đơn 5 món dinh dưỡng, tiện lợi.</p>
        </div>
        <button
          class="btn primary"
          type="button"
          :disabled="loading || !personalDataConsent || !hasApiConfig"
          @click="runAgents"
        >
          {{ loading ? 'Đang lên thực đơn…' : mealPlan || props.hasAppliedMenu ? 'Lên lại thực đơn' : 'Nhờ Bếp trưởng gợi ý' }}
        </button>
      </div>

      <div class="ai-consents">
        <label class="consent-row" :class="{ on: personalDataConsent }">
          <input v-model="personalDataConsent" type="checkbox" @change="savePersonalDataConsent">
          <span>Tôi đồng ý chia sẻ thông tin khảo sát khẩu vị (không gồm thông tin liên hệ) để Đầu bếp MOVA gợi ý thực đơn.</span>
        </label>
        <label class="consent-row" :class="{ on: behaviorConsent, disabled: !personalDataConsent }">
          <input v-model="behaviorConsent" type="checkbox" :disabled="!personalDataConsent" @change="saveBehaviorConsent">
          <span>Tôi đồng ý ghi nhận lượt xem chi tiết và đổi món để Đầu bếp MOVA tối ưu khẩu vị cho các tuần tiếp theo (tùy chọn).</span>
        </label>
      </div>
      <p v-if="behaviorConsent && !hasSupabaseSession" class="ai-hint">
        Bếp trưởng MOVA sẵn sàng gợi ý ngay. Đăng nhập để lưu lại sở thích khẩu vị của gia đình bạn cho các lần sau.
      </p>

      <p v-if="error" class="ai-error" role="alert">{{ error }}</p>
      <div v-if="mealPlan" class="ai-results">
        <h3 v-if="mealPlan.meals.length">Bếp trưởng MOVA đã chuẩn bị thực đơn {{ mealPlan.meals.length }} bữa</h3>
        <h3 v-else>Bếp trưởng chưa tìm được món phù hợp từ dữ liệu hiện có</h3>
        <p>MOVA sẽ tự động áp dụng thực đơn cân đối theo khảo sát nếu chưa đồng bộ đủ số bữa.</p>
        <p v-if="mealPlan.fallback_notice" class="muted">{{ mealPlan.fallback_notice }}</p>
      </div>

      <div v-if="recommendations" class="ai-results">
        <h3>Gợi ý món ăn chuẩn vị dành riêng cho bạn</h3>
        <ul>
          <li v-for="item in recommendations.items" :key="item.dish_id">
            <strong>{{ item.name }}</strong>
            <small>{{ item.chef_reason }}</small>
          </li>
        </ul>
      </div>

      <p v-if="!hasApiConfig" class="ai-hint">
        Cần cấu hình VITE_API_BASE_URL để kết nối dịch vụ Bếp trưởng MOVA.
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { generateGuestMealPlan, generateMealPlan, getAiConsents, getPersonalizedRecommendations, updateAiConsents, updateAiProfile } from '../../services/aiApi';
import { getAccessToken, supabase } from '../../services/supabase';

const props = defineProps({
  hasAppliedMenu: { type: Boolean, default: false }
});
const emit = defineEmits(['behavior-consent-change', 'meal-plan-generated', 'meal-plan-unavailable']);
defineExpose({ refreshGu });
const store = usePlanFlowStore();
const mealPlan = ref(null);
const recommendations = ref(null);
const error = ref('');
const loading = ref(false);
const personalDataConsent = ref(false);
const behaviorConsent = ref(false);
const hasSupabaseSession = ref(false);
const hasApiConfig = computed(() => Boolean(import.meta.env.VITE_API_BASE_URL));
let authSubscription;

const cuisinePreferences = computed(() => {
  const cuisines = store.answers.cuisines;
  if (Array.isArray(cuisines) && cuisines.length) return cuisines;
  return [store.answers.cuisine || 'viet'];
});

function surveyAnswers() {
  const answers = store.answers;
  return {
    household_size: answers.size,
    weekly_home_meals_count: answers.meals,
    cuisine_preferences: cuisinePreferences.value,
    avoid: answers.avoid,
    allergies_and_restrictions: answers.avoid.filter((value) => value.startsWith('no_')),
    household_needs: answers.needs,
    weekly_grocery_budget_vnd: answers.budget || undefined
  };
}

function emitBehaviorConsent() {
  emit('behavior-consent-change', Boolean(hasSupabaseSession.value && personalDataConsent.value && behaviorConsent.value));
}

async function syncConsents() {
  error.value = '';
  let token;
  try {
    token = await getAccessToken();
  } catch (cause) {
    hasSupabaseSession.value = false;
    error.value = cause instanceof Error ? cause.message : 'Không thể kiểm tra phiên đăng nhập.';
    return;
  }
  hasSupabaseSession.value = Boolean(token);
  if (!token) {
    personalDataConsent.value = false;
    behaviorConsent.value = false;
    emitBehaviorConsent();
    return;
  }
  try {
    const consents = await getAiConsents();
    personalDataConsent.value = consents.personal_data_processing;
    behaviorConsent.value = consents.personal_data_processing && consents.behavior_tracking;
    emitBehaviorConsent();
    if (consents.personal_data_processing && consents.behavior_tracking) {
      await refreshGu();
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Không thể tải trạng thái đồng ý.';
    emitBehaviorConsent();
  }
}

onMounted(async () => {
  await syncConsents();
  if (!supabase) return;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    hasSupabaseSession.value = Boolean(session);
    if (!session) {
      personalDataConsent.value = false;
      behaviorConsent.value = false;
      mealPlan.value = null;
      recommendations.value = null;
      emitBehaviorConsent();
      return;
    }
    window.setTimeout(() => { void syncConsents(); }, 0);
  });
  authSubscription = data.subscription;
});

onUnmounted(() => authSubscription?.unsubscribe());

async function saveBehaviorConsent() {
  error.value = '';
  if (!hasSupabaseSession.value) {
    emitBehaviorConsent();
    return;
  }
  try {
    await updateAiConsents({ behavior_tracking: behaviorConsent.value });
    emitBehaviorConsent();
  } catch (cause) {
    behaviorConsent.value = !behaviorConsent.value;
    error.value = cause instanceof Error ? cause.message : 'Không thể lưu lựa chọn ghi nhận khẩu vị.';
    emitBehaviorConsent();
  }
}

async function savePersonalDataConsent() {
  error.value = '';
  if (personalDataConsent.value) return;

  const previousBehaviorConsent = behaviorConsent.value;
  behaviorConsent.value = false;
  mealPlan.value = null;
  recommendations.value = null;
  emitBehaviorConsent();
  if (!hasSupabaseSession.value) return;

  try {
    await updateAiConsents({
      personal_data_processing: false,
      behavior_tracking: false
    });
  } catch (cause) {
    personalDataConsent.value = true;
    behaviorConsent.value = previousBehaviorConsent;
    error.value = cause instanceof Error ? cause.message : 'Không thể cập nhật lựa chọn xử lý dữ liệu.';
    emitBehaviorConsent();
  }
}

async function refreshGu() {
  if (!hasSupabaseSession.value || !personalDataConsent.value || !behaviorConsent.value) return;
  try {
    recommendations.value = await getPersonalizedRecommendations();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Chưa thể tải gợi ý từ Bếp trưởng.';
  }
}

async function runAgents() {
  loading.value = true;
  error.value = '';
  mealPlan.value = null;
  recommendations.value = null;
  try {
    const answers = surveyAnswers();
    const token = await getAccessToken();
    if (token) {
      await updateAiConsents({
        personal_data_processing: true,
        behavior_tracking: behaviorConsent.value
      });
      await updateAiProfile({
        household_size: answers.household_size,
        servings_default: answers.household_size,
        weekly_grocery_budget_vnd: answers.weekly_grocery_budget_vnd,
        cuisines: cuisinePreferences.value,
        avoid: answers.avoid,
        allergen_codes: answers.allergies_and_restrictions
          .map((value) => ({ no_seafood: 'seafood', no_gluten: 'gluten', no_lactose: 'lactose' })[value])
          .filter(Boolean),
        avoid_tags: answers.allergies_and_restrictions
          .map((value) => ({ no_beef: 'beef', no_pork: 'pork', no_spicy: 'spicy' })[value])
          .filter(Boolean),
        household_needs: answers.household_needs
      });
      mealPlan.value = await generateMealPlan({ survey_answers: answers, max_prep_minutes: 20 });
    } else {
      mealPlan.value = await generateGuestMealPlan({
        survey_answers: answers,
        max_prep_minutes: 20
      });
    }
    emit('meal-plan-generated', mealPlan.value);
    if (token && behaviorConsent.value) {
      await refreshGu();
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Không thể kết nối Bếp trưởng MOVA.';
    emit('meal-plan-unavailable');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.ai-section {
  padding: 0;
  background: transparent;
}
.ai-panel {
  padding: clamp(18px, 3vw, 28px);
  border: 1.5px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--card);
  box-shadow: var(--shadow-1);
}
.ai-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.ai-heading h2 {
  margin: 2px 0 6px;
  font-size: 22px;
}
.ai-heading p {
  margin: 0;
}
.eyebrow {
  color: var(--green-d);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
}
.ai-consents {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  font-size: 13.5px;
}
.consent-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: var(--r-ctl);
  border: 1px solid var(--line);
  background: var(--surface-tint);
  cursor: pointer;
  line-height: 1.45;
  transition: border-color .15s ease, background-color .15s ease;
}
.consent-row.on {
  border-color: var(--green-line);
  background: var(--green-tint);
}
.consent-row.disabled {
  opacity: .6;
  cursor: not-allowed;
}
.consent-row input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: var(--green-d);
  flex-shrink: 0;
  margin-top: 1px;
}
.ai-results {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.ai-results h3 {
  margin: 0 0 10px;
}
.ai-results ul {
  display: grid;
  gap: 10px;
  padding-left: 20px;
}
.ai-results li small {
  display: block;
  color: var(--muted);
}
.ai-error {
  margin: 16px 0 0;
  color: var(--red);
}
.ai-hint {
  margin: 14px 0 0;
  color: var(--muted);
  font-size: 12px;
}
@media (max-width: 680px) {
  .ai-heading { align-items: stretch; flex-direction: column; }
  .ai-heading .btn { width: 100%; justify-content: center; min-height: 46px; }
}
</style>
