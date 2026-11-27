<template>
  <div class="menu">
    <div v-if="savedProfileBanner" class="pl-card saved-profile-bar" data-testid="saved-profile-bar">
      <span>Đang gợi ý theo hồ sơ của bạn · <router-link to="/plans?step=1&edit=1&q=1" class="edit-pref-link">Chỉnh sửa khẩu vị</router-link></span>
    </div>

    <header class="m-head">
      <h1 class="pl-h1">Bếp trưởng lên thực đơn trước</h1>
      <p class="pl-lead">
        Đồng ý chia sẻ thông tin khảo sát để Bếp trưởng MOVA chọn món trong danh mục thực đơn. Nếu dịch vụ chưa sẵn sàng hoặc thiếu món, MOVA vẫn luôn có thực đơn gợi ý cân đối theo khảo sát.
      </p>
    </header>

    <AiAgentsPanel
      ref="assistant"
      :has-applied-menu="menuReady"
      @behavior-consent-change="behaviorTrackingEnabled = $event"
      @meal-plan-generated="applyChefMenu"
      @meal-plan-unavailable="useSuggestedMenu"
    />

    <p v-if="fallbackNotice" class="menu-fallback" role="status">{{ fallbackNotice }}</p>
    <p v-if="store.error" class="pl-error" role="alert">{{ store.error }}</p>
    <p v-if="!menuReady && !store.error" class="menu-gate" role="status">
      Thực đơn chi tiết đang chờ xếp món. Hãy nhờ Bếp trưởng gợi ý thực đơn trước khi tiếp tục.
    </p>

    <template v-if="menuReady && plan">
      <header class="m-head">
        <h2 class="pl-h1">Thực đơn tuần 1 của bạn</h2>
        <p class="pl-lead">
          {{ fallbackNotice ? 'MOVA gợi ý' : 'Bếp trưởng MOVA đã chọn' }} {{ plan.meals_per_week }} bữa cho {{ plan.household_size }} người từ danh mục đặc sản. Bạn có thể đổi món linh hoạt trước khi thanh toán.
        </p>
      </header>

      <div class="m-grid">
        <section class="pl-card people" style="grid-area: people">
          <div class="people-in">
            <div>
              <b class="p-t">Số người ăn</b>
              <p class="pl-note">
                {{ plan.household_size === 1 ? 'Suất nấu 1 chảo, 10–15 phút.' : 'Mâm cơm Việt: đạm, rau, canh, tinh bột, trái cây.' }}
              </p>
            </div>
            <PeopleStepper :model-value="plan.household_size" @update:model-value="(v) => store.configure({ household_size: v })" />
          </div>
          <div class="people-in meals-row">
            <div>
              <b class="p-t">Số bữa mỗi tuần</b>
              <p class="pl-note">Linh hoạt từ 3 đến 21 bữa/tuần (tối đa 3 bữa/ngày).</p>
            </div>
            <PeopleStepper :model-value="plan.meals_per_week" :min="3" :max="21" label="bữa / tuần" @update:model-value="(v) => store.configure({ meals_per_week: v })" />
          </div>
        </section>

        <aside class="side" style="grid-area: side">
          <PriceBlock :quote="plan.quote" :household-size="plan.household_size" />
          <ValueQuestions :questions="plan.value_questions" @answer="(id, v) => store.answerUpsell(id, v)" />
        </aside>

        <section class="meals" style="grid-area: meals" aria-label="Các bữa trong tuần 1">
          <MealCard
            v-for="m in plan.meals"
            :key="m.meal_index"
            :meal="m"
            :plan-id="plan.plan_id"
            :household-size="plan.household_size"
            editable
            @swap="onSwap"
            @view="onDishView"
          />
          <p v-if="staples" class="staples">
            <b>Gạo và trái cây tính theo tuần:</b>
            {{ staples }}
          </p>
        </section>
      </div>

      <!-- Add-on đồ Tết: chỉ hiện khi chiến dịch đang chạy. GIÁ LÀ GIẢ ĐỊNH (xem campaign.js), chưa có đường thu tiền add-on ở backend. -->
      <section v-if="addons.length" class="pl-card addons" data-testid="tet-addons" aria-label="Đồ Tết bán kèm">
        <h2 class="pl-h2">Đồ Tết bán kèm</h2>
        <p class="pl-note">Chọn món bạn quan tâm, MOVA xác nhận giá và cách thanh toán khi chiến dịch Tết chạy. Giá dưới đây là giá dự kiến.</p>
        <ul class="addon-list">
          <li v-for="a in addons" :key="a.id">
            <label class="addon" :class="{ on: store.checkout.addons.includes(a.id) }">
              <input type="checkbox" :checked="store.checkout.addons.includes(a.id)" @change="onAddon(a.id)" />
              <span class="addon-name">{{ a.name }} <small class="muted">({{ a.unit }})</small></span>
              <span class="num addon-price">~{{ fmt(a.priceVnd) }} <small class="muted">dự kiến</small></span>
            </label>
          </li>
        </ul>
      </section>

      <p v-if="store.checkout.lockMenu" class="pl-panel good" role="status" data-testid="lock-menu-on">
        Bạn đã chọn chốt món theo ưu đãi chiến dịch. <button type="button" class="link-btn" @click="onLockMenu(false)">Bỏ chốt món</button>
      </p>

      <div class="cta">
        <div class="cta-sum">
          <small>Gói {{ plan.quote.weeks }} tuần trị giá {{ fmt(plan.quote.package_value_vnd) }}</small>
          <b class="num">
            ~{{ fmt(Math.round(plan.quote.per_meal_list_vnd / (plan.household_size || 1))) }}
            <span class="pl-unit">/ suất</span>
            <span class="pl-sub-unit"> ({{ fmt(plan.quote.per_meal_list_vnd) }}/bữa)</span>
          </b>
        </div>
        <button class="pl-btn primary" type="button" @click="$emit('next')">Tiếp tục: giao hàng và thanh toán</button>
      </div>
    </template>
    <div v-else-if="!plan" class="pl-card">Đang tải hồ sơ khảo sát...</div>

    <!-- Popup món theo nguyên liệu mùa + ưu đãi chốt món 72h: chỉ mở khi chiến dịch đang chạy, mỗi phiên một lần -->
    <SeasonalOfferModal v-if="offerOpen" :picks="seasonalPicks" @accept="onLockMenu(true)" @decline="closeOffer" @close="closeOffer" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import MealCard from './MealCard.vue';
