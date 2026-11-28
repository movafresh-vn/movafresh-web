<template>
  <div class="f-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="f-modal-title" @click.self="$emit('close')">
    <div class="f-modal-box">
      <!-- Nút đóng -->
      <button class="mclose" type="button" aria-label="Đóng" @click="$emit('close')"><X :size="20" aria-hidden="true" /></button>

      <!-- Tiêu đề Header -->
      <div class="f-modal-head">
        <span class="factory-badge">DANH MỤC THỰC ĐƠN NHÀ MÁY ĐẮK LẮK &amp; KHO TP.HCM</span>
        <h2 id="f-modal-title" class="f-modal-title">Toàn bộ thực đơn sơ chế chuẩn Terroir</h2>
        <p class="f-modal-sub">Sơ chế sạch 100% · Đóng khay vô trùng · Chuỗi xe lạnh 0–4°C · Gói xốt MOVA đặc biệt đi kèm</p>
      </div>

      <!-- Ô tìm kiếm nhanh -->
      <div class="f-search-row">
        <div class="f-search-input-wrap">
          <Search :size="18" class="search-icon" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="text"
            class="f-search-input"
            placeholder="Tìm nhanh theo tên món hoặc nguyên liệu (bò, heo, gà, cá, tôm, rau, canh, mì...)"
            autofocus
          />
          <button v-if="searchQuery" class="clear-btn" type="button" aria-label="Xóa tìm kiếm" @click="searchQuery = ''"><X :size="16" aria-hidden="true" /></button>
        </div>
      </div>

      <!-- Thanh Tabs lọc theo nhóm món -->
      <div class="f-tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="f-tab"
          :class="{ active: activeTab === t.key }"
          role="tab"
          :aria-selected="activeTab === t.key"
          @click="activeTab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <!-- Danh sách thẻ món -->
      <div class="f-dish-list" role="list">
        <div v-if="!filteredDishes.length" class="f-empty">
          <p>Không tìm thấy món ăn phù hợp với từ khóa "<b>{{ searchQuery }}</b>".</p>
          <button class="pl-btn sm" type="button" @click="searchQuery = ''; activeTab = 'all'">Xem tất cả món</button>
        </div>

        <div
          v-for="d in filteredDishes"
          :key="d.id"
          class="f-dish-card"
          :class="{ 'is-current': isCurrent(d.id) }"
          role="listitem"
        >
          <div class="f-card-top">
            <div class="f-card-header">
              <span class="f-region-pill"><MapPin :size="12" aria-hidden="true" /> {{ d.terroir_region || 'Đắk Lắk' }}</span>
              <span v-if="isCurrent(d.id)" class="f-current-pill">Đang chọn</span>
              <span
                v-else
                class="f-delta-pill even"
                data-testid="dish-tier"
              >
                {{ deltaLabel(d) }}
              </span>
            </div>
            <h3 class="f-dish-name">{{ d.name }}</h3>
            <p class="f-dish-desc">{{ d.terroir_story || d.spec || '' }}</p>
          </div>

          <div class="f-card-meta">
            <div class="f-sauce-tag">
              <span class="icon-sauce" aria-hidden="true"><Sparkles :size="14" /></span>
              <span class="sauce-text">{{ sauceName(d) }}</span>
            </div>
            <div v-if="d.nutrition_per_serving" class="f-nutri-line num">
              <span><b>{{ d.nutrition_per_serving.calories }}</b> kcal</span> ·
              <span>Đạm <b>{{ d.nutrition_per_serving.protein_g }}g</b></span>
            </div>
          </div>

          <div class="f-card-actions">
            <button
              type="button"
              class="f-btn-detail"
              @click="openDetail(d)"
            >
              Chi tiết
            </button>
            <button
              type="button"
              class="f-btn-select"
              :class="{ disabled: isCurrent(d.id) }"
              :disabled="isCurrent(d.id)"
              @click="selectDish(d)"
            >
              {{ isCurrent(d.id) ? 'Món hiện tại' : 'Chọn đổi món này' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Chi tiết món dùng chung -->
      <DishDetailModal
        v-if="detailDish"
        :dish="detailDish"
        :household-size="householdSize"
        :show-select="true"
        :is-current="isCurrent(detailDish.id)"
        @close="detailDish = null"
        @select="selectDish"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { MapPin, Search, Sparkles, X } from 'lucide-vue-next';
import DishDetailModal from './DishDetailModal.vue';
import { DISHES, SAUCES, SKUS } from '../../shared/data/catalog';
import { recipeFor } from '../../shared/data/recipes';
import { tierLabel } from '../../shared/domain/mealTier';

const props = defineProps({
  currentDishId: { type: String, default: '' },
  currentKind: { type: String, default: '' },
  householdSize: { type: Number, default: 2 },
  options: { type: Array, default: () => [] } // Mảng options có sẵn từ swapOptions nếu có
});

const emit = defineEmits(['close', 'select', 'detail']);

const searchQuery = ref('');
const activeTab = ref('all');
const detailDish = ref(null);

const tabs = [
  { key: 'all', label: 'Tất cả (21)' },
  { key: 'protein_viet', label: 'Món Đạm Việt' },
  { key: 'protein_western', label: 'Món Đạm Âu' },
  { key: 'veg', label: 'Rau xanh' },
  { key: 'soup', label: 'Canh' },
  { key: 'carb', label: 'Tinh bột' },
  { key: 'dessert', label: 'Tráng miệng IQF' }
];

const allDishes = computed(() => Object.values(DISHES));

function getTabGroup(d) {
  if (d.id.startsWith('D-WST-')) return 'protein_western';
  if (d.kind === 'protein') return 'protein_viet';
  if (d.kind === 'veg') return 'veg';
  if (d.kind === 'soup') return 'soup';
  if (d.kind === 'carb') return 'carb';
  if (d.kind === 'dessert') return 'dessert';
  return 'other';
}

const filteredDishes = computed(() => {
  let list = allDishes.value;

  if (activeTab.value !== 'all') {
    list = list.filter((d) => getTabGroup(d) === activeTab.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((d) => {
      const matchName = d.name.toLowerCase().includes(q);
      const matchRegion = (d.terroir_region || '').toLowerCase().includes(q);
      const matchSauce = d.sauce && (SAUCES[d.sauce]?.name || '').toLowerCase().includes(q);
      const matchSku = d.bom?.some((b) => (SKUS[b.sku]?.name || '').toLowerCase().includes(q));
      return matchName || matchRegion || matchSauce || matchSku;
    });
  }

  return list;
});

function isCurrent(dishId) {
  return dishId === props.currentDishId;
}

function sauceName(d) {
  if (d.sauce && SAUCES[d.sauce]) {
    return `Gói xốt: ${SAUCES[d.sauce].name}`;
  }
  if (d.kind === 'dessert') {
    return 'Trái cây IQF ăn ngay';
  }
  if (d.kind === 'carb') {
    return 'Tinh bột hữu cơ đóng gói chân không';
  }
  return 'Gói xốt MOVA đặc biệt đi kèm';
}

// Giá lẻ từng món không hiện cho khách: hiện hạng món (tiền vẫn do máy chủ tính).
function deltaLabel(dish) {
  if (isCurrent(dish.id)) return 'Đang chọn';
  return tierLabel(dish);
}

function openDetail(dish) {
  detailDish.value = dish;
  emit('detail', dish.id);
}

const detailSteps = computed(() => {
  if (!detailDish.value) return [];
  const r = recipeFor(detailDish.value.id);
  return r?.steps || detailDish.value.cooking_steps || [];
});

function selectDish(dish) {
  if (isCurrent(dish.id)) return;
  detailDish.value = null;
  emit('select', dish);
  emit('close');
}
</script>

<style scoped>
.f-modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay-dark);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
}

.f-modal-box {
  background: var(--white);
  border-radius: 20px;
  max-width: 780px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: var(--shadow-sheet);
  overflow: hidden;
}

.f-modal-head {
  flex-shrink: 0;
  padding: 24px 24px 14px;
  border-bottom: 1px solid var(--line-2);
}
.factory-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.f-modal-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 4px;
}
.f-modal-sub {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
}

