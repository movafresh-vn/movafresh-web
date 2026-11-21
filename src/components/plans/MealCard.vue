<template>
  <article class="meal" :class="{ west: meal.western }">
    <header class="meal-h">
      <div>
        <b class="meal-t">Bữa {{ meal.meal_index }} <span class="muted">· {{ meal.day_label }}</span></b>
        <span class="pl-pill" :class="{ orange: meal.western }">{{ meal.theme }}</span>
      </div>
      <span v-if="showPrice" class="meal-price num">{{ fmt(meal.price_vnd) }}</span>
    </header>

    <ul class="parts">
      <li v-for="p in parts" :key="p.kind" class="part">
        <div class="part-row">
          <span class="kind">{{ p.label }}</span>
          <span class="dish">
            {{ p.dish.name }}
            <small v-if="p.note" class="muted">{{ p.note }}</small>
          </span>
          <div class="action-btns">
            <button
              type="button"
              class="detail-btn"
              title="Xem định lượng, quy cách & công thức"
              @click="openDishDetail(p.dish.dish_id)"
            >Chi tiết</button>
            <button
              v-if="editable && p.swappable"
              type="button"
              class="swap-btn"
              :aria-expanded="open === p.kind"
              @click="toggle(p.kind)"
            >{{ open === p.kind ? 'Đóng' : 'Đổi' }}</button>
          </div>
        </div>

        <!-- Khung đổi món nâng cao -->
        <div v-if="open === p.kind" class="swap-panel" :aria-label="'Đổi món: ' + p.label">
          <div class="swap-header">
            <div class="search-box">
              <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="Tìm món hoặc nguyên liệu (bò, gà, cá, tôm, heo...)"
              />
            </div>
            <button
              type="button"
              class="view-all-btn"
              @click="openFactoryModal(p.kind, p.dish?.dish_id)"
            >
              🏪 Mở toàn bộ thực đơn nhà máy
            </button>
          </div>

          <!-- Gợi ý đổi chéo nguyên liệu chính -->
          <div v-if="!searchQuery && crossIngredientOptions.length" class="cross-suggestions">
            <span class="sugg-label">Gợi ý đổi nguyên liệu chính khác:</span>
            <div class="sugg-grid">
              <button
                v-for="o in crossIngredientOptions"
                :key="o.dish_id"
                type="button"
                class="sugg-item"
                @click="choose(p.kind, o.dish_id)"
              >
                <b class="sugg-name">{{ o.name }}</b>
                <span class="num sugg-delta" :class="{ up: o.price_delta_vnd > 0, down: o.price_delta_vnd < 0 }">
                  {{ deltaText(o.price_delta_vnd) }}
                </span>
              </button>
            </div>
          </div>

          <ul class="opts">
            <li v-for="o in displayedOptions" :key="o.dish_id">
              <button type="button" class="opt" :class="{ cur: o.current }" :disabled="o.current" @click="choose(p.kind, o.dish_id)">
                <div class="opt-left">
                  <span class="opt-name">{{ o.name }}</span>
                  <small v-if="o.sauce_name" class="muted">Xốt: {{ o.sauce_name }}</small>
                </div>
                <span class="num delta" :class="{ up: o.price_delta_vnd > 0, down: o.price_delta_vnd < 0 }">
                  {{ o.current ? 'Đang chọn' : deltaText(o.price_delta_vnd) }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </li>
    </ul>

    <footer v-if="meal.highlight_sauce" class="sauce">
      Gói xốt MOVA đặc biệt: <b>{{ meal.highlight_sauce.name }}</b>
    </footer>

    <!-- Modal Chi tiết món dùng chung -->
    <DishDetailModal
      v-if="detailDish"
      :dish="detailDish"
      :household-size="effectiveHouseholdSize"
      :show-select="false"
      @close="detailDish = null"
    />

    <!-- Modal Toàn bộ thực đơn nhà máy -->
    <FactoryMenuModal
      v-if="activeFactoryKind"
      :current-dish-id="activeFactoryDishId"
      :current-kind="activeFactoryKind"
      :household-size="effectiveHouseholdSize"
      :options="options"
      @close="activeFactoryKind = ''"
      @select="onFactorySelect"
    />
  </article>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { DISHES, SKUS } from '../../shared/data/catalog';
import { recipeFor } from '../../shared/data/recipes';
import FactoryMenuModal from '../modals/FactoryMenuModal.vue';
import DishDetailModal from '../modals/DishDetailModal.vue';

const props = defineProps({
  meal: { type: Object, required: true },
  planId: { type: String, default: '' },
  editable: { type: Boolean, default: false },
  showPrice: { type: Boolean, default: true },
  householdSize: { type: Number, default: 2 }
});
const emit = defineEmits(['swap', 'view']);

const open = ref('');
const options = ref([]);
const searchQuery = ref('');
const showAllDishes = ref(false);
const detailDish = ref(null);
const activeFactoryKind = ref('');
const activeFactoryDishId = ref('');

function openFactoryModal(kind, dishId) {
  activeFactoryKind.value = kind;
  activeFactoryDishId.value = dishId || '';
}

function onFactorySelect(dish) {
  const kind = activeFactoryKind.value;
  activeFactoryKind.value = '';
  choose(kind, dish.id);
}

const RICE = 'D-CRB-001';

const effectiveHouseholdSize = computed(() => props.householdSize || 2);

const parts = computed(() => {
  const s = props.meal.meal_structure;
  const list = [];
  if (s.protein_dish) list.push({ kind: 'protein', label: 'Đạm', dish: s.protein_dish, swappable: true });
  if (s.veggie_dish) list.push({ kind: 'veg', label: 'Rau', dish: s.veggie_dish, swappable: true });
  if (s.soup_dish) list.push({ kind: 'soup', label: 'Canh', dish: s.soup_dish, swappable: true });
  if (s.carb_dish) {
    const rice = s.carb_dish.dish_id === RICE;
    list.push({
      kind: 'carb', label: 'Tinh bột', dish: s.carb_dish,
      swappable: props.meal.carb_choices && props.meal.carb_choices.length > 1,
      note: rice ? '· gạo tính theo tuần' : ''
    });
  }
  if (s.dessert) list.push({ kind: 'dessert', label: 'Trái cây', dish: s.dessert, swappable: false, note: '· tính theo tuần' });
  return list;
});

async function toggle(kind) {
  if (open.value === kind) {
    open.value = '';
    return;
  }
  searchQuery.value = '';
  showAllDishes.value = false;
  const res = await api.customer.swapOptions({ plan_id: props.planId, meal_index: props.meal.meal_index, kind });
  options.value = res.status === 'success' ? res.data.options : [];
  open.value = kind;
}

const currentDishId = computed(() => {
  const p = parts.value.find((x) => x.kind === open.value);
  return p ? p.dish.dish_id : '';
});

// Gợi ý 3-4 món khác hẳn nguyên liệu gốc
const crossIngredientOptions = computed(() => {
  const curId = currentDishId.value;
  const curDish = DISHES[curId];
  if (!curDish) return [];

  const curSku = curDish.bom?.[0]?.sku;
  const curTag = curDish.tags?.[0];

  return options.value
    .filter((o) => {
      if (o.dish_id === curId) return false;
      const d = DISHES[o.dish_id];
      if (!d) return true;
      const otherSku = d.bom?.[0]?.sku;
      const otherTag = d.tags?.[0];
      return otherSku !== curSku && otherTag !== curTag;
    })
    .slice(0, 4);
});

const displayedOptions = computed(() => {
  let list = options.value;
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((o) => {
      const d = DISHES[o.dish_id];
      const matchName = o.name.toLowerCase().includes(q);
      const matchSauce = o.sauce_name && o.sauce_name.toLowerCase().includes(q);
      const matchSku = d?.bom?.some((b) => (SKUS[b.sku]?.name || '').toLowerCase().includes(q));
      return matchName || matchSauce || matchSku;
    });
  } else if (!showAllDishes.value && crossIngredientOptions.value.length) {
    // Chỉ hiện các món nổi bật hoặc món đang chọn
    list = list.slice(0, 6);
  }
  return list;
});