import PriceBlock from './PriceBlock.vue';
import ValueQuestions from './ValueQuestions.vue';
import PeopleStepper from './PeopleStepper.vue';
import AiAgentsPanel from '../store/AiAgentsPanel.vue';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { useMovaStore } from '../../stores/useMovaStore';
import { trackAiEvents } from '../../services/aiApi';
import { fmt } from '../../shared/utils/formatters';
import SeasonalOfferModal from '../modals/SeasonalOfferModal.vue';
import { DISHES, SKUS } from '../../shared/data/catalog';
import { campaignActive, seasonalDishes, tetAddons, toggleAddon } from '../../shared/domain/campaign';

defineEmits(['next']);
const store = usePlanFlowStore();
const accountStore = useMovaStore();
const savedProfileBanner = computed(() => Boolean(accountStore.isLoggedIn && accountStore.account?.customer?.onboarding_completed));
const plan = computed(() => store.plan);
const assistant = ref(null);
const hasAiConfig = Boolean(import.meta.env.VITE_API_BASE_URL);
const menuReady = ref(store.chefMenuApplied || !hasAiConfig);
const fallbackNotice = ref(!store.chefMenuApplied && !hasAiConfig
  ? 'Dịch vụ Bếp trưởng chưa được cấu hình; đang dùng thực đơn MOVA gợi ý theo khảo sát.'
  : '');
