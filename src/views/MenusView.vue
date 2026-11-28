<template>
  <div class="menus-view">
    <div class="wrap">
      <!-- Header Trang Thực Đơn Tuần -->
      <header class="menus-header">
        <span class="menus-badge">THỰC ĐƠN ĐẦU BẾP TUYỂN CHỌN</span>
        <h1 class="menus-title">Thực đơn sơ chế tuần này tại MOVA FRESH</h1>
        <p class="menus-lead">
          100% nguyên liệu đặc sản Terroir sơ chế sạch từ Đắk Lắk, định lượng chuẩn xác từng gram và công thức nấu <b>15 phút — 1 chảo</b>.
          Khám phá sự đa dạng luân phiên qua từng tuần cho căn bếp nhà bạn.
        </p>
      </header>

      <!-- 1. Bộ chọn lịch theo tuần dạng thanh viên thuốc 4 tuần kế tiếp -->
      <div class="week-pill-selector" role="tablist" aria-label="Chọn tuần thực đơn">
        <button
          v-for="w in WEEKS"
          :key="w.id"
          type="button"
          class="week-pill-btn"
          :class="{ active: selectedWeek === w.id }"
          role="tab"
          :aria-selected="selectedWeek === w.id"
          @click="selectedWeek = w.id"
        >
          <span class="w-name">{{ w.label }}</span>
          <small class="w-theme">{{ w.theme }}</small>
        </button>
      </div>

      <!-- 2. Bộ lọc nhanh theo nhóm món -->
      <div class="category-filter-bar" role="tablist" aria-label="Lọc nhóm món">
        <button
          v-for="cat in CATEGORIES"
          :key="cat.key"
          type="button"
          class="cat-filter-btn"
          :class="{ active: activeCategory === cat.key }"
          role="tab"
          :aria-selected="activeCategory === cat.key"
          @click="activeCategory = cat.key"
        >
          <span class="cat-icon" aria-hidden="true"><component :is="cat.iconComp" :size="15" /></span>
          <span>{{ cat.label }}</span>
          <span class="cat-count num">{{ getCategoryCount(cat.key) }}</span>
        </button>
      </div>

      <!-- Thông tin tuần đang chọn -->
      <div class="week-intro-card">
        <div class="w-intro-left">
          <span class="w-cur-badge">{{ currentWeekObj.label }}</span>
          <h2 class="w-cur-title">{{ currentWeekObj.title }}</h2>
          <p class="w-cur-desc">{{ currentWeekObj.desc }}</p>
        </div>
        <div class="w-intro-right">
          <span class="w-stat-pill"><Sparkles :size="14" aria-hidden="true" /> 5 món cân đối Á Đông</span>
          <span class="w-stat-pill"><Leaf :size="14" aria-hidden="true" /> Gói xốt MOVA độc quyền</span>
          <span class="w-stat-pill"><Snowflake :size="14" aria-hidden="true" /> Xe lạnh 0–4°C tận cửa</span>
        </div>
      </div>

      <!-- 3. Lưới 3 cột thẻ món ăn chuẩn thương mại -->
      <div class="dishes-commercial-grid">
        <article
          v-for="dish in displayedDishes"
          :key="dish.id"
          class="commercial-dish-card"
          @click="openDishDetail(dish)"
        >
          <!-- Khung ảnh 16:10 có fallback nghệ thuật -->
          <div class="dish-card-media" :class="'theme-' + dish.kind">
            <img
              v-if="dish.image"
              :src="dish.image"
              :alt="dish.name"
              class="dish-img"
              loading="lazy"
              @error="(e) => (e.target.style.display = 'none')"
            />
            <div class="dish-fallback-art" aria-hidden="true">
              <component :is="getDishIcon(dish)" :size="52" :stroke-width="1.6" class="art-icon" />
            </div>

            <!-- Huy hiệu góc ảnh -->
            <div class="dish-badges-overlay">
              <span class="corner-badge chef-pick">
                {{ getCornerBadge(dish) }}
              </span>
              <span class="corner-badge time-badge">
                <Clock :size="12" aria-hidden="true" /> 15 phút
              </span>
            </div>

            <!-- Dòng Terroir gắn đáy ảnh -->
            <div class="terroir-strip">
              <MapPin :size="12" aria-hidden="true" /> <span>{{ dish.terroir_region || 'Đắk Lắk' }}</span>
            </div>
          </div>

          <!-- Nội dung thẻ món -->
          <div class="dish-card-content">
            <h3 class="dish-name-heading">{{ dish.name }}</h3>

            <!-- Dòng thẻ phụ: 15 phút • Hợp trẻ nhỏ • 1 chảo gọn nhẹ -->
            <div class="sub-tags-row">
              <span class="sub-tag">15 phút</span>
              <span class="sub-tag-dot">•</span>
              <span class="sub-tag">{{ isChildFriendly(dish) ? 'Hợp trẻ nhỏ' : 'Vị đậm đà' }}</span>
              <span class="sub-tag-dot">•</span>
              <span class="sub-tag">1 chảo gọn nhẹ</span>
            </div>

            <!-- Gói xốt & Dinh dưỡng nhanh -->
            <div class="dish-meta-snippet">
              <span class="sauce-snippet">
                <Sparkles :size="13" aria-hidden="true" class="inline-sauce-ico" /> {{ getSauceSnippet(dish) }}
              </span>
              <span class="nutri-snippet num">
                {{ dish.nutrition_per_serving?.calories || dish.nutrition?.kcal || 380 }} kcal · {{ dish.nutrition_per_serving?.protein_g || dish.nutrition?.protein || 22 }}g đạm
              </span>
            </div>

            <!-- Đơn giá minh bạch song song & Nút Chi tiết -->
            <div class="dish-card-footer">
              <!-- Giá lẻ từng món không hiện cho khách: hiện hạng món. Giá gói do máy chủ tính ở bước /plans. -->
              <div class="price-display">
                <span class="serving-price" data-testid="dish-tier">{{ tierLabel(dish) }}</span>
              </div>
              <button
                type="button"
                class="view-detail-btn"
                aria-label="Xem chi tiết món"
              >
                Chi tiết ›
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- Không có kết quả -->
      <div v-if="!displayedDishes.length" class="empty-state">
        <p>Không có món ăn trong danh mục này.</p>
        <button class="pl-btn" type="button" @click="activeCategory = 'all'">Xem tất cả món</button>
      </div>

      <!-- Khối giới thiệu quy chuẩn mâm cơm 5 món -->
      <section class="viet-tray-banner">
        <div class="tray-content">
          <span class="tray-badge">QUY CHUẨN MÂM CƠM Á ĐÔNG</span>
          <h2>Mâm cơm 5 món cân bằng hoàn hảo trong 15 phút</h2>
          <p>
            Mỗi hộp meal-kit từ MOVA FRESH cho gia đình đều trọn vẹn 5 cấu phần dinh dưỡng:
            <b>1 Món Đạm chính</b> + <b>1 Món Rau xanh</b> + <b>1 Món Canh ngọt lành</b> + <b>Gạo hữu cơ ST25 Sóc Trăng</b> + <b>Trái cây tráng miệng cấp đông IQF</b>.
          </p>
          <div class="tray-icons-row">
            <div class="tray-col"><span class="tray-ico" aria-hidden="true"><Beef :size="22" /></span><b>Đạm tươi</b><small>Bò, Heo, Gà, Cá</small></div>
            <div class="tray-col"><span class="tray-ico" aria-hidden="true"><Salad :size="22" /></span><b>Rau sạch</b><small>Bông cải, Cải ngọt</small></div>
            <div class="tray-col"><span class="tray-ico" aria-hidden="true"><Soup :size="22" /></span><b>Canh ấm</b><small>Bí đỏ sườn, Canh chua</small></div>
            <div class="tray-col"><span class="tray-ico" aria-hidden="true"><Utensils :size="22" /></span><b>Tinh bột</b><small>Gạo ST25, Mì Ý</small></div>
            <div class="tray-col"><span class="tray-ico" aria-hidden="true"><Sprout :size="22" /></span><b>Tráng miệng</b><small>Vải thiều IQF, Chuối</small></div>
          </div>
        </div>
      </section>

      <!-- 4. Thanh CTA neo đáy nhẹ nhàng -->
      <aside class="sticky-bottom-cta">
        <div class="cta-inner">
          <div class="cta-texts">
            <b>Thích thực đơn tuần này của Đầu bếp MOVA?</b>
            <span>Làm khảo sát 1 phút để cá nhân hóa khẩu vị &amp; nhận ưu đãi đến {{ fmt(giftMax) }}</span>
          </div>
          <router-link to="/plans" class="pl-btn orange cta-btn">
            Thiết kế thực đơn riêng cho nhà bạn
          </router-link>
        </div>
      </aside>
    </div>

    <!-- Modal Chi tiết món dùng chung -->
    <DishDetailModal
      v-if="selectedDishDetail"
      :dish="selectedDishDetail"
      :household-size="2"
      :show-select="false"
      @close="selectedDishDetail = null"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  Beef, ChefHat, Clock, Drumstick, Leaf, MapPin, Salad, Shell,
  Snowflake, Soup, Sparkles, Sprout, Utensils, UtensilsCrossed
} from 'lucide-vue-next';
import DishDetailModal from '../components/modals/DishDetailModal.vue';
import { DISHES, SAUCES } from '../shared/data/catalog';
import { BUSINESS } from '../shared/config/business';
import { fmt } from '../shared/utils/formatters';
import { tierLabel } from '../shared/domain/mealTier';

