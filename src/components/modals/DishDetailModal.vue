<template>
  <div class="dish-modal-overlay" role="dialog" aria-modal="true" :aria-label="dish?.name" @click.self="$emit('close')">
    <div class="dish-modal-box">
      <!-- Nút đóng góc phải -->
      <button class="mclose" type="button" aria-label="Đóng" @click="$emit('close')">×</button>

      <!-- 1. Ảnh lớn đầu Modal với Gradient tối nhẹ ở đáy -->
      <div class="dish-hero-banner" :class="'theme-' + (dish?.kind || 'protein')">
        <div class="hero-bg-gradient"></div>
        
        <!-- Ảnh món hoặc fallback gradient nghệ thuật -->
        <div class="hero-media">
          <img
            v-if="dish?.image"
            :src="dish.image"
            :alt="dish.name"
            class="hero-img"
            @error="(e) => (e.target.style.display = 'none')"
          />
          <div class="hero-fallback-icon" aria-hidden="true">
            {{ getDishEmoji(dish) }}
          </div>
        </div>

        <!-- Lớp phủ đáy hiển thị thông tin -->
        <div class="hero-content-overlay">
          <div class="hero-meta-row">
            <span class="terroir-pill">📍 {{ dish?.terroir_region || 'Đắk Lắk' }}</span>
            <span class="kind-pill" :class="dish?.kind">{{ getKindBadge(dish?.kind) }}</span>
            
            <button
              type="button"
              class="share-btn"
              :title="copied ? 'Đã sao chép link!' : 'Chia sẻ món ăn'"
              @click="shareDish"
            >
              {{ copied ? '✓ Đã chép' : '🔗 Chia sẻ' }}
            </button>
          </div>
          <h2 class="hero-dish-title">{{ dish?.name }}</h2>
        </div>
      </div>

      <!-- 2. Thân Modal cuộn -->
      <div class="dish-modal-body">
        <!-- Thanh 4 chỉ số nhanh ngang hàng -->
        <div class="quick-stats-strip">
          <div class="stat-cell">
            <span class="stat-icon">⏱</span>
            <div class="stat-texts">
              <span class="stat-lbl">Thời gian nấu</span>
              <b class="stat-val">15 phút</b>
            </div>
          </div>
          <div class="stat-cell">
            <span class="stat-icon">🔥</span>
            <div class="stat-texts">
              <span class="stat-lbl">Năng lượng</span>
              <b class="stat-val num">{{ nutrition.calories }} kcal</b>
            </div>
          </div>
          <div class="stat-cell">
            <span class="stat-icon">💪</span>
            <div class="stat-texts">
              <span class="stat-lbl">Chất đạm</span>
              <b class="stat-val num">{{ nutrition.protein_g }}g</b>
            </div>
          </div>
          <div class="stat-cell">
            <span class="stat-icon">👨‍🍳</span>
            <div class="stat-texts">
              <span class="stat-lbl">Độ khó</span>
              <b class="stat-val">Dễ (1 chảo)</b>
            </div>
          </div>
        </div>

        <!-- 3. Mô tả & Câu chuyện Terroir + Mẹo Đầu bếp MOVA -->
        <div v-if="dish?.terroir_story || dish?.chef_note" class="info-section terroir-box">
          <div class="section-badge">🌿 CÂU CHUYỆN THỔ NHƯỠNG &amp; NÔNG SẢN ĐẶC SẢN</div>
          <p v-if="dish?.terroir_story" class="terroir-text">
            {{ dish.terroir_story }}
          </p>
          <div v-if="dish?.chef_note" class="chef-note-box">
            <span class="chef-avatar">👨‍🍳</span>
            <div>
              <b>Mẹo vàng từ Đầu bếp MOVA:</b>
              <p>{{ dish.chef_note }}</p>
            </div>
          </div>
        </div>

        <!-- 4. Cảnh báo Dị ứng 2 tầng (Zero-Tolerance) -->
        <div class="info-section allergy-box">
          <div class="allergy-header">
            <span class="allergy-title-badge">🛡️ THÔNG TIN CHẤT DỊ ỨNG &amp; AN TOÀN BẾP</span>
            <span class="zero-badge">Zero-Tolerance</span>
          </div>
          
          <!-- Tầng 1: Liệt kê chất có trong món -->
          <div class="allergy-tier-1">
            <span class="tier-label">Chất gây dị ứng có trong món:</span>
            <div class="allergen-tags">
              <span v-for="tag in allergenList" :key="tag.label" class="allergen-tag" :class="tag.type">
                {{ tag.icon }} {{ tag.label }}
              </span>
              <span v-if="!allergenList.length" class="safe-tag">
                ✓ Không chứa chất gây dị ứng phổ biến
              </span>
            </div>
          </div>

          <!-- Tầng 2: Ghi chú quy chuẩn nhà máy Đắk Lắk -->
          <p class="allergy-tier-2">
            ℹ️ <b>Ghi chú sơ chế:</b> Nguyên liệu được phân luồng vô trùng và sơ chế tách riêng tại xưởng Đắk Lắk có xử lý hải sản, đậu phộng, mè và đậu nành. Đóng khay hút chân không kèm dán nhãn phân loại màu.
          </p>
        </div>

        <!-- 5. Lưới Nguyên liệu 2 cột (Khẩu phần cho X người) -->
        <div class="info-section">
          <div class="section-header-row">
            <h3 class="section-title">⚖️ Thành phần &amp; Định lượng tịnh</h3>
            <span class="portion-badge">Khẩu phần cho <b>{{ householdSize }} người</b></span>
          </div>

          <div class="ingredients-grid">
            <div v-for="(b, idx) in bomItems" :key="idx" class="ing-card">
              <div class="ing-top">
                <span class="ing-name">{{ b.name }}</span>
                <b class="ing-grams num">{{ b.totalGrams }}g</b>
              </div>
              <small class="ing-spec">{{ b.spec }}</small>
            </div>

            <!-- Gói xốt đặc biệt đi kèm -->
            <div class="ing-card sauce-card">
              <div class="ing-top">
                <span class="ing-name">🍶 {{ sauceInfo.name }}</span>
                <b class="ing-grams num">{{ sauceInfo.grams }}g</b>
              </div>
              <small class="ing-spec">{{ sauceInfo.desc }}</small>
            </div>
          </div>
        </div>

        <!-- 6. Tách riêng 2 mục thực tế cho người nấu -->
        <div class="two-columns-cook-prep">
          <!-- Cột 1: Gia vị bếp cơ bản (không kèm trong hộp) -->
          <div class="prep-card">
            <div class="prep-header">
              <span class="p-icon">🧂</span>
              <div>
                <b>Gia vị bếp cơ bản</b>
                <small class="prep-sub">Không kèm trong hộp</small>
              </div>
            </div>
            <ul class="prep-list">
              <li><b>1–2 muỗng dầu ăn</b> (đảo áp chảo)</li>
              <li><b>Muối / Nước mắm cơ bản</b></li>
              <li><b>Nửa chén nước lọc</b> (kho / om xốt)</li>
            </ul>
            <p class="prep-note">
              <i>*Mọi căn bếp Việt đều có sẵn gia vị này; nhà máy không đóng gói để tránh lãng phí và rách vỡ bao bì.</i>
            </p>
          </div>

          <!-- Cột 2: Dụng cụ cần dùng -->
          <div class="prep-card">
            <div class="prep-header">
              <span class="p-icon">🍳</span>
              <div>
                <b>Dụng cụ cần dùng</b>
                <small class="prep-sub">Chỉ 15 phút — 1 chảo</small>
              </div>
            </div>
            <ul class="prep-list">
              <li><b>1 chảo chống dính sâu lòng</b> (hoặc chảo gang)</li>
              <li><b>1 nồi nấu canh nhỏ</b> (với mâm cơm có canh)</li>
              <li><b>Kéo cắt túi nguyên liệu</b> chân không</li>
            </ul>
            <p class="prep-note">
              <i>*Không cần dao thớt cồng kềnh, mọi nguyên liệu đã rửa sạch và cắt khúc sẵn.</i>
            </p>
          </div>
        </div>

        <!-- 7. Bảng giá trị dinh dưỡng đầy đủ -->
        <div class="info-section">
          <h3 class="section-title">🥗 Giá trị dinh dưỡng (1 khẩu phần chuẩn)</h3>
          <div class="full-nutri-table">
            <div class="nutri-box">
              <span class="n-val num">{{ nutrition.calories }}</span>
              <span class="n-unit">kcal</span>
              <span class="n-lbl">Calo</span>
            </div>
            <div class="nutri-box">
              <span class="n-val num">{{ nutrition.protein_g }}</span>
              <span class="n-unit">g</span>
              <span class="n-lbl">Chất đạm</span>
            </div>
            <div class="nutri-box">
              <span class="n-val num">{{ nutrition.carbs_g }}</span>
              <span class="n-unit">g</span>
              <span class="n-lbl">Tinh bột</span>
            </div>
            <div class="nutri-box">
              <span class="n-val num">{{ nutrition.fat_g }}</span>
              <span class="n-unit">g</span>
              <span class="n-lbl">Chất béo</span>
            </div>
            <div class="nutri-box">
              <span class="n-val num">{{ nutrition.fiber_g }}</span>
              <span class="n-unit">g</span>
              <span class="n-lbl">Chất xơ</span>
            </div>
          </div>
        </div>

        <!-- 8. 3 bước nấu nhanh dạng thẻ đánh số rõ ràng -->
        <div class="info-section">
          <h3 class="section-title">⏱️ 3 bước nấu nhanh (15 phút — 1 chảo)</h3>
          <div class="cooking-steps-stack">
            <div v-for="(st, idx) in formattedSteps" :key="idx" class="step-card-item">
              <div class="step-number-pill">Bước {{ idx + 1 }}</div>
              <div class="step-text-wrap">
                <b class="step-time-badge">{{ st.time }}</b>
                <p class="step-action-desc">{{ st.action }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Modal -->
      <div v-if="showSelect" class="dish-modal-footer">
        <button
          type="button"
          class="pl-btn primary select-this-dish-btn"
          :disabled="isCurrent"
          @click="$emit('select', dish)"
        >
          {{ isCurrent ? '✓ Món hiện tại trong thực đơn' : 'Chọn đổi sang món này' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { SKUS, SAUCES } from '../../shared/data/catalog';
import { recipeFor } from '../../shared/data/recipes';

const props = defineProps({
  dish: { type: Object, required: true },
  householdSize: { type: Number, default: 2 },
  showSelect: { type: Boolean, default: false },
  isCurrent: { type: Boolean, default: false }
});

defineEmits(['close', 'select']);

const copied = ref(false);

function shareDish() {
  const url = window.location.origin + `/menus?dish=${props.dish?.id || ''}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      copied.value = true;
      setTimeout(() => (copied.value = false), 2500);
    });
  }
}

function getDishEmoji(d) {
  if (!d) return '🍲';
  if (d.kind === 'protein') {
    if (d.tags?.includes('beef')) return '🥩';
    if (d.tags?.includes('pork')) return '🥓';
    if (d.tags?.includes('seafood')) return '🦐';
    return '🍗';
  }
  if (d.kind === 'veg') return '🥬';
  if (d.kind === 'soup') return '🍲';
  if (d.kind === 'carb') return '🍚';
  if (d.kind === 'dessert') return '🍇';
  return '🍽️';
}

function getKindBadge(kind) {
  switch (kind) {
    case 'protein': return 'Đạm tươi sạch';
    case 'veg': return 'Rau xanh hữu cơ';
    case 'soup': return 'Canh ngọt ấm';
    case 'carb': return 'Tinh bột lành mạnh';
    case 'dessert': return 'Tráng miệng IQF';
    default: return 'Món ngon MOVA';
  }
}

const nutrition = computed(() => {
  const n = props.dish?.nutrition_per_serving || props.dish?.nutrition || {};
  return {
    calories: n.calories || n.kcal || 380,
    protein_g: n.protein_g || n.protein || 22,
    carbs_g: n.carbs_g || n.carb || 28,
    fat_g: n.fat_g || n.fat || 14,
    fiber_g: n.fiber_g || (props.dish?.kind === 'veg' ? 5 : props.dish?.kind === 'dessert' ? 4 : 2)
  };
});

const allergenList = computed(() => {
  const tags = props.dish?.tags || [];
  const list = [];
  if (tags.includes('seafood')) list.push({ label: 'Hải sản / Tôm cá', icon: '🦐', type: 'danger' });
  if (tags.includes('beef')) list.push({ label: 'Thịt bò', icon: '🥩', type: 'warn' });
  if (tags.includes('pork')) list.push({ label: 'Thịt heo', icon: '🥓', type: 'warn' });
  if (tags.includes('spicy')) list.push({ label: 'Ớt cay', icon: '🌶️', type: 'warn' });
  if (tags.includes('gluten')) list.push({ label: 'Gluten / Bột mì', icon: '🌾', type: 'danger' });
  if (tags.includes('lactose')) list.push({ label: 'Lactose / Sữa', icon: '🥛', type: 'danger' });
  return list;
});

const bomItems = computed(() => {
  const bom = props.dish?.bom || [];
  const size = props.householdSize || 2;
  return bom.map((b) => {
    const sku = SKUS[b.sku];
    const totalGrams = (b.gramsPerPerson || 100) * size;
    return {
      sku: b.sku,
      name: sku?.name || b.sku,
      totalGrams,
      spec: props.dish?.portion_specs?.size_detail || props.dish?.spec || 'Sơ chế sạch đóng khay chân không'
    };
  });
});

const sauceInfo = computed(() => {
  const sId = props.dish?.sauce;
  if (sId && SAUCES[sId]) {
    return {
      name: `Gói xốt MOVA đặc biệt (${SAUCES[sId].name})`,
      grams: SAUCES[sId].grams || 70,
      desc: 'Công thức độc quyền của Đầu bếp MOVA, định lượng chính xác từng gram giúp nấu nhanh không cần nêm nếm.'
    };
  }
  if (props.dish?.kind === 'dessert') {
    return {
      name: 'Trái cây đặc sản cấp đông nhanh IQF',
      grams: (props.householdSize || 2) * 80,
      desc: 'Công nghệ cấp đông nhanh IQF giữ trọn 95% vitamin, quay lò vi sóng 1 phút ăn liền thanh mát.'
    };
  }
  return {
    name: 'Gói xốt xào / ướp MOVA',
    grams: 60,
    desc: 'Định lượng vừa vặn cho cả gia đình, chỉ cần đảo cùng chảo nóng.'
  };
});

const formattedSteps = computed(() => {
  const r = recipeFor(props.dish?.id);
  const rawSteps = r?.steps || props.dish?.cooking_steps || [];
  if (rawSteps.length >= 3) {
    return rawSteps.map((st) => {
      const matchTime = st.match(/\(([^)]+)\)/);
      const time = matchTime ? matchTime[1] : '3–5 phút';
      const action = st.replace(/\([^)]+\):?/, '').replace(/^Bước \d+:?/, '').trim();
      return { time, action: action || st };
    });
  }
  return [
    { time: '3 phút', action: 'Làm nóng chảo với 1 muỗng dầu ăn, cho nguyên liệu tươi đã để ráo vào áp chảo xém vàng đều hai mặt.' },
    { time: '9 phút', action: 'Rưới Gói xốt MOVA đặc biệt kèm nửa chén nước lọc, đậy nắp đun lửa vừa để xốt ngấm sâu vào từng thớ thịt/rau củ.' },
    { time: '3 phút', action: 'Mở nắp, đảo đều tay trên lửa lớn đến khi xốt sánh bóng thơm lừng rồi tắt bếp và dọn ra đĩa.' }
  ];
});
</script>

<style scoped>
.dish-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(5px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
}

.dish-modal-box {
  background: var(--white);
  border-radius: 24px;
  max-width: 680px;
  width: 100%;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(16, 24, 40, 0.3);
}

.mclose {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 20;
  background: rgba(15, 23, 42, 0.6);
  color: var(--white);
  border: 1px solid rgba(255, 255, 255, 0.3);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 22px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.mclose:hover {
  background: rgba(15, 23, 42, 0.85);
  transform: scale(1.08);
}

/* 1. Hero banner */
.dish-hero-banner {
  position: relative;
  height: 220px;
  background: var(--green-d);
  color: var(--white);
  display: flex;
  align-items: flex-end;
  padding: 20px;
  overflow: hidden;
  flex-shrink: 0;
}
.dish-hero-banner.theme-protein {
  background: linear-gradient(135deg, var(--green-d) 0%, var(--green-dd) 60%, var(--ink) 100%);
}
.dish-hero-banner.theme-veg {
  background: linear-gradient(135deg, var(--green-d) 0%, var(--green-d) 60%, var(--green-dd) 100%);
}
.dish-hero-banner.theme-soup {
  background: linear-gradient(135deg, var(--blue) 0%, var(--blue-ink) 60%, var(--blue-ink) 100%);
}
.dish-hero-banner.theme-carb {
  background: linear-gradient(135deg, var(--amber-ink) 0%, var(--amber-ink) 60%, var(--amber-ink) 100%);
}
.dish-hero-banner.theme-dessert {
  background: linear-gradient(135deg, var(--violet) 0%, var(--violet) 60%, var(--violet) 100%);
}

.hero-bg-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%);
  z-index: 2;
  pointer-events: none;
}
.hero-media {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hero-fallback-icon {
  font-size: 90px;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.4));
  opacity: 0.9;
}

.hero-content-overlay {
  position: relative;
  z-index: 3;
  width: 100%;
  display: grid;
  gap: 6px;
}
.hero-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.terroir-pill {
  font-size: 11.5px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(4px);
  color: var(--white);
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.kind-pill {
  font-size: 11.5px;
  font-weight: 700;
  background: var(--red-orange-d);
  color: var(--white);
  padding: 3px 9px;
  border-radius: 999px;
}
.share-btn {
  margin-left: auto;
  margin-right: 40px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: var(--white);
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.share-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}
.hero-dish-title {
  font-size: 21px;
  font-weight: 800;
  margin: 0;
  line-height: 1.3;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

/* 2. Thân Modal */
.dish-modal-body {
  padding: 18px 24px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--white);
}

/* Quick stats strip */
.quick-stats-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 14px;
}
@media (max-width: 540px) {
  .quick-stats-strip {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}
.stat-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.stat-icon {
  font-size: 20px;
}
.stat-texts {
  display: grid;
}
.stat-lbl {
  font-size: 11px;
  color: var(--muted);
}
.stat-val {
  font-size: 13.5px;
  color: var(--ink);
  font-weight: 800;
}

/* Sections */
.info-section {
  display: grid;
  gap: 10px;
}
.section-badge {
  font-size: 11px;
  font-weight: 800;
  color: var(--green-d);
  letter-spacing: 0.05em;
}
.section-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
}
.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.portion-badge {
  font-size: 12px;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 3px 8px;
  border-radius: 6px;
}

/* Terroir box */
.terroir-box {
  background: var(--green-tint);
  border: 1px solid var(--green-line);
  border-radius: 14px;
  padding: 14px;
}
.terroir-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink);
  margin: 0;
}
.chef-note-box {
  display: flex;
  gap: 10px;
  background: var(--white);
  border-left: 3px solid var(--green);
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 4px;
}
.chef-avatar {
  font-size: 20px;
  flex-shrink: 0;
}
.chef-note-box b {
  font-size: 12.5px;
  color: var(--green-d);
  display: block;
  margin-bottom: 2px;
}
.chef-note-box p {
  font-size: 12.5px;
  color: var(--ink-2);
  margin: 0;
  line-height: 1.4;
  font-style: italic;
}

/* Allergy box */
.allergy-box {
  background: var(--amber-soft);
  border: 1px solid var(--amber-line);
  border-radius: 14px;
  padding: 14px;
}
.allergy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.allergy-title-badge {
  font-size: 11px;
  font-weight: 800;
  color: var(--amber-ink);
  letter-spacing: 0.05em;
}
.zero-badge {
  font-size: 11px;
  font-weight: 800;
  background: var(--red);
  color: var(--white);
  padding: 2px 7px;
  border-radius: 6px;
}
.allergy-tier-1 {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tier-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--amber-ink);
}
.allergen-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.allergen-tag {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}
.allergen-tag.danger {
  background: var(--red-soft);
  color: var(--red);
}
.allergen-tag.warn {
  background: var(--amber-soft);
  color: var(--amber-ink);
}
.safe-tag {
  font-size: 12px;
  font-weight: 700;
  background: var(--green-soft);
  color: var(--green-d);
  padding: 3px 8px;
  border-radius: 6px;
}
.allergy-tier-2 {
  font-size: 12px;
  color: var(--amber-ink);
  line-height: 1.45;
  margin: 0;
  padding-top: 6px;
  border-top: 1px dashed var(--amber-line);
}

/* Ingredients Grid */
.ingredients-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 540px) {
  .ingredients-grid {
    grid-template-columns: 1fr;
  }
}
.ing-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  gap: 2px;
}
.ing-card.sauce-card {
  background: var(--orange-soft);
  border-color: var(--red-line);
}
.ing-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.ing-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
}
.ing-grams {
  font-size: 14px;
  color: var(--green-d);
}
.sauce-card .ing-grams {
  color: var(--orange-ink);
}
.ing-spec {
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.35;
}

/* Two columns cook prep */
.two-columns-cook-prep {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 540px) {
  .two-columns-cook-prep {
    grid-template-columns: 1fr;
  }
}
.prep-card {
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
  display: grid;
  gap: 8px;
}
.prep-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.p-icon {
  font-size: 20px;
}
.prep-header b {
  font-size: 13.5px;
  color: var(--ink);
  display: block;
}
.prep-sub {
  font-size: 11px;
  color: var(--muted);
}
.prep-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 3px;
  font-size: 12.5px;
  color: var(--ink);
}
.prep-note {
  font-size: 11px;
  color: var(--muted);
  margin: 0;
  line-height: 1.35;
}

/* Full nutrition table */
.full-nutri-table {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  background: var(--butter);
  border-radius: 14px;
  padding: 12px 10px;
  text-align: center;
}
@media (max-width: 480px) {
  .full-nutri-table {
    grid-template-columns: repeat(3, 1fr);
  }
}
.nutri-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.n-val {
  font-size: 18px;
  font-weight: 800;
  color: var(--ink);
  line-height: 1;
}
.n-unit {
  font-size: 10px;
  color: var(--muted);
  margin: 1px 0 2px;
}
.n-lbl {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--green-d);
}

/* Cooking steps */
.cooking-steps-stack {
  display: grid;
  gap: 8px;
}
.step-card-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 14px;
}
.step-number-pill {
  background: var(--green-soft);
  color: var(--green-d);
  font-size: 12px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 1px;
}
.step-text-wrap {
  display: grid;
  gap: 2px;
}
.step-time-badge {
  font-size: 12px;
  color: var(--orange-ink);
}
.step-action-desc {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.45;
  margin: 0;
}

/* Modal Footer */
.dish-modal-footer {
  padding: 14px 24px;
  border-top: 1px solid var(--line-2);
  background: var(--cream);
  display: flex;
  justify-content: flex-end;
}
.select-this-dish-btn {
  min-height: 44px;
  padding: 8px 20px;
  font-weight: 700;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 640px) {
  .dish-modal-overlay {
    align-items: flex-end;
    padding: 0;
  }
  .dish-modal-box {
    border-radius: 22px 22px 0 0;
    max-height: 92svh;
  }
  .dish-hero-banner {
    height: 185px;
    padding: 16px;
  }
}
</style>