.f-search-row {
  flex-shrink: 0;
  padding: 12px 24px 8px;
}
.f-search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 14px;
  color: var(--muted);
  pointer-events: none;
}
.f-search-input {
  width: 100%;
  height: 44px;
  padding: 0 40px 0 42px;
  font-size: 14px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  outline: none;
  background: var(--surface);
  transition: all 0.2s ease;
}
.f-search-input:focus {
  border-color: var(--green);
  background: var(--white);
  box-shadow: 0 0 0 3px rgba(11, 156, 99, 0.12);
}
.clear-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  color: var(--muted);
  cursor: pointer;
}

.f-tabs {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  padding: 4px 24px 12px;
  overflow-x: auto;
  border-bottom: 1px solid var(--line-2);
  scrollbar-width: thin;
}
.f-tab {
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 99px;
  border: 1px solid var(--line);
  background: var(--white);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.f-tab:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}
.f-tab.active {
  background: var(--green-d);
  color: var(--white);
  border-color: var(--green-d);
}

.f-dish-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  background: var(--surface);
}
@media (max-width: 640px) {
  .f-modal-backdrop {
    align-items: flex-end;
    padding: 0;
  }
  .f-modal-box {
    border-radius: 22px 22px 0 0;
    max-height: 92svh;
  }
  .f-dish-list { grid-template-columns: 1fr; padding: 12px 16px; }
}