const route = useRoute();

const WEEKS = [
  { id: 1, label: 'Tuần này', theme: 'Hương vị Tây Nguyên', title: 'Tuần 1: Khởi nguồn hương vị Bazan Đắk Lắk', desc: 'Đậm đà hương vị truyền thống với Ba rọi thảo mộc Cư M\'gar, Bò lúc lắc tiêu đen Chư Sê và canh sườn non bí đỏ thơm ngọt.' },
  { id: 2, label: 'Tuần 2', theme: 'Thanh mát & Đậm đà', title: 'Tuần 2: Nông sản cao nguyên & Canh chua Nam Bộ', desc: 'Gà đồi nướng sả mật ong Buôn Đôn, Sườn non rim mắm tỏi thơm lừng kết hợp canh chua cá bớp thanh nhiệt.' },
  { id: 3, label: 'Tuần 3', theme: 'Biển xanh & Thảo mộc', title: 'Tuần 3: Giao hòa biển Vũng Tàu & Rừng Tây Nguyên', desc: 'Cá bớp cắt khoanh kho tộ béo ngậy, Bò bít tết xốt rượu vang đỏ kiểu Âu và bông cải xanh baby Đà Lạt giòn ngọt.' },
  { id: 4, label: 'Tuần 4', theme: 'Fusion Đổi gió cuối tuần', title: 'Tuần 4: Đột phá vị giác Mâm cơm hiện đại', desc: 'Tôm sú rim cay nhẹ, Ba rọi xốt kho tàu củ sen bùi béo và mì Ý xốt kem nấm bơ tỏi cho ngày thảnh thơi.' }
];