const behaviorTrackingEnabled = ref(false);
const trackedSwapCount = ref(0);

// Chiến dịch (mặc định tắt): add-on Tết và popup chốt món chỉ hiện khi máy chủ/cấu hình báo chiến dịch đang chạy.
const campaignOn = computed(() => campaignActive({ plan: store.plan, preview: store.preview }));
const addons = computed(() => tetAddons(campaignOn.value));
const seasonalPicks = computed(() => seasonalDishes(DISHES, new Date().getMonth() + 1, { skus: SKUS }));
const OFFER_SEEN = 'mova_seasonal_offer_seen';
const offerOpen = ref(false);

function offerSeen() {
  try {
    return sessionStorage.getItem(OFFER_SEEN) === '1';
  } catch {
    return false;
  }
}

function closeOffer() {
  offerOpen.value = false;
  try {
    sessionStorage.setItem(OFFER_SEEN, '1');
  } catch {
    // bỏ qua
  }
}

function onLockMenu(on) {
  store.checkout.lockMenu = on;
  store.persist();
  closeOffer();
}

function onAddon(id) {
  store.checkout.addons = toggleAddon(store.checkout.addons || [], id);
  store.persist();
}

watch([campaignOn, menuReady], ([on, ready]) => {
  if (on && ready && plan.value && !offerSeen()) offerOpen.value = true;
}, { immediate: true });

async function useSuggestedMenu(reason = 'Bếp trưởng chưa tạo được thực đơn đầy đủ; đang dùng thực đơn MOVA gợi ý theo khảo sát.') {
  if (!(await store.useSuggestedMenu())) return;
  menuReady.value = true;
  fallbackNotice.value = reason;
}

async function applyChefMenu(chefPlan) {
  store.error = '';
  menuReady.value = false;
  store.setChefMenuApplied(false);

  if (!plan.value || !Array.isArray(chefPlan?.meals) || chefPlan.meals.length !== plan.value.meals.length) {
    await useSuggestedMenu('Bếp trưởng chưa tạo đủ số bữa an toàn; đang dùng thực đơn MOVA gợi ý theo khảo sát.');
    return;
  }
  if (!chefPlan.meals.every((meal, index) => meal?.meal_index === plan.value.meals[index].meal_index)) {
    await useSuggestedMenu('Kết quả Bếp trưởng chưa khớp với thực đơn MOVA; đang dùng thực đơn gợi ý theo khảo sát.');
    return;
  }

  const meals = chefPlan.meals.map((meal) => ({
    meal_index: meal.meal_index,
    western: meal.western,
    dishes: {
      protein: meal.meal_structure?.protein_dish?.dish_id,
      soup: meal.meal_structure?.soup_dish?.dish_id,
      veg: meal.meal_structure?.veggie_dish?.dish_id,
      carb: meal.meal_structure?.carb_dish?.dish_id,
      dessert: meal.meal_structure?.dessert?.dish_id
    }
  }));
  if (!(await store.applyChefMenu(meals))) {
    const reason = store.error || 'Món Bếp trưởng chọn chưa khớp danh mục MOVA.';
    await useSuggestedMenu(`${reason} Đang dùng thực đơn MOVA gợi ý theo khảo sát.`);
    return;
  }
  fallbackNotice.value = '';
  menuReady.value = true;
}