.f-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
}

.f-dish-card {
  background: var(--white);
  border: 1.5px solid var(--line);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  transition: all 0.18s ease;
}
.f-dish-card:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow-1);
  transform: translateY(-1px);
}
.f-dish-card.is-current {
  border-color: var(--green);
  background: var(--green-tint);
}

.f-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.f-region-pill {
  font-size: 11px;
  font-weight: 700;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 2px 7px;
  border-radius: 6px;
}
.f-current-pill {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  background: var(--line-2);
  padding: 2px 7px;
  border-radius: 6px;
}
.f-delta-pill {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
}
.f-delta-pill.down {
  background: var(--green-soft);
  color: var(--green-d);
}
.f-delta-pill.up {
  background: var(--amber-soft);
  color: var(--red-orange-d);
}
.f-delta-pill.even {
  background: var(--line-2);
  color: var(--ink-2);
}

.f-dish-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--ink);
  margin: 0 0 4px;
}
.f-dish-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.f-card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px dashed var(--line-2);
}
.f-sauce-tag {
  font-size: 12px;
  color: var(--ink-2);
  display: flex;
  align-items: center;
  gap: 4px;
}
.f-nutri-line {
  font-size: 11px;
  color: var(--muted);
}

.f-card-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 6px;
}
.f-btn-detail {
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--white);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s ease;
}
.f-btn-detail:hover {
  background: var(--surface);
  border-color: var(--line-strong);
}
.f-btn-select {
  flex: 1;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  background: var(--green-d);
  color: var(--white);
  cursor: pointer;
  transition: all 0.15s ease;
}
.f-btn-select:hover:not(.disabled) {
  background: var(--green);
}
.f-btn-select.disabled {
  background: var(--line);
  color: var(--faint);
  cursor: not-allowed;
}

/* Modal Chi tiết lồng */
.f-detail-overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay-dark);
  backdrop-filter: blur(2px);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.f-detail-sheet {
  background: var(--white);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sheet);
}
.f-detail-header {
  padding: 20px 20px 12px;
  border-bottom: 1px solid var(--line-2);
}
.f-detail-title {
  font-size: 18px;
  font-weight: 800;
  margin: 6px 0 0;
  color: var(--ink);
}
.f-detail-body {
  padding: 16px 20px;
  overflow-y: auto;
  display: grid;
  gap: 12px;
  font-size: 13px;
  line-height: 1.5;
}
.f-detail-box {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  display: grid;
  gap: 4px;
}
.f-detail-box.story-box {
  background: var(--green-tint);
  border-color: var(--green-line);
}
.box-label {
  font-weight: 700;
  color: var(--ink);
}
.chef-note {
  margin: 6px 0 0;
  color: var(--green-d);
  font-style: italic;
}
.storage-note {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
}
.f-detail-nutri {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: var(--butter);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}
.nutri-item small {
  display: block;
  font-size: 11px;
  color: var(--muted);
}
.nutri-item b {
  font-size: 14px;
  color: var(--ink);
}
.step-list {
  margin: 4px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}
.f-detail-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--line-2);
  display: flex;
  justify-content: flex-end;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>