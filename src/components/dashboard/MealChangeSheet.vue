<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="swap-title" @click.self="close">
    <div class="mbox box">
      <button class="mclose" type="button" :disabled="busy" @click="close" aria-label="Đóng">×</button>
      <h2 id="swap-title" class="pl-h2">Đổi món linh hoạt</h2>
      <p class="pl-note">Tuần {{ week.number }}, bữa {{ target.meal.meal_index }}. Đang chọn: <b>{{ target.dish.name }}</b></p>

      <p v-if="loadError" class="pl-error" role="alert">{{ loadError }}</p>

      <template v-else-if="!preview">
        <p class="pl-note">Đổi được đến <b>{{ deadline }}</b>.</p>

        <!-- Tìm kiếm và Mở rộng -->
        <div class="swap-search-bar">
          <input
            v-model="searchQuery"
            type="text"
            class="pl-input search-box"
            placeholder="Tìm kiếm món hoặc nguyên liệu (bò, gà, cá, tôm, heo...)"
          />
          <button
            type="button"
            class="open-factory-btn"
            @click="showFactoryModal = true"
          >
            🏪 Mở toàn bộ thực đơn nhà máy
          </button>
        </div>

        <!-- Gợi ý chéo nguyên liệu -->
        <div v-if="!searchQuery && crossSuggestions.length" class="cross-box">
          <span class="cross-title">Gợi ý đổi nguyên liệu chính khác:</span>
          <div class="cross-chips">
            <button
              v-for="o in crossSuggestions"
              :key="o.dish_id"
              type="button"
              class="sugg-chip"
              @click="choose(o)"
            >
              <b>{{ o.name }}</b>
              <span class="num sugg-delta" :class="{ up: o.price_delta_vnd > 0, down: o.price_delta_vnd < 0 }">
                {{ deltaText(o.price_delta_vnd) }}
              </span>
            </button>
          </div>
        </div>

        <div class="pl-chips col" role="list">
          <div v-for="o in filteredOptions" :key="o.dish_id" class="opt-row">
            <button
              type="button"
              class="pl-chip big flex-1"
              :class="{ on: o.current }"
              :disabled="o.current"
              role="listitem"
              @click="choose(o)"
            >
              <b>{{ o.name }}</b>
              <small>
                <template v-if="o.sauce_name">{{ o.sauce_name }} · </template>
                <span class="num" :class="{ up: o.price_delta_vnd > 0, down: o.price_delta_vnd < 0 }">
                  {{ o.current ? 'Đang chọn' : deltaText(o.price_delta_vnd) }}
                </span>
              </small>
            </button>
            <button
              type="button"
              class="detail-mini-btn"
              title="Xem chi tiết"
              @click.stop="openDetail(o.dish_id)"
            >ℹ️</button>
          </div>
        </div>
      </template>

      <template v-else>
        <p class="pl-note">Hạn đổi món: <b>{{ preview.deadline_label }}</b>.</p>
        <div class="sum">
          <p><span class="muted">Từ</span> <b>{{ preview.from.name }}</b></p>
          <p><span class="muted">Sang</span> <b>{{ preview.to.name }}</b></p>
          <p v-if="preview.carb_reset" class="pl-note">Món tinh bột quay về {{ preview.carb_reset.name }} cho hợp món mới.</p>
        </div>

        <div class="pl-panel" :class="preview.delta_vnd > 0 ? 'warn' : 'good'" role="status">
          <p class="num">
            <template v-if="preview.delta_vnd === 0">Giá tuần không đổi.</template>
            <template v-else>Chênh lệch: <b class="big">{{ preview.delta_vnd > 0 ? '+' : '−' }}{{ fmt(Math.abs(preview.delta_vnd)) }}</b></template>
          </p>
          <p v-if="preview.settle?.mode === 'charge'" class="num">
            Tuần này đã bị trừ tiền, nên phần chênh lệch trừ thêm vào Fresh Credit:
            còn <b>{{ fmt(preview.settle.balance_before_vnd) }}</b> → <b>{{ fmt(preview.settle.balance_after_vnd) }}</b>.
          </p>
          <p v-else-if="preview.settle?.mode === 'refund'" class="num">
            Tuần này đã bị trừ tiền, nên MOVA hoàn phần chênh lệch vào Fresh Credit:
            từ <b>{{ fmt(preview.settle.balance_before_vnd) }}</b> lên <b>{{ fmt(preview.settle.balance_after_vnd) }}</b>.
          </p>
          <p v-else class="num">
            Tuần này chưa bị trừ tiền. Số tiền sẽ trừ lúc <b>{{ preview.charge_label }}</b> đổi từ {{ fmt(preview.old_amount_vnd) }} thành <b>{{ fmt(preview.new_amount_vnd) }}</b>.
          </p>
        </div>

        <p v-if="preview.settle && !preview.settle.enough" class="pl-error" role="alert">
          Fresh Credit còn thiếu {{ fmt(preview.settle.short_vnd) }} cho phần chênh lệch này. Nạp thêm rồi đổi lại, hoặc chọn món khác.
        </p>
        <p v-if="error" class="pl-error" role="alert">{{ error }}</p>

        <div class="btns">
          <button v-if="!preview.settle || preview.settle.enough" class="pl-btn primary" type="button" :disabled="busy" @click="confirm">Xác nhận đổi món</button>
          <button v-else class="pl-btn orange" type="button" @click="topup">Nạp thêm Fresh Credit</button>
          <button class="pl-btn" type="button" :disabled="busy || uncertain" @click="preview = null">Chọn món khác</button>
        </div>
      </template>

      <!-- Modal Chi tiết món dùng chung -->
      <DishDetailModal
        v-if="selectedDishDetail"
        :dish="selectedDishDetail"
        :household-size="target.meal.household_size || 2"
        :show-select="true"
        :is-current="selectedDishDetail.id === target.dish.dish_id"
        @close="selectedDishDetail = null"
        @select="chooseFromDetail(selectedDishDetail)"
      />

      <!-- Modal Danh sách thực đơn toàn bộ nhà máy -->
      <FactoryMenuModal
        v-if="showFactoryModal"
        :current-dish-id="target.dish.dish_id"
        :current-kind="target.dish.kind"
        :household-size="target.meal.household_size || 2"
        :options="options"
        @close="showFactoryModal = false"
        @select="onFactorySelect"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../../shared/api';