function choose(kind, dishId) {
  open.value = '';
  emit('swap', props.meal.meal_index, kind, dishId);
}

function deltaText(v) {
  if (!v) return 'Giá như nhau';
  return `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`;
}

function openDishDetail(dishId) {
  const d = DISHES[dishId];
  if (d) {
    detailDish.value = d;
    emit('view', dishId);
  }
}

const dishSteps = computed(() => {
  if (!detailDish.value) return [];
  const r = recipeFor(detailDish.value.id);
  return r?.steps || [
    'Sơ chế và để ráo nguyên liệu đã cắt sẵn.',
    'Làm nóng chảo, cho nguyên liệu và xốt định lượng vào nấu trong 10-12 phút.',
    'Dọn ra đĩa và thưởng thức nóng hổi cùng gia đình.'
  ];
});

function formatBomGrams(gramsPerPerson) {
  const total = (gramsPerPerson || 0) * effectiveHouseholdSize.value;
  return `${total}g`;
}

function getSkuName(skuId) {
  return SKUS[skuId]?.name || skuId;
}

function kindLabel(kind) {
  switch (kind) {
    case 'protein': return '🥩 Đạm tươi sống';
    case 'veg': return '🥬 Rau hữu cơ';
    case 'soup': return '🍲 Canh ngọt nước';
    case 'carb': return '🍚 Tinh bột lành mạnh';
    case 'dessert': return '🍇 Trái cây tráng miệng';
    default: return 'Món ngon nhà MOVA';
  }
}
</script>