const CATEGORIES = [
  { key: 'all', label: 'Tất cả món', iconComp: UtensilsCrossed },
  { key: 'protein_viet', label: 'Đạm Việt', iconComp: Beef },
  { key: 'protein_western', label: 'Đạm Âu', iconComp: ChefHat },
  { key: 'veg_soup', label: 'Rau & Canh', iconComp: Salad },
  { key: 'carb', label: 'Tinh bột', iconComp: Utensils },
  { key: 'dessert', label: 'Tráng miệng IQF', iconComp: Sprout }
];

const selectedWeek = ref(1);
const activeCategory = ref('all');
const selectedDishDetail = ref(null);

const giftMax = BUSINESS.incentives.giftCardWeeklyVnd.reduce((a, b) => a + b, 0);

const currentWeekObj = computed(() => {
  return WEEKS.find((w) => w.id === selectedWeek.value) || WEEKS[0];
});

const allDishesList = computed(() => Object.values(DISHES));

function getDishCategory(dish) {
  if (dish.id.startsWith('D-WST-')) return 'protein_western';
  if (dish.kind === 'protein') return 'protein_viet';
  if (dish.kind === 'veg' || dish.kind === 'soup') return 'veg_soup';
  if (dish.kind === 'carb') return 'carb';
  if (dish.kind === 'dessert') return 'dessert';
  return 'other';
}

function getCategoryCount(key) {
  if (key === 'all') return allDishesList.value.length;
  return allDishesList.value.filter((d) => getDishCategory(d) === key).length;
}

const displayedDishes = computed(() => {
  let list = allDishesList.value;
  if (activeCategory.value !== 'all') {
    list = list.filter((d) => getDishCategory(d) === activeCategory.value);
  }
  return list;
});