import { newKey } from '../../shared/api/http';
import { fmt } from '../../shared/utils/formatters';
import { checkoutErrorMessage } from '../../shared/domain/checkoutError';
import { useMovaStore } from '../../stores/useMovaStore';
import { DISHES, SKUS } from '../../shared/data/catalog';
import { recipeFor } from '../../shared/data/recipes';
import FactoryMenuModal from '../modals/FactoryMenuModal.vue';
import DishDetailModal from '../modals/DishDetailModal.vue';

const props = defineProps({
  week: { type: Object, required: true },
  target: { type: Object, required: true } // { meal, dish }
});
const emit = defineEmits(['close', 'done']);
const store = useMovaStore();

const base = { subscription_id: props.week.subscription_id, week_index: props.week.week_index, meal_index: props.target.meal.meal_index, kind: props.target.dish.kind };
const loadError = ref('');
const options = ref([]);
const deadline = ref('');
onMounted(async () => {
  const res = await api.customer.mealOptions(base);
  if (res.status === 'success') {
    options.value = res.data.options;
    deadline.value = res.data.deadline_label;
  } else {
    loadError.value = res.error.message;
  }
});
const preview = ref(null);
const error = ref('');
const busy = ref(false);
const uncertain = ref(false);
const searchQuery = ref('');
const showFactoryModal = ref(false);
const selectedDishDetail = ref(null);
let picked = null;
let requestKey = null;

async function onFactorySelect(dish) {
  showFactoryModal.value = false;
  const o = options.value.find((x) => x.dish_id === dish.id) || { dish_id: dish.id, name: dish.name };
  await choose(o);
}

const deltaText = (v) => (v === 0 ? 'Cùng giá' : `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`);

const crossSuggestions = computed(() => {
  const curDish = DISHES[props.target.dish.dish_id];
  if (!curDish) return [];
  const curSku = curDish.bom?.[0]?.sku;
  const curTag = curDish.tags?.[0];

  return options.value
    .filter((o) => {
      if (o.dish_id === props.target.dish.dish_id) return false;
      const d = DISHES[o.dish_id];
      if (!d) return true;
      return d.bom?.[0]?.sku !== curSku && d.tags?.[0] !== curTag;
    })
    .slice(0, 4);
});

const filteredOptions = computed(() => {
  if (!searchQuery.value.trim()) return options.value;
  const q = searchQuery.value.trim().toLowerCase();
  return options.value.filter((o) => {
    const d = DISHES[o.dish_id];
    return (
      o.name.toLowerCase().includes(q) ||
      (o.sauce_name && o.sauce_name.toLowerCase().includes(q)) ||
      d?.bom?.some((b) => (SKUS[b.sku]?.name || '').toLowerCase().includes(q))
    );
  });
});

async function choose(o) {
  error.value = '';
  picked = o;
  requestKey = null;
  const p = await api.customer.previewMealChange({ ...base, dish_id: o.dish_id });
  if (p.status === 'error') error.value = checkoutErrorMessage(p.error.code, p.error.message);
  else preview.value = p.data;
}

function openDetail(dishId) {
  selectedDishDetail.value = DISHES[dishId] || null;
}