<style scoped>
.meal {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;
}
.meal.west { background: #FFFBF6; border-color: #F1C7B1; }
.meal-h { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.meal-h > div { display: grid; gap: 6px; justify-items: start; }
.meal-t { font-size: 17px; }
.meal-price { font-size: 16px; font-weight: 700; white-space: nowrap; }
.parts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 6px;
}
.part-row { display: grid; grid-template-columns: 76px 1fr auto; gap: 10px; align-items: center; min-height: 44px; }
.kind { font-size: 14px; font-weight: 700; color: var(--green-d); }
.dish { font-size: 16px; line-height: 1.35; }
.dish small { display: block; font-size: 13px; }

.action-btns { display: flex; gap: 6px; align-items: center; }
.detail-btn {
  padding: 6px 10px;
  min-height: 38px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.detail-btn:hover { background: #e2e8f0; }

.swap-btn {
  min-width: 58px;
  min-height: 38px;
  border: 1.5px solid var(--green);
  background: var(--card);
  color: var(--green-d);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.swap-btn:hover { background: var(--green-soft); }

.swap-panel {
  margin: 8px 0 12px;
  padding: 12px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  display: grid;
  gap: 10px;
}
.swap-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.search-box { flex: 1; min-width: 180px; }
.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}
.view-all-btn {
  padding: 7px 12px;
  background: var(--green-soft);
  border: 1px solid var(--green);
  color: var(--green-d);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.view-all-btn:hover {
  background: var(--green-d);
  color: #FFFFFF;
}

.cross-suggestions {
  background: #fff;
  border: 1px solid var(--line-2);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 6px;
}
.sugg-label { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
.sugg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px; }
.sugg-item {
  padding: 6px 8px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  text-align: left;
  display: grid;
  gap: 2px;
  cursor: pointer;
}
.sugg-item:hover { border-color: var(--green); background: var(--green-soft); }
.sugg-name { font-size: 13px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sugg-delta { font-size: 12px; font-weight: 700; }

.opts { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.opt {
  width: 100%;
  min-height: 44px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  text-align: left;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
}
.opt:hover:not(:disabled) { border-color: var(--green); background: var(--green-soft); }
.opt.cur { background: var(--green-soft); border-color: var(--green); font-weight: 600; }
.opt-left { display: grid; gap: 2px; }
.opt-name { font-size: 15px; font-weight: 600; }
.delta { font-size: 14px; font-weight: 700; white-space: nowrap; }
.delta.up { color: var(--orange-ink); }
.delta.down { color: var(--green-d); }

.sauce {
  font-size: 14px;
  background: var(--orange-soft);
  color: var(--orange-ink);
  border-radius: 10px;
  padding: 8px 12px;
  margin-top: auto;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.modal-box {
  background: var(--card);
  border-radius: 20px;
  max-width: 580px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px 20px;
  position: relative;
  box-shadow: 0 16px 36px rgba(0,0,0,0.25);
}
.mclose {
  position: absolute;
  top: 14px;
  right: 16px;
  background: transparent;
  border: 0;
  font-size: 28px;
  color: var(--muted);
  cursor: pointer;
}
.detail-header { margin-bottom: 14px; display: grid; gap: 6px; }
.badge-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.category-pill {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--muted-bg, #f1f5f9);
  color: var(--ink);
}
.category-pill.protein { background: #fee2e2; color: #991b1b; }
.category-pill.veg { background: #dcfce7; color: #166534; }
.category-pill.soup { background: #e0f2fe; color: #075985; }
.category-pill.carb { background: #fef3c7; color: #92400e; }
.category-pill.dessert { background: #f3e8ff; color: #6b21a8; }

.terroir-badge {
  display: inline-block;
  background: var(--green-soft);
  color: var(--green-d);
  font-size: 13px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  width: fit-content;
}
.dish-title { font-size: 20px; font-weight: 800; margin: 0; }

.terroir-story-box {
  background: #f8fafc;
  border-left: 3px solid var(--green);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 14px;
  display: grid;
  gap: 6px;
}
.story-text { font-size: 14px; color: #334155; line-height: 1.5; margin: 0; }
.chef-tip { font-size: 13px; color: #0f766e; background: #f0fdfa; padding: 6px 10px; border-radius: 6px; margin: 0; line-height: 1.4; }
.storage-text { font-size: 13px; color: #0284c7; margin: 4px 0 0; }

.detail-grid { display: grid; gap: 12px; margin-bottom: 14px; }
.info-card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
}
.card-title { font-size: 15px; font-weight: 700; margin: 0 0 8px; }
.bom-list { list-style: none; padding: 0; margin: 0 0 6px; display: grid; gap: 4px; font-size: 14px; }
.spec-text { font-size: 14px; margin: 6px 0 0; color: var(--muted); }

.nutri-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; }
.nutri-item { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 6px 4px; display: flex; flex-direction: column; }
.nutri-item b { font-size: 16px; color: var(--green-d); }
.nutri-item span { font-size: 11px; color: var(--muted); }

.recipe-card {
  background: #FFFBF6;
  border: 1px solid #F1C7B1;
  border-radius: 12px;
  padding: 12px 14px;
}
.recipe-steps { margin: 0; padding-left: 18px; display: grid; gap: 6px; font-size: 14px; line-height: 1.4; }

@media (max-width: 480px) {
  .part-row { grid-template-columns: 60px 1fr auto; gap: 6px; }
  .detail-btn, .swap-btn { padding: 4px 6px; font-size: 13px; }
}
</style>