function getDishIcon(dish) {
  if (dish.kind === 'protein') {
    if (dish.tags?.includes('beef')) return Beef;
    if (dish.tags?.includes('pork')) return Drumstick;
    if (dish.tags?.includes('seafood')) return Shell;
    return UtensilsCrossed;
  }
  if (dish.kind === 'veg') return Salad;
  if (dish.kind === 'soup') return Soup;
  if (dish.kind === 'carb') return Utensils;
  if (dish.kind === 'dessert') return Sprout;
  return UtensilsCrossed;
}

function getCornerBadge(dish) {
  if (dish.id === 'D-PRT-001' || dish.id === 'D-PRT-002') return 'Đầu bếp tuyển chọn';
  if (dish.id.startsWith('D-WST-')) return 'Phong vị Âu';
  if (dish.kind === 'dessert') return 'Vải thiều IQF';
  return 'Đặc sản Đắk Lắk';
}

function isChildFriendly(dish) {
  return !dish.tags?.includes('spicy');
}

function getSauceSnippet(dish) {
  if (dish.sauce && SAUCES[dish.sauce]) {
    return SAUCES[dish.sauce].name;
  }
  if (dish.kind === 'dessert') return 'IQF ngọt thanh tự nhiên';
  if (dish.kind === 'carb') return 'Gạo ST25 Sóc Trăng';
  return 'Gói xốt đặc biệt đi kèm';
}

function openDishDetail(dish) {
  selectedDishDetail.value = dish;
}

onMounted(() => {
  if (route.query.dish && DISHES[route.query.dish]) {
    selectedDishDetail.value = DISHES[route.query.dish];
  }
});
</script>

<style scoped>
.menus-view {
  padding: 30px 0 100px;
  background: var(--bg);
  min-height: 85vh;
}

.menus-header {
  text-align: center;
  max-width: 760px;
  margin: 0 auto 28px;
}
.menus-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}
.menus-title {
  font-size: 30px;
  font-weight: 900;
  color: var(--ink);
  margin: 0 0 10px;
  line-height: 1.25;
}
.menus-lead {
  font-size: 15px;
  color: var(--muted);
  line-height: 1.55;
  margin: 0;
}

/* 1. Week pill selector */
.week-pill-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  max-width: 820px;
  margin: 0 auto 24px;
}
@media (max-width: 640px) {
  .week-pill-selector {
    grid-template-columns: repeat(2, 1fr);
  }
}
.week-pill-btn {
  background: var(--white);
  border: 1.5px solid var(--line);
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.week-pill-btn:hover {
  border-color: var(--line-strong);
  transform: translateY(-1px);
}
.week-pill-btn.active {
  border-color: var(--green);
  background: var(--green-soft);
  box-shadow: 0 4px 12px rgba(11, 156, 99, 0.12);
}
.w-name {
  font-size: 14.5px;
  font-weight: 800;
  color: var(--ink);
}
.week-pill-btn.active .w-name {
  color: var(--green-d);
}
.w-theme {
  font-size: 11.5px;
  color: var(--muted);
}

/* 2. Category filter bar */
.category-filter-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 22px;
  scrollbar-width: thin;
}
.cat-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 9px 16px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  background: var(--card);
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.cat-filter-btn:hover {
  border-color: var(--faint);
}
.cat-filter-btn.active {
  background: var(--green-d);
  border-color: var(--green-d);
  color: var(--text-on-primary);
}
.cat-count {
  font-size: 11px;
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 6px;
  border-radius: 999px;
}
.cat-filter-btn.active .cat-count {
  background: rgba(255, 255, 255, 0.25);
  color: var(--white);
}

/* Week intro banner */
.week-intro-card {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 18px 22px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.w-intro-left {
  display: grid;
  gap: 4px;
  max-width: 600px;
}
.w-cur-badge {
  font-size: 11px;
  font-weight: 800;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 2px 8px;
  border-radius: 6px;
  width: fit-content;
}
.w-cur-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
}
.w-cur-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
  margin: 0;
}
.w-intro-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.w-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 6px 12px;
  border-radius: 8px;
}

/* 3. Lưới 3 cột thương mại */
.dishes-commercial-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 36px;
}
@media (max-width: 920px) {
  .dishes-commercial-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 580px) {
  .dishes-commercial-grid {
    grid-template-columns: 1fr;
  }
}

.commercial-dish-card {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.commercial-dish-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(11, 156, 99, 0.1);
  border-color: var(--green);
}