const detailSteps = computed(() => {
  if (!selectedDishDetail.value) return [];
  const r = recipeFor(selectedDishDetail.value.id);
  return r?.steps || [];
});

function chooseFromDetail(dish) {
  const o = options.value.find((x) => x.dish_id === dish.id);
  selectedDishDetail.value = null;
  if (o) choose(o);
}

async function confirm() {
  if (busy.value) return;
  busy.value = true;
  requestKey ||= newKey();
  try {
    const r = await api.customer.changeMeal({ ...base, dish_id: picked.dish_id, key: requestKey });
    if (r.status === 'error') {
      if (r.error.code === 'BAD_RESPONSE' || r.error.status >= 500) uncertain.value = true;
      error.value = uncertain.value
        ? 'Chưa xác nhận được kết quả. Hãy bấm xác nhận lại tại đây để dùng cùng mã yêu cầu.'
        : checkoutErrorMessage(r.error.code, r.error.message);
      return;
    }
    uncertain.value = false;
    await store.refresh();
    store.toast(`Đã đổi sang ${picked.name}`);
    emit('done');
  } catch {
    uncertain.value = true;
    error.value = 'Chưa xác nhận được kết quả. Kiểm tra kết nối rồi bấm xác nhận lại tại đây; MOVA sẽ dùng cùng mã yêu cầu.';
  } finally {
    busy.value = false;
  }
}

function close() {
  if (busy.value) return;
  if (uncertain.value && !window.confirm('Kết quả đổi món chưa rõ. Hãy kiểm tra tuần giao trước khi thử thao tác mới. Bạn vẫn muốn đóng?')) return;
  emit('close');
}

function topup() {
  emit('close');
  store.openModal('topup');
}
</script>

<style scoped>
.box { max-width: 540px; padding: 26px 20px; display: grid; gap: 14px; position: relative; }
.sum { display: grid; gap: 6px; font-size: 17px; }
.big { font-size: 22px; }
.btns { display: grid; gap: 10px; }
.up { color: var(--orange-ink); font-weight: 700; }
.down { color: var(--green-d); font-weight: 700; }
.pl-chip.big:disabled { opacity: 1; cursor: default; }

.swap-search-bar { margin: -4px 0 4px; display: flex; gap: 8px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 200px; border-radius: 10px; font-size: 14px; padding: 8px 12px; }
.open-factory-btn {
  padding: 8px 12px;
  background: var(--green-soft);
  color: var(--green-d);
  border: 1px solid var(--green);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.open-factory-btn:hover {
  background: var(--green-dd);
  color: var(--white);
}

.cross-box {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  display: grid;
  gap: 6px;
}
.cross-title { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
.cross-chips { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.sugg-chip {
  padding: 6px 8px;
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 8px;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.sugg-chip:hover { border-color: var(--green); background: var(--green-soft); }
.sugg-chip b { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sugg-delta { font-size: 12px; font-weight: 700; white-space: nowrap; }

.opt-row { display: flex; gap: 6px; align-items: stretch; width: 100%; }
.flex-1 { flex: 1; }
.detail-mini-btn {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0 10px;
  cursor: pointer;
  font-size: 16px;
}
.detail-mini-btn:hover { background: var(--line); }

.sub-modal {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 10;
}
.sub-modal-box {
  background: var(--white);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 440px;
  max-height: 85vh;
  overflow-y: auto;
  display: grid;
  gap: 10px;
  position: relative;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
.detail-header { display: grid; gap: 4px; }
.terroir-pill { font-size: 12px; font-weight: 700; color: var(--green-d); background: var(--green-soft); padding: 2px 8px; border-radius: 6px; width: fit-content; }
.detail-name { font-size: 18px; font-weight: 800; margin: 0; }
.detail-story { background: var(--surface); border-left: 3px solid var(--green); padding: 8px 10px; border-radius: 6px; font-size: 13px; line-height: 1.45; color: var(--ink-2); display: grid; gap: 4px; }
.detail-story p { margin: 0; }
.chef-note { color: var(--green-d); background: var(--green-tint); padding: 4px 8px; border-radius: 4px; }
.detail-section { font-size: 13px; display: grid; gap: 2px; }
.spec-line { font-size: 13px; color: var(--muted); margin: 0; }
.storage-line { font-size: 12px; color: var(--blue); margin: 0; }
.nutri-bar { font-size: 13px; color: var(--ink); background: var(--bg); padding: 6px 10px; border-radius: 6px; }
.detail-steps { font-size: 13px; background: var(--amber-soft); border: 1px solid var(--amber-line); padding: 8px 10px; border-radius: 8px; }
.detail-steps ol { margin: 4px 0 0; padding-left: 18px; display: grid; gap: 4px; }
.detail-actions { margin-top: 6px; }
</style>