async function onSwap(mealIndex, kind, dishId) {
  const meal = plan.value?.meals.find((item) => item.meal_index === mealIndex);
  const partName = { protein: 'protein_dish', veg: 'veggie_dish', soup: 'soup_dish', carb: 'carb_dish' }[kind];
  const previousDishId = partName ? meal?.meal_structure?.[partName]?.dish_id : null;
  const changed = await store.swap(mealIndex, kind, dishId);
  if (!changed || !behaviorTrackingEnabled.value || !previousDishId || previousDishId === dishId) return;

  try {
    await trackAiEvents([
      { dish_id: previousDishId, event_type: 'swap_out' },
      { dish_id: dishId, event_type: 'swap_in' }
    ]);
    trackedSwapCount.value += 1;
    if (trackedSwapCount.value >= 3) {
      trackedSwapCount.value = 0;
      await assistant.value?.refreshGu();
    }
  } catch (cause) {
    accountStore.toast(cause instanceof Error ? cause.message : 'Không thể lưu lựa chọn món cho Gu.');
  }
}

async function onDishView(dishId) {
  if (!behaviorTrackingEnabled.value) return;
  try {
    await trackAiEvents([{ dish_id: dishId, event_type: 'view_detail' }]);
  } catch (cause) {
    accountStore.toast(cause instanceof Error ? cause.message : 'Không thể lưu lượt xem món cho Gu.');
  }
}

const staples = computed(() => {
  const s = plan.value && plan.value.weekly_staples;
  if (!s) return '';
  const rice = s.rice_grams ? `khoảng ${(s.rice_grams / 1000).toFixed(1).replace('.', ',')} kg gạo ST25 cho cả tuần` : '';
  const fruit = s.fruits.length ? `trái cây theo tuần: ${s.fruits.join(', ')}` : '';
  return [rice, fruit].filter(Boolean).join('; ') + '.';
});
</script>

<style scoped>
.saved-profile-bar { margin-bottom: 12px; padding: 10px 14px; background: var(--green-soft); color: var(--green-d); font-size: 14px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.edit-pref-link { color: var(--green-d); text-decoration: underline; font-weight: 700; }
.meals-row { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--line); }
.m-head { margin-bottom: 14px; }
.addons { display: grid; gap: 10px; margin-top: 16px; }
.addon-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.addon { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 8px 12px; border: 1.5px solid var(--line); border-radius: 12px; }
.addon.on { border-color: var(--green); background: var(--green-soft); }
.addon-name { flex: 1; }
.addon-price { font-weight: 700; }
.link-btn { background: none; border: 0; padding: 0; font: inherit; text-decoration: underline; cursor: pointer; color: inherit; }
.menu-gate { margin: 18px 0 0; padding: 14px 18px; border-radius: 12px; background: var(--green-soft); color: var(--green-d); }
.menu-fallback { margin: 18px 0 0; padding: 14px 18px; border-radius: 12px; background: var(--green-soft); color: var(--green-d); }
.m-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  grid-template-areas: 'people side' 'meals side';
  grid-template-rows: auto 1fr;
  gap: 16px;
  align-items: start;
}
.people-in { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
.p-t { font-size: 17px; }
.side { display: grid; gap: 14px; position: sticky; top: 84px; }
.meals { display: grid; gap: 12px; }
.staples { font-size: 15px; background: var(--green-soft); color: var(--green-d); border-radius: 12px; padding: 10px 14px; }
.cta {
  position: sticky; bottom: 0; z-index: 10; margin: 18px -20px 0; padding: 12px 20px max(12px, var(--zmp-safe-bottom, env(safe-area-inset-bottom, 0px)));
  background: rgba(250, 249, 245, .96); border-top: 1px solid var(--line);
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
}
.cta-sum { display: grid; line-height: 1.15; }
.cta-sum small { font-size: 14px; color: var(--muted); }
.cta-sum b { font-size: 22px; }
.pl-unit { font-size: 15px; font-weight: 500; color: var(--muted); }

@media (max-width: 900px) {
  .m-grid { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'people' 'side' 'meals'; }
  .side { position: static; }
}
@media (max-width: 560px) {
  .cta { margin-left: -16px; margin-right: -16px; padding: 10px 16px; }
  .cta .pl-btn { flex: 1; padding: 12px 10px; font-size: 16px; }
  .cta-sum b { font-size: 19px; }
}
</style>