.dish-card-media {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--green-d);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dish-card-media.theme-protein {
  background: linear-gradient(135deg, var(--green-d) 0%, var(--green-dd) 65%, var(--ink-forest) 100%);
}
.dish-card-media.theme-veg {
  background: linear-gradient(135deg, var(--green) 0%, var(--forest) 100%);
}
.dish-card-media.theme-soup {
  background: linear-gradient(135deg, var(--blue) 0%, var(--blue-ink) 55%, var(--ink-forest) 100%);
}
.dish-card-media.theme-carb {
  background: linear-gradient(135deg, var(--amber-ink) 0%, var(--brown) 100%);
}
.dish-card-media.theme-dessert {
  background: linear-gradient(135deg, var(--violet) 0%, var(--ink-dark) 100%);
}

.dish-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dish-fallback-art {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.85);
}
.art-icon {
  filter: drop-shadow(0 6px 14px rgba(24, 21, 17, 0.35));
}

.dish-badges-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 2;
}
.corner-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 9px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}
.corner-badge.chef-pick {
  background: rgba(8, 122, 77, 0.88);
  color: var(--white);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.corner-badge.time-badge {
  background: rgba(24, 21, 17, 0.64);
  color: var(--white);
}

.terroir-strip {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, var(--scrim-dark), transparent);
  padding: 14px 10px 7px;
  font-size: 11px;
  font-weight: 700;
  color: var(--white);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Nội dung thẻ */
.dish-card-content {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 6px;
}
.dish-name-heading {
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 44px;
}

.sub-tags-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--green-d);
}
.sub-tag-dot {
  color: var(--line);
}

.dish-meta-snippet {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 6px;
  border-top: 1px dashed var(--line-2);
  margin-top: auto;
}
.sauce-snippet {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inline-sauce-ico { color: var(--green-d); flex-shrink: 0; }
.nutri-snippet {
  font-size: 11px;
  color: var(--muted);
}

.dish-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 8px;
  padding-top: 8px;
  margin-top: 4px;
}
.price-display {
  display: flex;
  flex-direction: column;
}
.serving-price {
  font-size: 15px;
  font-weight: 800;
  color: var(--orange-ink);
}
.meal-price {
  font-size: 11px;
  color: var(--muted);
}

.view-detail-btn {
  padding: 5px 12px;
  border: 1px solid var(--line);
  background: var(--bg);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--green-d);
  cursor: pointer;
  transition: all 0.15s ease;
}
.view-detail-btn:hover {
  background: var(--green-soft);
  border-color: var(--green);
}

/* Banner mâm cơm Á Đông */
.viet-tray-banner {
  background: var(--amber-soft);
  border: 1.5px solid var(--red-line);
  border-radius: 20px;
  padding: 26px 24px;
  margin-bottom: 40px;
  text-align: center;
}
.tray-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: var(--orange-ink);
  background: var(--orange-soft);
  padding: 3px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}
.viet-tray-banner h2 {
  font-size: 22px;
  font-weight: 900;
  color: var(--ink);
  margin: 0 0 8px;
}
.viet-tray-banner p {
  font-size: 14px;
  color: var(--muted);
  max-width: 680px;
  margin: 0 auto 20px;
  line-height: 1.5;
}
.tray-icons-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  max-width: 720px;
  margin: 0 auto;
}
@media (max-width: 600px) {
  .tray-icons-row {
    grid-template-columns: repeat(3, 1fr);
  }
}
.tray-col {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.tray-col .tray-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--green-tint);
  color: var(--green-d);
  margin-bottom: 4px;
}
.tray-col b {
  font-size: 12.5px;
  color: var(--ink);
}
.tray-col small {
  font-size: 10.5px;
  color: var(--muted);
}

/* 4. Sticky CTA footer */
.sticky-bottom-cta {
  position: sticky;
  bottom: 16px;
  z-index: 30;
  margin-top: 20px;
}
.cta-inner {
  background: rgba(249, 247, 236, 0.96);
  backdrop-filter: blur(10px);
  border: 1.5px solid var(--green);
  border-radius: 18px;
  padding: 14px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  box-shadow: 0 10px 30px rgba(11, 156, 99, 0.15);
}
@media (max-width: 768px) {
  .sticky-bottom-cta {
    position: static;
    margin-top: 24px;
  }
}
@media (max-width: 700px) {
  .cta-inner {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
}
.cta-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cta-texts b {
  font-size: 15px;
  color: var(--green-d);
}
.cta-texts span {
  font-size: 13px;
  color: var(--muted);
}
.cta-btn {
  text-decoration: none;
  min-height: 44px;
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--muted);
}
</style>
